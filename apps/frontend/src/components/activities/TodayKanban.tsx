/**
 * @file components/activities/TodayKanban.tsx
 * @description Three-column Kanban board for today's activities.
 *   Columns: Planned → Completed → Skipped.
 *   One-tap complete/skip/undo actions — no modal required.
 *   Self-contained: fetches its own data and owns mutation state.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 * - hooks/useActivities (useTodayActivities, useUpdateActivity, useDeleteActivity)
 * - components/activities/ActivityCard
 * - components/activities/LogActivityForm
 *
 * @relatedFiles
 * - src/components/Hub.tsx
 * - src/hooks/useActivities.ts
 * - src/components/activities/ActivityCard.tsx
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, CheckCheck, Clock, SkipForward } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ActivityCard } from './ActivityCard';
import { LogActivityForm } from './LogActivityForm';
import {
  useTodayActivities,
  useUpdateActivity,
  useDeleteActivity,
  type ListedActivity,
} from '../../hooks/useActivities';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodayKanbanProps {
  isDark?: boolean;
}

interface ColumnConfig {
  key:         'planned' | 'completed' | 'skipped';
  heading:     string;
  Icon:        React.FC<{ className?: string }>;
  accentLight: string;
  accentDark:  string;
  emptyText:   string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key:         'planned',
    heading:     'Planned',
    Icon:        Clock,
    accentLight: 'border-t-2 border-blue-300/60',
    accentDark:  'border-t-2 border-dark-primary/40',
    emptyText:   'Nothing planned — log something above',
  },
  {
    key:         'completed',
    heading:     'Done',
    Icon:        CheckCheck,
    accentLight: 'border-t-2 border-emerald-400/60',
    accentDark:  'border-t-2 border-emerald-400/40',
    emptyText:   'Nothing completed yet today',
  },
  {
    key:         'skipped',
    heading:     'Skipped',
    Icon:        SkipForward,
    accentLight: 'border-t-2 border-amber-400/40',
    accentDark:  'border-t-2 border-amber-400/30',
    emptyText:   'Nothing skipped',
  },
];

// ---------------------------------------------------------------------------
// Column sub-component
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  config:      ColumnConfig;
  activities:  ListedActivity[];
  onComplete:  (id: string, value?: number) => void;
  onSkip:      (id: string) => void;
  onUndo:      (id: string) => void;
  onDelete:    (id: string) => void;
  onEdit:      (activity: ListedActivity) => void;
  pendingIds:  Set<string>;
  isDark:      boolean;
}

function KanbanColumn({
  config,
  activities,
  onComplete,
  onSkip,
  onUndo,
  onDelete,
  onEdit,
  pendingIds,
  isDark,
}: KanbanColumnProps) {
  const { Icon } = config;
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl p-4 min-h-[120px]',
        isDark ? 'bg-white/3' : 'bg-surface-container-low/60',
        isDark ? config.accentDark : config.accentLight
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            'w-3.5 h-3.5',
            config.key === 'completed'
              ? 'text-emerald-400'
              : config.key === 'skipped'
              ? 'text-amber-400'
              : isDark
              ? 'text-dark-primary'
              : 'text-primary'
          )}
        />
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.25em]',
            isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
          )}
        >
          {config.heading}
        </span>
        {activities.length > 0 && (
          <span
            className={cn(
              'ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold',
              isDark ? 'bg-white/8 text-dark-on-surface-variant' : 'bg-black/5 text-on-surface-variant'
            )}
          >
            {activities.length}
          </span>
        )}
      </div>

      {/* Activity list */}
      <AnimatePresence initial={false}>
        {activities.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'text-xs italic pt-1',
              isDark ? 'text-dark-on-surface-variant/40' : 'text-on-surface-variant/50'
            )}
          >
            {config.emptyText}
          </motion.p>
        ) : (
          <ul className="space-y-2">
            {activities.map((activity) => (
              <motion.li
                key={activity.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
              >
                <ActivityCard
                  activity={activity}
                  isDark={isDark}
                  onComplete={onComplete}
                  onSkip={onSkip}
                  onUndo={onUndo}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  isPending={pendingIds.has(activity.id)}
                />
              </motion.li>
            ))}
          </ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Renders a 3-column Kanban for today's activities.
 * Handles its own data fetching, optimistic pending state, and log form.
 * Drop into any parent — no props required beyond optional isDark.
 */
export function TodayKanban({ isDark = true }: TodayKanbanProps) {
  const [showLogForm,   setShowLogForm]   = useState(false);
  const [editActivity,  setEditActivity]  = useState<ListedActivity | undefined>(undefined);
  const [pendingIds,    setPendingIds]    = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useTodayActivities();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const planned   = data?.planned   ?? [];
  const completed = data?.completed ?? [];
  const skipped   = data?.skipped   ?? [];
  const total     = planned.length + completed.length + skipped.length;

  // ---------------------------------------------------------------------------
  // Pending state helpers — track in-flight mutations per activity id
  // ---------------------------------------------------------------------------
  function addPending(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
  }
  function removePending(id: string) {
    setPendingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  // ---------------------------------------------------------------------------
  // Mutation handlers — all one-tap, no confirmation modals for status changes
  // ---------------------------------------------------------------------------
  function handleComplete(id: string, value?: number) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'completed', ...(value !== undefined ? { value } : {}) } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleSkip(id: string) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'skipped' } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleUndo(id: string) {
    addPending(id);
    updateActivity.mutate(
      { id, data: { status: 'planned' } },
      { onSettled: () => removePending(id) }
    );
  }
  function handleDelete(id: string) {
    addPending(id);
    deleteActivity.mutate(id, { onSettled: () => removePending(id) });
  }
  function handleEdit(activity: ListedActivity) {
    setEditActivity(activity);
    setShowLogForm(true);
  }

  const columnData: Record<'planned' | 'completed' | 'skipped', ListedActivity[]> = {
    planned,
    completed,
    skipped,
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.3em]',
            isDark ? 'text-dark-primary' : 'text-primary'
          )}
        >
          {isDark ? 'Mission Log' : "Today's Activities"}
        </h3>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span
              className={cn(
                'text-xs font-bold',
                isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60'
              )}
            >
              {completed.length}/{total} done
            </span>
          )}
          <button
            onClick={() => { setEditActivity(undefined); setShowLogForm(true); }}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all',
              isDark
                ? 'bg-dark-primary/15 text-dark-primary hover:bg-dark-primary/25'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Plus className="w-3 h-3" />
            Log
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className={cn('w-5 h-5 animate-spin', isDark ? 'text-dark-primary' : 'text-primary')}
          />
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <p className={cn('text-sm text-center py-8', isDark ? 'text-red-400/70' : 'text-red-500/70')}>
          Failed to load today&apos;s activities.
        </p>
      )}

      {/* Three-column Kanban */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              config={col}
              activities={columnData[col.key]}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onUndo={handleUndo}
              onDelete={handleDelete}
              onEdit={handleEdit}
              pendingIds={pendingIds}
              isDark={isDark}
            />
          ))}
        </div>
      )}

      {/* Log / Edit form (modal overlay) */}
      <AnimatePresence>
        {showLogForm && (
          <motion.div
            key="log-form-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => { setShowLogForm(false); setEditActivity(undefined); }}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={cn(
                'relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden',
                isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-outline-variant/20'
              )}
            >
              <LogActivityForm
                {...(editActivity ? { editActivity } : {})}
                onClose={() => { setShowLogForm(false); setEditActivity(undefined); }}
                onSuccess={() => { setShowLogForm(false); setEditActivity(undefined); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
