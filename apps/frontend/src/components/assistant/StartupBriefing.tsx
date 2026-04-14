/**
 * @file components/assistant/StartupBriefing.tsx
 * @description Daily TARS startup briefing overlay shown once per calendar day.
 *   Boot animation plays while the SSE briefing streams in the background.
 *   The briefing text is typewriter-revealed after the animation phase ends.
 *   Quick-action chips navigate to the most common post-briefing destinations.
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - framer-motion
 * - hooks/useStartupBriefing.ts
 * - stores/assistant.store.ts
 *
 * @relatedFiles
 * - App.tsx (renders this overlay once per day)
 * - hooks/useStartupBriefing.ts
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStartupBriefing } from '@/hooks/useStartupBriefing';
import { useAssistantStore } from '@/stores/assistant.store';
import type { ScreenId } from '@/stores/assistant.store';

interface StartupBriefingProps {
  isDark:     boolean;
  onDismiss:  () => void;
  onNavigate: (screen: ScreenId) => void;
}

// Boot sequence steps — CSS animation, pure visual
const BOOT_STEPS = [
  'Connecting to Polaris…',
  'Loading your context…',
  'Building briefing…',
];

/** Quick-action chips shown after the briefing finishes */
const QUICK_ACTIONS: Array<{ label: string; screen: ScreenId }> = [
  { label: 'View goals',     screen: 'Goals' },
  { label: 'Weekly review',  screen: 'WeeklyReview' },
  { label: 'See history',    screen: 'History' },
];

export function StartupBriefing({ isDark, onDismiss, onNavigate }: StartupBriefingProps) {
  const { state, start, markShown, dismiss } = useStartupBriefing();
  const openPanel = useAssistantStore((s) => s.open);

  const [bootStep, setBootStep] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Start the SSE fetch immediately on mount (before animation finishes)
  useEffect(() => {
    start();
  }, [start]);

  // Skip instantly if already shown today
  useEffect(() => {
    if (state.status === 'skipped') {
      onDismiss();
    }
  }, [state.status, onDismiss]);

  // Boot animation: advance through steps every 600ms
  useEffect(() => {
    if (showContent) return;
    const timer = setInterval(() => {
      setBootStep((prev) => {
        const next = prev + 1;
        if (next >= BOOT_STEPS.length) {
          clearInterval(timer);
          // Small delay then show content
          setTimeout(() => setShowContent(true), 300);
        }
        return Math.min(next, BOOT_STEPS.length - 1);
      });
    }, 600);
    return () => clearInterval(timer);
  }, [showContent]);

  // Mark shown once content is visible and streaming starts
  useEffect(() => {
    if (showContent && state.status !== 'idle') {
      markShown();
    }
  }, [showContent, state.status, markShown]);

  const handleDismiss = () => {
    dismiss();
    onDismiss();
  };

  const handleOpenPanel = () => {
    dismiss();
    openPanel();
    onDismiss();
  };

  const handleNavigate = (screen: ScreenId) => {
    dismiss();
    onNavigate(screen);
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="startup-briefing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{
          background: isDark
            ? 'rgba(2, 6, 23, 0.92)'
            : 'rgba(248, 250, 252, 0.92)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="w-full max-w-lg px-6">

          {/* Boot sequence */}
          <AnimatePresence mode="wait">
            {!showContent && (
              <motion.div
                key="boot"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-center space-y-6"
              >
                {/* TARS monolith icon */}
                <div className="flex justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className={cn(
                      'w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-bold',
                      isDark
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                    )}
                  >
                    T
                  </motion.div>
                </div>

                {/* Boot steps */}
                <div className="space-y-1.5">
                  {BOOT_STEPS.map((step, i) => (
                    <motion.p
                      key={step}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: i <= bootStep ? 1 : 0.2 }}
                      transition={{ duration: 0.3 }}
                      className={cn(
                        'text-sm',
                        i === bootStep
                          ? isDark ? 'text-slate-300' : 'text-slate-700'
                          : isDark ? 'text-slate-600' : 'text-slate-400'
                      )}
                    >
                      {i < bootStep && <span className="mr-1.5 text-green-400">✓</span>}
                      {step}
                    </motion.p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Briefing content */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-sm flex items-center justify-center text-sm font-bold',
                        isDark
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                      )}
                    >
                      T
                    </div>
                    <span className={cn('font-semibold text-sm', isDark ? 'text-slate-200' : 'text-slate-800')}>
                      TARS
                    </span>
                    {state.status === 'streaming' && (
                      <span className="flex gap-0.5 items-center">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss briefing"
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-lg transition-colors',
                      isDark
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-white/6'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    Skip
                  </button>
                </div>

                {/* Briefing text */}
                <div
                  className={cn(
                    'text-sm leading-relaxed min-h-[60px]',
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  )}
                >
                  {state.text || (
                    <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>
                      {state.status === 'error'
                        ? `Could not load briefing: ${state.error ?? 'unknown error'}`
                        : 'Loading…'}
                    </span>
                  )}
                  {state.status === 'streaming' && (
                    <span className="inline-block w-0.5 h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>

                {/* Actions — shown once streaming is done */}
                {(state.status === 'done' || state.status === 'error') && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-3"
                  >
                    {/* Quick action chips */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_ACTIONS.map(({ label, screen }) => (
                        <button
                          key={screen}
                          type="button"
                          onClick={() => handleNavigate(screen)}
                          className={cn(
                            'text-xs px-3 py-1.5 rounded-full border transition-colors',
                            isDark
                              ? 'border-white/10 text-slate-300 hover:bg-white/8 hover:text-white'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleOpenPanel}
                        className={cn(
                          'text-xs px-3 py-1.5 rounded-full transition-colors',
                          'bg-indigo-600 text-white hover:bg-indigo-500'
                        )}
                      >
                        Chat with TARS
                      </button>
                    </div>

                    {/* Dismiss */}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className={cn(
                        'text-xs transition-colors',
                        isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
                      )}
                    >
                      Dismiss
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
