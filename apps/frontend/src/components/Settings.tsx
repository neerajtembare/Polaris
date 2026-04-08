/**
 * @file components/Settings.tsx
 * @description Settings screen — displays active AI provider and configuration.
 *   Read-only for now (runtime switching is a future backend feature).
 *   Wired to useAiConfig and useOllamaModels hooks.
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

import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  Globe,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Info,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactiveCard from './ui/ReactiveCard';
import { useAiConfig, useOllamaModels } from '@/hooks/useAiConfig';
import type { Theme, ScreenId } from '@/types/navigation';

interface SettingsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

type ProviderKey = 'mock' | 'openai' | 'ollama';

interface ProviderInfo {
  key: ProviderKey;
  label: string;
  description: string;
  Icon: React.FC<{ className?: string }>;
}

const PROVIDERS: ProviderInfo[] = [
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
    description: 'Run locally on your machine. No data leaves your system. Requires Ollama installed.',
    Icon: Server,
  },
];

export default function Settings({ theme, onNavigate: _onNavigate }: SettingsProps) {
  const isDark = theme === 'dark';

  const { data: aiConfig, isLoading: configLoading, refetch: refetchConfig } = useAiConfig();
  const { data: ollamaModels, isLoading: modelsLoading } = useOllamaModels(
    aiConfig?.provider === 'ollama'
  );

  const activeProvider = (aiConfig?.provider ?? 'mock') as ProviderKey;

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
                          </div>
                          <p
                            className={cn(
                              'text-xs mt-1 leading-relaxed opacity-70',
                              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                            )}
                          >
                            {provider.description}
                          </p>

                          {/* Ollama model preview */}
                          {isActive && provider.key === 'ollama' && (
                            <div className="mt-3 space-y-2">
                              {aiConfig?.ollamaUrl && (
                                <p
                                  className={cn(
                                    'text-xs font-mono opacity-50',
                                    isDark
                                      ? 'text-dark-on-surface-variant'
                                      : 'text-on-surface-variant'
                                  )}
                                >
                                  Endpoint: {aiConfig.ollamaUrl}
                                </p>
                              )}
                              {aiConfig?.ollamaModel && (
                                <p
                                  className={cn(
                                    'text-xs font-mono',
                                    isDark ? 'text-dark-primary' : 'text-primary'
                                  )}
                                >
                                  Active model: {aiConfig.ollamaModel}
                                </p>
                              )}
                              {modelsLoading ? (
                                <p className="text-xs opacity-40">Loading models…</p>
                              ) : ollamaModels && ollamaModels.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {ollamaModels.map((m) => (
                                    <span
                                      key={m}
                                      className={cn(
                                        'px-2 py-0.5 rounded text-[10px] font-mono border',
                                        m === aiConfig?.ollamaModel
                                          ? isDark
                                            ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                                            : 'bg-primary/10 text-primary border-primary/20'
                                          : isDark
                                          ? 'bg-white/5 text-dark-on-surface-variant border-white/10'
                                          : 'bg-surface-container-low text-on-surface-variant border-outline-variant/10'
                                      )}
                                    >
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
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
              How to change your AI provider
            </p>
            <p
              className={cn(
                'text-xs mt-1 leading-relaxed opacity-70',
                isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
              )}
            >
              Set <code className="font-mono">AI_PROVIDER=openai|ollama|mock</code> in your backend{' '}
              <code className="font-mono">.env</code> file and restart the backend. Interactive
              provider switching is coming in a future update.
            </p>
          </div>
        </div>
      </ReactiveCard>
    </div>
  );
}
