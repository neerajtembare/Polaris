/**
 * @file components/Settings.tsx
 * @description Settings screen — displays active AI provider and configuration.
 *   Ollama model can be switched at runtime via POST /api/ai/config (no restart needed).
 *   Wired to useAiConfig, useOllamaModels, and useSetAiModel hooks.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useAiConfig
 * - components/ui/ReactiveCard
 *
 * @relatedFiles
 * - hooks/useAiConfig.ts
 * - components/Layout.tsx
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Server,
  Save,
  Sun,
  Moon,
  Music2,
  Volume2,
  VolumeX,
  Sliders,
  FlaskConical,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactiveCard from '../ui/ReactiveCard';
import { useAiConfig, useOllamaModels, useSetAiModel } from '@/hooks/useAiConfig';
import { useAiParse } from '@/hooks/useAiParse';
import { useAudioPlayer, PRESET_STREAMS } from '@/stores/audioPlayer.store';
import type { Theme, ScreenId } from '@/types/navigation';

interface SettingsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  onToggleTheme: () => void;
}

type ProviderKey = 'mock' | 'openai' | 'ollama' | 'gemini';

interface ProviderInfo {
  key: ProviderKey;
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
}

const PROVIDERS: ProviderInfo[] = [
  {
    key: 'gemini',
    label: 'Gemini (Google)',
    description: 'Primary cloud provider. Fast, function calling, streaming. Requires GEMINI_API_KEY in your backend .env file.',
    Icon: Globe,
  },
  {
    key: 'mock',
    label: 'Mock (Built-in)',
    description: 'Rule-based activity parsing — no API key required. Always available as fallback.',
    Icon: Bot,
  },
  {
    key: 'openai',
    label: 'OpenAI (GPT-4o mini)',
    description: 'Cloud AI via OpenAI API. Requires OPENAI_API_KEY in your backend .env file.',
    Icon: Globe,
  },
  {
    key: 'ollama',
    label: 'Ollama (Local LLM)',
    description: 'Run locally on your machine. No data leaves your system. High latency (72-278s) — offline fallback only.',
    Icon: Server,
  },
];

/** Hard-coded Gemini model options (free tier) */
const GEMINI_MODELS = [
  { id: 'gemma-4-26b-a4b-it',             label: 'Gemma 4 26b',          rpdLabel: '1,500 RPD' },
  { id: 'gemini-2.5-flash',               label: 'Gemini 2.5 Flash',     rpdLabel: '20 RPD' },
  { id: 'gemini-3-flash-preview',         label: 'Gemini 3 Flash',       rpdLabel: '20 RPD' },
  { id: 'gemini-3.1-flash-lite-preview',  label: 'Gemini 3.1 Flash Lite', rpdLabel: '500 RPD' },
];

export default function Settings({ theme, onNavigate: _onNavigate, onToggleTheme }: SettingsProps) {
  const isDark = theme === 'dark';

  const { data: aiConfig, isLoading: configLoading, refetch: refetchConfig } = useAiConfig();
  const { data: ollamaModels, isLoading: modelsLoading } = useOllamaModels(
    aiConfig?.provider === 'ollama'
  );
  const setAiModel = useSetAiModel();

  const activeProvider = (aiConfig?.provider ?? 'mock') as ProviderKey;

  // Custom model input state (Ollama: custom name; Gemini: handled via chips)
  const [customModel, setCustomModel] = useState('');
  const displayModel = aiConfig?.model ?? '';
  const pendingModel = customModel.trim();
  const hasUnsaved  = pendingModel.length > 0 && pendingModel !== displayModel;

  // Test AI state
  type TestResult = { ok: true; model: string; confidence: number } | { ok: false; error: string };
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const { aiParse } = useAiParse();

  async function handleTestAi() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await aiParse('read 30 pages', 0); // force AI call (confidence=0)
      if (result) {
        setTestResult({ ok: true, model: result.provider ?? 'mock', confidence: result.confidence });
      } else {
        setTestResult({ ok: false, error: 'No response from AI (using mock fallback)' });
      }
    } catch (e) {
      setTestResult({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setIsTesting(false);
    }
  }

  // Audio player state
  const { volume, setVolume, currentStream, selectStream } = useAudioPlayer();

  // NLP threshold (0–1), persisted in localStorage
  const AI_THRESHOLD_KEY = 'polaris:ai-threshold';
  const [nlpThreshold, setNlpThreshold] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(AI_THRESHOLD_KEY);
      const n = raw !== null ? parseFloat(raw) : NaN;
      return isNaN(n) ? 0.85 : Math.max(0, Math.min(1, n));
    } catch { return 0.85; }
  });

  function saveNlpThreshold(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    setNlpThreshold(clamped);
    try { localStorage.setItem(AI_THRESHOLD_KEY, String(clamped)); } catch { /* noop */ }
  }

  const handleSelectModel = (model: string) => {
    if (model === displayModel) return;
    void setAiModel.mutateAsync(model).then(() => setCustomModel(''));
  };

  const handleSaveCustomModel = () => {
    if (!hasUnsaved) return;
    void setAiModel.mutateAsync(pendingModel).then(() => setCustomModel(''));
  };

  return (
    <div className="px-4 md:px-12 max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <header className="space-y-2">
        <h1
          className={cn(
            'text-[2.5rem] md:text-[4rem] font-black leading-[0.9] tracking-tighter',
            isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
          )}
        >
          Settings
        </h1>
        <p
          className={cn(
            'text-base font-medium opacity-70',
            isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
          )}
        >
          Configure your Polaris experience. AI provider is set in your backend environment file.
        </p>
      </header>

      {/* AI Provider Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className={cn(
              'text-[10px] font-black uppercase tracking-[0.3em]',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            AI Provider
          </h2>
          <button
            onClick={() => refetchConfig()}
            disabled={configLoading}
            className={cn(
              'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all',
              isDark
                ? 'text-dark-on-surface-variant hover:bg-white/5'
                : 'text-on-surface-variant hover:bg-black/5'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', configLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {configLoading ? (
          <div className="flex items-center gap-3 py-8">
            <Loader2
              className={cn('w-6 h-6 animate-spin', isDark ? 'text-dark-primary' : 'text-primary')}
            />
            <span
              className={cn('text-sm', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}
            >
              Loading configuration…
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((provider, i) => {
              const isActive = activeProvider === provider.key;
              return (
                <motion.div
                  key={provider.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <ReactiveCard
                    isDark={isDark}
                    className={cn(
                      'border transition-all',
                      isActive
                        ? isDark
                          ? 'border-dark-primary/40 ring-1 ring-dark-primary/20'
                          : 'border-primary/30 ring-1 ring-primary/10'
                        : isDark
                        ? 'border-white/5'
                        : 'border-outline-variant/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border',
                            isActive
                              ? isDark
                                ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                                : 'bg-primary/10 text-primary border-primary/20'
                              : isDark
                              ? 'bg-white/5 text-dark-on-surface-variant border-white/10'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20'
                          )}
                        >
                          <provider.Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3
                              className={cn(
                                'font-bold text-sm',
                                isDark ? 'text-dark-on-surface' : 'text-on-surface'
                              )}
                            >
                              {provider.label}
                            </h3>
                            {isActive && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                                  isDark
                                    ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                )}
                              >
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                            {/* Status badge — shown only on active provider card */}
                            {isActive && aiConfig?.status && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border',
                                  aiConfig.status === 'connected'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : aiConfig.status === 'slow'
                                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    : aiConfig.status === 'error'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-white/5 text-gray-400 border-white/10'
                                )}
                              >
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  aiConfig.status === 'connected' ? 'bg-emerald-400' :
                                  aiConfig.status === 'slow'      ? 'bg-yellow-400' :
                                  aiConfig.status === 'error'     ? 'bg-red-400' : 'bg-gray-400'
                                )} />
                                {aiConfig.status === 'connected'
                                  ? `Connected${aiConfig.latencyMs != null ? ` (${aiConfig.latencyMs}ms)` : ''}`
                                  : aiConfig.status === 'slow'
                                  ? `Slow (${aiConfig.latencyMs ?? '?'}ms)`
                                  : aiConfig.status === 'error'
                                  ? 'Error'
                                  : 'Unknown'}
                              </span>
                            )}
                          </div>
                          <p
                            className={cn(
                              'text-xs mt-1 leading-relaxed opacity-70',
                              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                            )}
                          >
                            {provider.description}
                          </p>

                          {/* Active model label (all providers) */}
                          {isActive && displayModel && (
                            <p className={cn('text-xs font-mono mt-2', isDark ? 'text-dark-primary' : 'text-primary')}>
                              Model: {displayModel}
                            </p>
                          )}

                          {/* Gemini model chips */}
                          {isActive && provider.key === 'gemini' && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {GEMINI_MODELS.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => handleSelectModel(m.id)}
                                  disabled={setAiModel.isPending}
                                  title={`${m.rpdLabel} free tier`}
                                  className={cn(
                                    'px-2 py-0.5 rounded text-[10px] font-mono border transition-all',
                                    m.id === displayModel
                                      ? isDark
                                        ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                                        : 'bg-primary/10 text-primary border-primary/20'
                                      : isDark
                                      ? 'bg-white/5 text-dark-on-surface-variant border-white/10 hover:bg-white/10 hover:text-dark-on-surface cursor-pointer'
                                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:bg-surface-container cursor-pointer'
                                  )}
                                >
                                  {m.label}
                                  <span className="opacity-50 ml-1 text-[9px]">{m.rpdLabel}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Ollama model selector */}
                          {isActive && provider.key === 'ollama' && (
                            <div className="mt-3 space-y-3">
                              {/* Installed model chips — click to switch */}
                              {modelsLoading ? (
                                <p className="text-xs opacity-40">Loading installed models…</p>
                              ) : ollamaModels && ollamaModels.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {ollamaModels.map((m) => (
                                    <button
                                      key={m}
                                      onClick={() => handleSelectModel(m)}
                                      disabled={setAiModel.isPending}
                                      className={cn(
                                        'px-2 py-0.5 rounded text-[10px] font-mono border transition-all',
                                        m === displayModel
                                          ? isDark
                                            ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                                            : 'bg-primary/10 text-primary border-primary/20'
                                          : isDark
                                          ? 'bg-white/5 text-dark-on-surface-variant border-white/10 hover:bg-white/10 hover:text-dark-on-surface cursor-pointer'
                                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10 hover:bg-surface-container cursor-pointer'
                                      )}
                                    >
                                      {setAiModel.isPending && pendingModel === m ? (
                                        <Loader2 className="inline w-3 h-3 animate-spin" />
                                      ) : null}
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {/* Custom model name input */}
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={customModel}
                                  onChange={(e) => setCustomModel(e.target.value)}
                                  placeholder="or type a model name…"
                                  className={cn(
                                    'flex-1 text-xs font-mono rounded-lg px-3 py-1.5 border bg-transparent outline-none',
                                    isDark
                                      ? 'border-white/10 text-dark-on-surface placeholder-white/20 focus:border-dark-primary/50'
                                      : 'border-outline-variant/20 text-on-surface placeholder-on-surface-variant/40 focus:border-primary/40'
                                  )}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveCustomModel();
                                  }}
                                />
                                {hasUnsaved && (
                                  <button
                                    onClick={handleSaveCustomModel}
                                    disabled={setAiModel.isPending}
                                    className={cn(
                                      'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                                      isDark
                                        ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30'
                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    )}
                                  >
                                    {setAiModel.isPending
                                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      : <Save className="w-3.5 h-3.5" />}
                                    Apply
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ReactiveCard>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Test AI button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => { void handleTestAi(); }}
            disabled={isTesting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all',
              isDark
                ? 'bg-dark-primary/15 border-dark-primary/30 text-dark-primary hover:bg-dark-primary/25 disabled:opacity-40'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 disabled:opacity-40'
            )}
          >
            {isTesting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <FlaskConical className="w-3.5 h-3.5" />}
            Test AI
          </button>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              {testResult.ok ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className={cn('text-xs font-mono', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    {testResult.model} · confidence {Math.round(testResult.confidence * 100)}%
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-400 font-mono">{testResult.error}</span>
                </>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="space-y-4">
        <h2 className={cn('text-[10px] font-black uppercase tracking-[0.3em]', isDark ? 'text-dark-primary' : 'text-primary')}>
          Appearance
        </h2>
        <ReactiveCard isDark={isDark}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', isDark ? 'bg-white/5 border-white/10 text-dark-on-surface-variant' : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant')}>
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className={cn('text-sm font-semibold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                  {isDark ? 'Dark mode' : 'Light mode'}
                </p>
                <p className={cn('text-xs opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  Switch between the cosmic dark theme and clean light mode.
                </p>
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className={cn(
                'relative flex items-center shrink-0 w-12 h-6 rounded-full border transition-all duration-300',
                isDark
                  ? 'bg-dark-primary/30 border-dark-primary/40'
                  : 'bg-outline-variant/30 border-outline-variant/40'
              )}
              aria-label="Toggle theme"
            >
              <span
                className={cn(
                  'absolute w-5 h-5 rounded-full shadow transition-all duration-300',
                  isDark
                    ? 'translate-x-6 bg-dark-primary'
                    : 'translate-x-0.5 bg-on-surface-variant/60'
                )}
              />
            </button>
          </div>
        </ReactiveCard>
      </section>

      {/* ── Audio Preferences ── */}
      <section className="space-y-4">
        <h2 className={cn('text-[10px] font-black uppercase tracking-[0.3em]', isDark ? 'text-dark-primary' : 'text-primary')}>
          Audio Preferences
        </h2>
        <ReactiveCard isDark={isDark}>
          <div className="space-y-5">
            {/* Volume slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {volume === 0
                    ? <VolumeX className={cn('w-4 h-4', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')} />
                    : <Volume2 className={cn('w-4 h-4', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')} />
                  }
                  <span className={cn('text-sm font-semibold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                    Focus Volume
                  </span>
                </div>
                <span className={cn('text-xs font-mono font-bold tabular-nums', isDark ? 'text-dark-primary' : 'text-primary')}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-current h-1.5 rounded-full cursor-pointer"
              />
            </div>

            {/* Stream presets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Music2 className={cn('w-4 h-4', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')} />
                <span className={cn('text-sm font-semibold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                  Default Focus Stream
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_STREAMS.map((stream) => {
                  const isSelected = currentStream?.id === stream.id;
                  return (
                    <button
                      key={stream.id}
                      onClick={() => selectStream(isSelected ? null : stream)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                        isSelected
                          ? isDark
                            ? 'bg-dark-primary/20 border-dark-primary/40 text-dark-primary'
                            : 'bg-primary/10 border-primary/30 text-primary'
                          : isDark
                          ? 'bg-white/3 border-white/8 text-dark-on-surface-variant hover:bg-white/8'
                          : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant hover:bg-surface-container'
                      )}
                    >
                      <span className="text-lg leading-none">{stream.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{stream.label}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => selectStream(null)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all',
                    currentStream === null
                      ? isDark
                        ? 'bg-dark-primary/20 border-dark-primary/40 text-dark-primary'
                        : 'bg-primary/10 border-primary/30 text-primary'
                      : isDark
                      ? 'bg-white/3 border-white/8 text-dark-on-surface-variant hover:bg-white/8'
                      : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant hover:bg-surface-container'
                  )}
                >
                  <span className="text-lg leading-none">🔇</span>
                  <p className="text-xs font-semibold">Silence</p>
                  {currentStream === null && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-auto" />}
                </button>
              </div>
            </div>
          </div>
        </ReactiveCard>
      </section>

      {/* ── AI Behaviour ── */}
      <section className="space-y-4">
        <h2 className={cn('text-[10px] font-black uppercase tracking-[0.3em]', isDark ? 'text-dark-primary' : 'text-primary')}>
          AI Behaviour
        </h2>
        <ReactiveCard isDark={isDark}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className={cn('w-4 h-4', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')} />
              <span className={cn('text-sm font-semibold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                AI Parse Threshold
              </span>
              <span className={cn('ml-auto text-xs font-mono font-bold tabular-nums', isDark ? 'text-dark-primary' : 'text-primary')}>
                {Math.round(nlpThreshold * 100)}%
              </span>
            </div>
            <p className={cn('text-xs leading-relaxed opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
              When the local parser confidence exceeds this value, the AI is skipped to save resources.
              Lower = AI called more often. Higher = AI called less (faster, uses less quota).
            </p>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={nlpThreshold}
              onChange={(e) => saveNlpThreshold(parseFloat(e.target.value))}
              className="w-full accent-current h-1.5 rounded-full cursor-pointer"
            />
            <div className={cn('flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
              <span>Always use AI</span>
              <span>Local only</span>
            </div>
          </div>
        </ReactiveCard>
      </section>

      {/* Info banner */}
      <ReactiveCard isDark={isDark} className="border border-dashed">
        <div className="flex items-start gap-3">
          <Info
            className={cn(
              'w-5 h-5 shrink-0 mt-0.5',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          />
          <div>
            <p
              className={cn(
                'text-sm font-semibold',
                isDark ? 'text-dark-on-surface' : 'text-on-surface'
              )}
            >
              About AI provider configuration
            </p>
            <p
              className={cn(
                'text-xs mt-1 leading-relaxed opacity-70',
                isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
              )}
            >
              Set <code className="font-mono">AI_PROVIDER=openai|ollama|mock</code> in your backend{' '}
              <code className="font-mono">.env</code> file and restart to switch providers.{' '}
              When using Ollama, you can switch models here at runtime without restarting — the
              change takes effect on the next AI request.
            </p>
          </div>
        </div>
      </ReactiveCard>
    </div>
  );
}
