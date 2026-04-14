/**
 * @file components/OnboardingModal.tsx
 * @description First-time user onboarding — 3-step fullscreen overlay.
 *   Step 1: Welcome + what Polaris is.
 *   Step 2: Create your first goal.
 *   Step 3: Log a quick first activity.
 *   Shown when the user has 0 goals AND 0 activities (detected in App.tsx).
 *   Completion writes 'polaris:onboarded' to localStorage so it never shows again.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useGoals
 * - hooks/useActivities
 * - motion/react
 *
 * @relatedFiles
 * - src/App.tsx
 * - src/hooks/useGoals.ts
 * - src/hooks/useActivities.ts
 */

import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Target, CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateGoal } from '@/hooks/useGoals';
import { useCreateActivity } from '@/hooks/useActivities';
import type { Theme } from '@/types/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingModalProps {
  theme: Theme;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOAL_TIMEFRAME_OPTIONS = [
  { value: 'short',  label: 'Short-term',  hint: 'Days to weeks' },
  { value: 'medium', label: 'Mid-term',    hint: 'Weeks to months' },
  { value: 'long',   label: 'Long-term',   hint: 'Months to years' },
] as const;

const EXAMPLE_GOALS = [
  'Read 12 books this year',
  'Run a 5K',
  'Save ₹50,000',
  'Learn a new skill',
  'Exercise 3× per week',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso() {
  return new Date().toISOString().split('T')[0] as string;
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i === current ? 'w-5 h-1.5 bg-current' : 'w-1.5 h-1.5 bg-current opacity-25'
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingModal({ theme, onComplete }: OnboardingModalProps) {
  const isDark = theme === 'dark';
  const [step, setStep]         = useState(0);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTimeframe, setGoalTimeframe] = useState<'short' | 'medium' | 'long'>('medium');
  const [activityTitle, setActivityTitle] = useState('');
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const createGoal     = useCreateGoal();
  const createActivity = useCreateActivity();

  const inputCls = cn(
    'w-full rounded-xl px-4 py-3 text-sm border outline-none transition-all',
    isDark
      ? 'bg-white/5 border-white/10 text-dark-on-surface placeholder-white/30 focus:border-dark-primary/50 focus:ring-1 focus:ring-dark-primary/20'
      : 'bg-surface-container-low border-outline-variant/20 text-on-surface placeholder-on-surface-variant/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/10'
  );

  // ── Step 2: create goal ──
  async function handleCreateGoal(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!goalTitle.trim()) { setError('Give your goal a name.'); return; }
    try {
      const goal = await createGoal.mutateAsync({ title: goalTitle.trim(), timeframe: goalTimeframe });
      setCreatedGoalId(goal.id);
      setStep(2);
    } catch {
      setError('Could not save goal — please try again.');
    }
  }

  // ── Step 3: log first activity ──
  async function handleLogActivity(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!activityTitle.trim()) { setError('Describe what you did.'); return; }
    try {
      await createActivity.mutateAsync({
        title:        activityTitle.trim(),
        activityType: 'completion',
        activityDate: todayIso(),
        status:       'completed',
        ...(createdGoalId ? { goalId: createdGoalId } : {}),
      });
      handleDone();
    } catch {
      setError('Could not save activity — please try again.');
    }
  }

  function handleDone() {
    try { localStorage.setItem('polaris:onboarded', '1'); } catch { /* noop */ }
    onComplete();
  }

  // ── Slides ──
  const slides = [
    // Step 0: Welcome
    <motion.div
      key="welcome"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center text-center gap-6"
    >
      <div className={cn('w-20 h-20 rounded-3xl flex items-center justify-center', isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary')}>
        <Sparkles className="w-10 h-10" />
      </div>
      <div className="space-y-3 max-w-sm">
        <h1 className={cn('text-3xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
          Welcome to Polaris
        </h1>
        <p className={cn('text-base leading-relaxed opacity-70', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
          Polaris is a <strong>personal activity tracker</strong> built around your goals.
          Every activity you log moves you closer to what matters most.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2">
        {[
          { Icon: Target, label: 'Set goals', desc: 'Define what you want to achieve' },
          { Icon: CheckCircle2, label: 'Track progress', desc: 'Log activities that contribute to goals' },
        ].map(({ Icon, label, desc }) => (
          <div
            key={label}
            className={cn('rounded-2xl p-4 border text-left space-y-1', isDark ? 'bg-white/3 border-white/8' : 'bg-surface-container-low border-outline-variant/15')}
          >
            <Icon className={cn('w-5 h-5 mb-1', isDark ? 'text-dark-primary' : 'text-primary')} />
            <p className={cn('text-sm font-bold', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>{label}</p>
            <p className={cn('text-xs opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>{desc}</p>
          </div>
        ))}
      </div>
      <button
        onClick={() => setStep(1)}
        className={cn('flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all mt-2', isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white')}
      >
        Get started <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>,

    // Step 1: Create first goal
    <motion.div
      key="goal"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col gap-5 w-full max-w-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary')}>
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h2 className={cn('text-lg font-black', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            Create your first goal
          </h2>
          <p className={cn('text-xs opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            What are you working towards?
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleCreateGoal(e)} className="space-y-4">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <div>
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => { setGoalTitle(e.target.value); setError(null); }}
            placeholder="e.g. Read 12 books this year"
            className={inputCls}
            autoFocus
            maxLength={200}
          />
          {/* Example chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLE_GOALS.map((eg) => (
              <button
                key={eg}
                type="button"
                onClick={() => setGoalTitle(eg)}
                className={cn('px-2 py-1 rounded-md text-xs border transition-colors', isDark ? 'bg-white/5 border-white/8 text-dark-on-surface-variant hover:border-dark-primary/40' : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-primary/30')}
              >
                {eg}
              </button>
            ))}
          </div>
        </div>

        {/* Timeframe */}
        <div className="grid grid-cols-3 gap-2">
          {GOAL_TIMEFRAME_OPTIONS.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGoalTimeframe(value)}
              className={cn(
                'rounded-xl p-3 border text-center transition-all',
                goalTimeframe === value
                  ? isDark
                    ? 'bg-dark-primary/20 border-dark-primary/40 text-dark-primary'
                    : 'bg-primary/10 border-primary/30 text-primary'
                  : isDark
                  ? 'bg-white/3 border-white/8 text-dark-on-surface-variant hover:bg-white/8'
                  : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant hover:bg-surface-container'
              )}
            >
              <p className="text-xs font-bold">{label}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{hint}</p>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={createGoal.isPending || !goalTitle.trim()}
          className={cn('w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed', isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white')}
        >
          {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {createGoal.isPending ? 'Saving…' : 'Set this goal'}
        </button>
      </form>
    </motion.div>,

    // Step 2: Log first activity
    <motion.div
      key="activity"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col gap-5 w-full max-w-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center', isDark ? 'bg-dark-primary/20 text-dark-primary' : 'bg-primary/10 text-primary')}>
          <Rocket className="w-5 h-5" />
        </div>
        <div>
          <h2 className={cn('text-lg font-black', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
            Log your first win
          </h2>
          <p className={cn('text-xs opacity-60', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            What have you already done today?
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void handleLogActivity(e)} className="space-y-4">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <input
          type="text"
          value={activityTitle}
          onChange={(e) => { setActivityTitle(e.target.value); setError(null); }}
          placeholder="e.g. Read for 20 minutes"
          className={inputCls}
          autoFocus
          maxLength={200}
        />

        <button
          type="submit"
          disabled={createActivity.isPending || !activityTitle.trim()}
          className={cn('w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed', isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white')}
        >
          {createActivity.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {createActivity.isPending ? 'Saving…' : 'Log it!'}
        </button>

        <button
          type="button"
          onClick={handleDone}
          className={cn('w-full text-xs font-semibold py-2 opacity-40 hover:opacity-70 transition-all', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}
        >
          Skip for now
        </button>
      </form>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          'w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-8 space-y-6',
          isDark
            ? 'bg-dark-surface-container border-white/10'
            : 'bg-surface border-outline-variant/20'
        )}
      >
        {/* Progress */}
        <div className="flex items-center justify-between">
          <StepDots total={3} current={step} />
          <span className={cn('text-[10px] font-black uppercase tracking-widest opacity-40', isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant')}>
            {step + 1} / 3
          </span>
        </div>

        <AnimatePresence mode="wait">
          {slides[step]}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
