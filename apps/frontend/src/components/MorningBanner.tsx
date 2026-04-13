/**
 * @file components/MorningBanner.tsx
 * @description Dismissable morning check-in banner.
 *   Shows once per calendar day on first app load.
 *   Displays AI coaching message, streak status, and a suggested activity.
 *   Includes a one-tap "Add to today" button for the suggestion.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useDailyCoach
 * - framer-motion
 * - lucide-react
 *
 * @relatedFiles
 * - src/hooks/useDailyCoach.ts
 * - src/App.tsx
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Flame,
  Plus,
  Loader2,
  Bot,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDailyCoach, useAddSuggestionToday } from '@/hooks/useDailyCoach';
import toast from 'react-hot-toast';

interface MorningBannerProps {
  isDark:    boolean;
  onDismiss: () => void;
}

/**
 * Non-blocking morning banner overlay.
 * Renders above the main layout but below the top nav (z-[100]).
 */
export function MorningBanner({ isDark, onDismiss }: MorningBannerProps) {
  const { data: coach, isLoading } = useDailyCoach();
  const addSuggestion = useAddSuggestionToday();

  const handleAdd = () => {
    if (!coach?.suggestion) return;
    addSuggestion.mutate(coach.suggestion, {
      onSuccess: () => {
        toast.success('Added to today ✓');
        onDismiss();
      },
      onError: () => toast.error('Could not add activity'),
    });
  };

  const timeOfDay = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  })();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'fixed top-16 left-0 right-0 z-[100] px-4 pt-3 pb-2 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'max-w-2xl mx-auto rounded-2xl border shadow-2xl backdrop-blur-xl pointer-events-auto overflow-hidden',
            isDark
              ? 'bg-dark-surface/90 border-white/10'
              : 'bg-white/90 border-black/5'
          )}
        >
          {/* Gradient accent bar */}
          <div className={cn('h-0.5 w-full', isDark ? 'plasma-gradient' : 'signature-gradient')} />

          <div className="px-5 py-4">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isDark ? 'bg-dark-primary/15' : 'bg-primary/10'
                  )}
                >
                  <Sparkles className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')} />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-bold leading-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                    {timeOfDay}
                  </p>
                  <p className={cn('text-[10px] font-medium uppercase tracking-widest', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                    {coach?.source === 'ai' ? 'AI Coach' : 'Daily Quote'}
                  </p>
                </div>
              </div>

              <button
                onClick={onDismiss}
                className={cn(
                  'p-1.5 rounded-xl transition-all shrink-0',
                  isDark ? 'text-dark-on-surface-variant hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
                )}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex items-center gap-2 mt-4 pb-1">
                <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-dark-primary' : 'text-primary')} />
                <span className={cn('text-sm', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                  Preparing your daily briefing…
                </span>
              </div>
            ) : coach ? (
              <div className="mt-3 space-y-3">
                {/* Message */}
                <div className="flex gap-2.5">
                  {coach.source === 'fallback' ? (
                    <Quote className={cn('w-4 h-4 mt-0.5 shrink-0 opacity-40', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')} />
                  ) : (
                    <Bot className={cn('w-4 h-4 mt-0.5 shrink-0', isDark ? 'text-dark-primary' : 'text-primary')} />
                  )}
                  <p className={cn('text-sm leading-relaxed', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                    {coach.message}
                  </p>
                </div>

                {/* Streak message */}
                {coach.streakMessage && (
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <p className={cn('text-xs font-medium', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                      {coach.streakMessage}
                    </p>
                  </div>
                )}

                {/* Suggestion card */}
                {coach.suggestion && (
                  <div
                    className={cn(
                      'rounded-xl px-4 py-3 flex items-center justify-between gap-3 border',
                      isDark ? 'bg-white/5 border-white/8' : 'bg-black/3 border-black/5'
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-0.5', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                        Suggested for today
                      </p>
                      <p className={cn('text-sm font-semibold truncate', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                        {coach.suggestion.title}
                      </p>
                      <p className={cn('text-xs mt-0.5 opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
                        {coach.suggestion.value} {coach.suggestion.unit} · {coach.suggestion.activityType}
                      </p>
                    </div>

                    <button
                      onClick={handleAdd}
                      disabled={addSuggestion.isPending}
                      className={cn(
                        'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95',
                        isDark
                          ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30'
                          : 'bg-primary/10 text-primary hover:bg-primary/20',
                        addSuggestion.isPending && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      {addSuggestion.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Add to today
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
