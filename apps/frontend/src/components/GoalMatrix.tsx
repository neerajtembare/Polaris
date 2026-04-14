/**
 * @file components/GoalMatrix.tsx
 * @description Goals screen with 3D constellation background and bento grid of goal cards.
 *   Data fetched from backend via useGoals hook. Goal creation via modal sheet.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useGoals
 * - components/ui/ReactiveCard
 * - components/3d/GoalConstellation
 * - motion/react
 *
 * @relatedFiles
 * - components/Layout.tsx
 * - hooks/useGoals.ts
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MoreVertical,
  Rocket,
  Target,
  Flame,
  BookOpen,
  Dumbbell,
  Star,
  X,
  Loader2,
  History,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactiveCard from './ui/ReactiveCard';
import GoalConstellation from './3d/GoalConstellation';
import { ConfirmModal } from './ui/ConfirmModal';
import { useGoals, useCreateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useDormantGoals } from '@/hooks/useDormantGoals';
import type { GoalWithProgress } from '@polaris/shared';
import type { Theme, ScreenId } from '@/types/navigation';
import toast from 'react-hot-toast';

interface GoalMatrixProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

/** Pick an icon per goal index (cycling) */
const GOAL_ICONS: React.FC<{ className?: string }>[] = [Rocket, Target, Flame, BookOpen, Dumbbell, Star];

/** Goal colors cycling through accent palette */
const GOAL_COLORS_DARK = [
  'text-dark-primary border-dark-primary/20',
  'text-dark-secondary border-dark-secondary/20',
  'text-dark-tertiary border-dark-tertiary/20',
];
const GOAL_COLORS_LIGHT = [
  'text-primary',
  'text-secondary',
  'text-tertiary',
];

// ── Create Goal Form ─────────────────────────────────────────────────────────
interface CreateGoalFormProps {
  isDark: boolean;
  onClose: () => void;
}

function CreateGoalForm({ isDark, onClose }: CreateGoalFormProps) {
  const createGoal = useCreateGoal();
  const [title, setTitle] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState<'long' | 'medium' | 'short'>('medium');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const input: { title: string; description?: string; timeframe: 'long' | 'medium' | 'short'; targetValue?: number; targetUnit?: string } = {
        title: title.trim(),
        timeframe,
      };
      if (description.trim()) input.description = description.trim();
      if (targetValue) input.targetValue = Number(targetValue);
      if (targetUnit.trim()) input.targetUnit = targetUnit.trim();
      await createGoal.mutateAsync(input);
      toast.success('Goal created!');
      onClose();
    } catch {
      toast.error('Failed to create goal.');
    }
  };

  const inputClass = cn(
    'w-full rounded-xl px-4 py-3 text-sm border font-medium transition-all focus:outline-none focus:ring-2',
    isDark
      ? 'bg-white/5 border-white/10 text-dark-on-surface placeholder:opacity-30 focus:ring-dark-primary/30'
      : 'bg-surface-container-low border-outline-variant/20 text-on-surface placeholder:opacity-40 focus:ring-primary/20'
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className={cn(
          'w-full max-w-lg rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl border',
          isDark ? 'bg-dark-bg border-white/10' : 'bg-white border-outline-variant/20'
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            className={cn('text-xl font-black tracking-tight', isDark ? 'text-dark-on-surface' : 'text-on-surface')}
          >
            New Goal
          </h2>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-xl transition-all',
              isDark ? 'text-dark-on-surface-variant hover:bg-white/5' : 'text-on-surface-variant hover:bg-black/5'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className={inputClass}
            placeholder="Goal title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className={inputClass}
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Timeframe tabs */}
          <div className="grid grid-cols-3 gap-2">
            {(['short', 'medium', 'long'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeframe(t)}
                className={cn(
                  'py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border',
                  timeframe === t
                    ? isDark
                      ? 'bg-dark-primary/20 text-dark-primary border-dark-primary/30'
                      : 'bg-primary/10 text-primary border-primary/20'
                    : isDark
                    ? 'bg-white/5 text-dark-on-surface-variant border-white/10'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Target */}
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              className={cn(inputClass, 'flex-1 min-w-[120px]')}
              placeholder="Target (e.g. 100)"
              type="number"
              min="0"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            <input
              className={cn(inputClass, 'flex-1')}
              placeholder="Unit (e.g. pages)"
              value={targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={createGoal.isPending || !title.trim()}
            className={cn(
              'w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all',
              isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white',
              (createGoal.isPending || !title.trim()) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {createGoal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Deploy Goal
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Goal Card ────────────────────────────────────────────────────────────────
interface GoalCardProps {
  goal: GoalWithProgress;
  isDark: boolean;
  colorClass: string;
  IconComponent: React.FC<{ className?: string }>;
  featured?: boolean;
}

function GoalCard({ goal, isDark, colorClass, IconComponent, featured }: GoalCardProps) {
  const deleteGoal = useDeleteGoal();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const percentage = goal.progress?.percentage ?? 0;
  const current = goal.progress?.currentValue ?? 0;
  const target = goal.targetValue;
  const streakDays = goal.progress?.daysActive ?? 0;

  return (
    <>
      <ConfirmModal
        isOpen={showDeleteConfirm}
        message="Delete this goal?"
        detail={goal.title}
        confirmLabel="Delete"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          void deleteGoal.mutateAsync(goal.id).catch(() => toast.error('Delete failed'));
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    <ReactiveCard
      isDark={isDark}
      className={cn('group overflow-hidden', featured && 'md:col-span-2')}
    >
      {isDark && featured && (
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-dark-primary/20 blur-[100px] pointer-events-none" />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={cn('flex justify-between items-start', featured ? 'mb-8 md:mb-10' : 'mb-6')}>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6 border shrink-0',
                isDark ? `bg-white/5 ${colorClass}` : `bg-primary/5 text-primary`
              )}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3
                className={cn(
                  'font-black tracking-tight truncate',
                  featured ? 'text-xl md:text-2xl' : 'text-lg',
                  isDark ? 'text-dark-on-surface' : 'text-on-surface'
                )}
              >
                {goal.title}
              </h3>
              {goal.description && (
                <p
                  className={cn(
                    'text-xs mt-0.5 opacity-60 truncate',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  {goal.description}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteGoal.isPending}
            aria-label={`Delete goal: ${goal.title}`}
            className={cn(
              'opacity-30 hover:opacity-80 p-1 rounded-lg transition-all relative z-20 disabled:cursor-wait',
              isDark ? 'text-dark-on-surface hover:text-red-400' : 'text-on-surface hover:text-red-500'
            )}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-auto">
          <div className="flex justify-between items-end mb-3">
            <div>
              <span
                className={cn(
                  'font-black leading-none tracking-tighter',
                  featured ? 'text-4xl md:text-5xl' : 'text-3xl',
                  isDark ? 'text-dark-primary' : 'text-primary'
                )}
              >
                {percentage.toFixed(0)}
                <span className={cn('font-medium', featured ? 'text-xl' : 'text-base')}>%</span>
              </span>
              <span
                className={cn(
                  'block text-[9px] font-bold uppercase tracking-[0.2em] mt-1 opacity-50',
                  isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                )}
              >
                Progress
              </span>
            </div>
            {target != null && (
              <div className="text-right">
                <span className={cn('font-black text-lg', isDark ? 'text-dark-on-surface' : 'text-on-surface')}>
                  {current} / {target}
                </span>
                <span
                  className={cn(
                    'block text-[9px] font-bold uppercase tracking-widest mt-1 opacity-50',
                    isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
                  )}
                >
                  {goal.targetUnit ?? 'units'}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div
            className={cn(
              'w-full rounded-full overflow-hidden p-0.5',
              featured ? 'h-3 md:h-4' : 'h-2',
              isDark ? 'bg-white/5' : 'bg-surface-container-high'
            )}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 1.5, ease: 'circOut' }}
              className={cn(
                'h-full rounded-full relative',
                isDark
                  ? 'plasma-gradient shadow-[0_0_12px_rgba(129,236,255,0.5)]'
                  : 'signature-gradient'
              )}
            >
              {featured && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>

          {/* Streak */}
          <div
            className={cn(
              'flex items-center gap-1 mt-2 text-[9px] font-bold uppercase tracking-widest opacity-40',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            <History className="w-3 h-3" />
            {streakDays}d active
          </div>
        </div>
      </div>
    </ReactiveCard>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function GoalMatrix({ theme, onNavigate }: GoalMatrixProps) {
  const isDark = theme === 'dark';
  const [showCreate, setShowCreate] = useState(false);

  const { data: goals = [], isLoading } = useGoals({ status: 'active', includeProgress: true });
  const { data: dormant = [] } = useDormantGoals();

  return (
    <div className="px-4 md:px-12 lg:px-20 max-w-[1600px] mx-auto relative">
      {/* 3D constellation background */}
      <GoalConstellation theme={theme} />

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-16 relative z-10">
        <div className="space-y-2">
          {isDark && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-dark-primary font-bold">
              Mission Protocol
            </p>
          )}
          <h1
            className={cn(
              'text-4xl md:text-5xl font-black tracking-[-0.03em] leading-none',
              isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
            )}
          >
            {isDark ? 'Goal Matrix' : 'Goal Constellations'}
          </h1>
          <p
            className={cn(
              'text-base leading-relaxed opacity-70',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            {isDark
              ? 'Real-time telemetry for active development cycles.'
              : 'Map your strategic objectives and track velocity.'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            className={cn(
              'flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-sm transition-all',
              isDark
                ? 'bg-white/5 text-dark-on-surface hover:bg-white/10'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
            )}
          >
            Filter
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className={cn(
              'flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 text-sm',
              isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
            )}
          >
            <Plus className="w-4 h-4" />
            {isDark ? 'Deploy' : 'New Goal'}
          </button>
          {dormant.length > 0 && (
            <button
              onClick={() => onNavigate('WeeklyReview', 'push')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-400/10 border border-amber-400/30 text-amber-400 hover:bg-amber-400/20 transition-all"
              title={`${dormant.length} dormant goal${dormant.length > 1 ? 's' : ''} — click to review`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {dormant.length}
            </button>
          )}
        </div>
      </header>

      {/* Goal Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            className={cn('w-8 h-8 animate-spin', isDark ? 'text-dark-primary' : 'text-primary')}
          />
        </div>
      ) : goals.length === 0 ? (
        <div
          className={cn(
            'text-center py-24 relative z-10',
            isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
          )}
        >
          <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-bold opacity-50">No active goals</p>
          <p className="text-sm opacity-30 mt-1">Deploy your first goal to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className={cn(
              'mt-6 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto',
              isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
            )}
          >
            <Plus className="w-4 h-4" /> New Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
          {goals.map((goal, i) => {
            const IconComponent = GOAL_ICONS[i % GOAL_ICONS.length] ?? Rocket;
            const colorClass = (isDark
              ? GOAL_COLORS_DARK[i % GOAL_COLORS_DARK.length]
              : GOAL_COLORS_LIGHT[i % GOAL_COLORS_LIGHT.length]) ?? '';
            const featured = i === 0;

            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                isDark={isDark}
                colorClass={colorClass}
                IconComponent={IconComponent}
                featured={featured}
              />
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateGoalForm isDark={isDark} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
