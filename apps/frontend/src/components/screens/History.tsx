/**
 * @file components/History.tsx
 * @description Activity history screen with Kinetic Precision styling.
 *   Lists all activities with status and date filters, log new activity modal.
 *   Wraps existing useActivities hooks in the new design system.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useActivities
 * - components/activities/ActivityCard, LogActivityForm
 * - components/ui/ReactiveCard
 *
 * @relatedFiles
 * - hooks/useActivities.ts
 * - components/activities/ActivityCard.tsx
 * - components/activities/LogActivityForm.tsx
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Loader2, History as HistoryIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useActivities, useUpdateActivity, useDeleteActivity } from '@/hooks/useActivities';
import { api } from '@/services/api';
import { ActivityCard } from '../activities/ActivityCard';
import { LogActivityForm } from '../activities/LogActivityForm';
import type { ActivityStatus } from '@polaris/shared';
import type { Theme, ScreenId } from '@/types/navigation';

interface HistoryProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

type FilterStatus = 'all' | ActivityStatus;

const STATUS_TABS = [
  { label: 'All',       value: 'all' as FilterStatus },
  { label: 'Done',      value: 'completed' as FilterStatus },
  { label: 'Planned',   value: 'planned' as FilterStatus },
  { label: 'Skipped',   value: 'skipped' as FilterStatus },
];

export default function History({ theme, onNavigate: _onNavigate }: HistoryProps) {
  const isDark = theme === 'dark';

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [search, setSearch] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 50;

  const { data: activitiesPage, isLoading } = useActivities({
    limit: PAGE_SIZE,
    offset,
    ...(filterStatus !== 'all' ? { status: filterStatus as ActivityStatus } : {}),
    ...(filterDate ? { date: filterDate } : {}),
  });

  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const activities = activitiesPage?.data ?? [];
  const total = activitiesPage?.meta?.total ?? 0;

  // Fetch all unique tags from backend (covers all activities, not just current page)
  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ['activities', 'tags'],
    queryFn:  () => api.get<string[]>('/activities/tags'),
    staleTime: 60_000,
  });

  // Client-side search + tag filter
  const filtered = activities
    .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()))
    .filter((a) => !filterTag || (a.tags ?? []).includes(filterTag));

  const btnBase = cn(
    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
    isDark
      ? 'text-dark-on-surface-variant hover:bg-white/5'
      : 'text-on-surface-variant hover:bg-black/5'
  );

  const btnActive = isDark
    ? 'bg-dark-primary/20 text-dark-primary border border-dark-primary/30'
    : 'bg-primary/10 text-primary border border-primary/20';

  return (
    <div className="px-4 md:px-12 max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1
            className={cn(
              'text-[2.5rem] md:text-[4rem] font-black leading-[0.9] tracking-tighter',
              isDark ? 'text-dark-on-surface font-headline' : 'text-on-surface'
            )}
          >
            History
          </h1>
          <p
            className={cn(
              'text-sm opacity-70',
              isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
            )}
          >
            {total} total activities logged
          </p>
        </div>
        <button
          onClick={() => setShowLogForm(true)}
          className={cn(
            'self-start md:self-auto flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all',
            isDark ? 'plasma-gradient text-dark-bg' : 'signature-gradient text-white'
          )}
        >
          <Plus className="w-4 h-4" /> Log Activity
        </button>
      </header>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setFilterStatus(value); setOffset(0); }}
              className={cn(btnBase, filterStatus === value && btnActive)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search + Date */}
        <div className="flex gap-3 flex-wrap">
          <div
            className={cn(
              'flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2.5 rounded-xl border text-sm',
              isDark
                ? 'bg-white/5 border-white/10 text-dark-on-surface'
                : 'bg-surface-container-low border-outline-variant/20 text-on-surface'
            )}
          >
            <Search className="w-4 h-4 opacity-40 shrink-0" />
            <input
              className="bg-transparent flex-1 focus:outline-none placeholder:opacity-30 text-sm"
              placeholder="Search activities…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); setOffset(0); }}
            className={cn(
              'px-3 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none',
              isDark
                ? 'bg-white/5 border-white/10 text-dark-on-surface focus:ring-1 focus:ring-dark-primary/30'
                : 'bg-surface-container-low border-outline-variant/20 text-on-surface focus:ring-1 focus:ring-primary/20'
            )}
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className={cn('text-xs font-bold px-3 rounded-xl', btnBase)}
            >
              Clear
            </button>
          )}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                  filterTag === tag
                    ? isDark
                      ? 'bg-dark-primary/25 text-dark-primary border border-dark-primary/40'
                      : 'bg-primary/15 text-primary border border-primary/30'
                    : isDark
                    ? 'bg-white/5 text-dark-on-surface-variant/60 border border-white/10 hover:bg-white/10'
                    : 'bg-surface-container text-on-surface-variant/60 border border-outline-variant/20 hover:bg-surface-container-high'
                )}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className={cn('w-8 h-8 animate-spin', isDark ? 'text-dark-primary' : 'text-primary')}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center py-24 text-center',
            isDark ? 'text-dark-on-surface-variant' : 'text-on-surface-variant'
          )}
        >
          <HistoryIcon className="w-10 h-10 mb-4 opacity-20" />
          <p className="text-lg font-bold opacity-50">No activities found</p>
          <p className="text-sm opacity-30 mt-1">
            {search ? 'Try a different search term' : 'Log something to get started'}
          </p>
        </div>
      ) : (
        <motion.div className="space-y-3" layout>
          <AnimatePresence>
            {filtered.map((activity, i) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <ActivityCard
                  activity={activity}
                  isDark={isDark}
                  onComplete={(id) =>
                    updateActivity.mutate({ id, data: { status: 'completed' } })
                  }
                  onSkip={(id) =>
                    updateActivity.mutate({ id, data: { status: 'skipped' } })
                  }
                  onUndo={(id) =>
                    updateActivity.mutate({ id, data: { status: 'planned' } })
                  }
                  onDelete={(id) => deleteActivity.mutate(id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex justify-center gap-3 pt-4">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className={cn(btnBase, offset === 0 && 'opacity-30 cursor-not-allowed')}
          >
            Previous
          </button>
          <span
            className={cn('self-center text-xs font-bold opacity-50', isDark ? 'text-dark-on-surface' : 'text-on-surface')}
          >
            {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className={cn(btnBase, offset + PAGE_SIZE >= total && 'opacity-30 cursor-not-allowed')}
          >
            Next
          </button>
        </div>
      )}

      {/* Log Activity Modal */}
      <AnimatePresence>
        {showLogForm && (
          <LogActivityForm onClose={() => setShowLogForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
