/**
 * DEAD CODE — BrowserRouter is not mounted in App.tsx. This page is never rendered.
 * Do NOT delete yet — reserved for Phase 2+ when React Router is wired up.
 *
 * @file pages/Settings.tsx
 * @description Application settings page.
 *   Currently covers AI provider configuration and Ollama model selection.
 *   All AI settings are read-only in the UI — they are set via env variables
 *   on the backend. This page shows what is currently active.
 *
 * @module @polaris/frontend/pages
 *
 * @dependencies
 * - hooks/useAiConfig
 *
 * @relatedFiles
 * - src/hooks/useAiConfig.ts
 * - apps/backend/src/ai/providers/
 */

import { Settings as SettingsIcon, Cpu, RefreshCw, CheckCircle } from 'lucide-react';
import { useAiConfig, useOllamaModels } from '../hooks/useAiConfig';
import { Skeleton } from '../components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Provider badge colours
// ---------------------------------------------------------------------------

const PROVIDER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  mock:   { bg: 'bg-gray-500/15',   text: 'text-gray-400',   label: 'Mock (offline)' },
  openai: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'OpenAI GPT-4o-mini' },
  ollama: { bg: 'bg-indigo-500/15',  text: 'text-indigo-400',  label: 'Ollama (local)' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Settings() {
  const { data: aiConfig, isLoading: configLoading, refetch: refetchConfig } = useAiConfig();
  const isOllama = aiConfig?.provider === 'ollama';
  const { data: ollamaModels = [], isLoading: modelsLoading, refetch: refetchModels } = useOllamaModels(isOllama);

  const providerStyle = PROVIDER_STYLES[aiConfig?.provider ?? 'mock'] ?? PROVIDER_STYLES['mock'];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* ── AI Configuration ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">AI Provider</h2>
          <button
            onClick={() => void refetchConfig()}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
            aria-label="Refresh config"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="glass px-5 py-4 space-y-4">
          {/* Active provider */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Active Provider</p>
                <p className="text-xs text-gray-500 mt-0.5">Set via <code className="text-indigo-400">AI_PROVIDER</code> env variable</p>
              </div>
            </div>
            {configLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${providerStyle?.bg} ${providerStyle?.text}`}>
                {providerStyle?.label}
              </span>
            )}
          </div>

          {/* Ollama model (only shown when provider=ollama) */}
          {isOllama && (
            <div className="border-t border-gray-800/50 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Active Model</p>
                  <p className="text-xs text-gray-500 mt-0.5">Set via <code className="text-indigo-400">OLLAMA_MODEL</code> env variable</p>
                </div>
                {configLoading ? (
                  <Skeleton className="h-6 w-32" />
                ) : (
                  <span className="font-mono text-sm text-indigo-300">{aiConfig?.ollamaModel ?? '—'}</span>
                )}
              </div>

              {/* Available models list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Available local models</p>
                  <button
                    onClick={() => void refetchModels()}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {modelsLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : ollamaModels.length === 0 ? (
                  <p className="text-xs text-gray-600 py-3 text-center">
                    No models found — is Ollama running at <span className="text-gray-500">{aiConfig?.ollamaUrl}</span>?
                  </p>
                ) : (
                  <div className="space-y-1">
                    {ollamaModels.map((model) => {
                      const isActive = model === aiConfig?.ollamaModel;
                      return (
                        <div
                          key={model}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                            isActive
                              ? 'bg-indigo-500/10 border border-indigo-500/20'
                              : 'bg-gray-800/30 border border-transparent'
                          }`}
                        >
                          <CheckCircle className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-700'}`} />
                          <span className={`font-mono flex-1 ${isActive ? 'text-indigo-300' : 'text-gray-400'}`}>
                            {model}
                          </span>
                          {isActive && (
                            <span className="text-xs text-indigo-500">active</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-gray-600 mt-3">
                  To switch models, update <code className="text-gray-500">OLLAMA_MODEL</code> in your backend <code className="text-gray-500">.env</code> and restart.
                </p>
              </div>
            </div>
          )}

          {/* Mock provider explanation */}
          {aiConfig?.provider === 'mock' && !configLoading && (
            <div className="border-t border-gray-800/50 pt-3">
              <p className="text-xs text-gray-500">
                Mock provider returns rule-based suggestions. To enable real AI, set <code className="text-indigo-400">AI_PROVIDER=ollama</code> (local) or <code className="text-indigo-400">AI_PROVIDER=openai</code> + <code className="text-indigo-400">OPENAI_API_KEY</code>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── About ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">About</h2>
        <div className="glass px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Polaris</span>
            <span className="text-sm text-gray-600">v1.0 · MVP</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Personal activity tracker with AI coaching potential.
          </p>
        </div>
      </section>

    </div>
  );
}
