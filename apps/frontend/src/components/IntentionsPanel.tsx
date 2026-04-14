/**
 * @file components/IntentionsPanel.tsx
 * @description Daily intentions / morning planner panel.
 *   Shows a checklist of user-defined intentions for today, stored in localStorage.
 *   Lightweight commitment layer — "what will you do today?"
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - hooks/useIntentions
 * - motion/react
 *
 * @relatedFiles
 * - components/Hub.tsx
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, ListChecks, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntentions } from '@/hooks/useIntentions';
import type { Theme } from '@/types/navigation';

// ── Props ─────────────────────────────────────────────────────────────────────

interface IntentionsPanelProps {
  isDark: boolean;
  theme: Theme;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Daily intentions panel — a compact checklist for today's commitments.
 * Data is persisted to localStorage keyed by today's date.
 */
export function IntentionsPanel({ isDark }: IntentionsPanelProps) {
  const {
    intentions,
    addIntention,
    toggleIntention,
    removeIntention,
    clearChecked,
    completedCount,
    totalCount,
  } = useIntentions();

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    if (!inputValue.trim()) return;
    addIntention(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  }

  const hasChecked = completedCount > 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks
            className={cn('w-4 h-4', isDark ? 'text-dark-primary' : 'text-primary')}
          />
          <h3
            className={cn(
              'text-[10px] font-bold tracking-[0.3em] uppercase',
              isDark ? 'text-dark-primary' : 'text-primary'
            )}
          >
            {isDark ? 'Mission Directives' : "Today's Intentions"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span
              className={cn(
                'text-[10px] font-black tabular-nums',
                allDone
                  ? isDark ? 'text-dark-primary' : 'text-primary'
                  : isDark ? 'text-dark-on-surface-variant/60' : 'text-on-surface-variant/60'
              )}
            >
              {completedCount}/{totalCount}
            </span>
          )}
          {hasChecked && (
            <button
              onClick={clearChecked}
              title="Clear completed"
              className={cn(
                'p-1 rounded-lg transition-all hover:scale-110',
                isDark
                  ? 'text-dark-on-surface-variant/40 hover:text-dark-on-surface-variant'
                  : 'text-on-surface-variant/40 hover:text-on-surface-variant'
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Add Input */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 mb-4 border transition-all focus-within:ring-1',
          isDark
            ? 'bg-white/5 border-white/10 focus-within:ring-dark-primary/30'
            : 'bg-surface-container-high border-outline-variant/20 focus-within:ring-primary/20'
        )}
      >
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={isDark ? 'Add directive…' : 'Add intention…'}
          className={cn(
            'flex-1 bg-transparent text-sm border-none focus:ring-0 py-0.5',
            isDark
              ? 'text-dark-on-surface placeholder:text-dark-on-surface-variant/40'
              : 'text-on-surface placeholder:text-on-surface-variant/40'
          )}
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className={cn(
            'p-1 rounded-lg transition-all active:scale-90',
            inputValue.trim()
              ? isDark
                ? 'text-dark-primary hover:bg-white/10'
                : 'text-primary hover:bg-primary/10'
              : 'opacity-30 cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Intentions List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {intentions.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'text-xs text-center py-4',
                isDark ? 'text-dark-on-surface-variant/40' : 'text-on-surface-variant/40'
              )}
            >
              {isDark ? 'No directives set for this cycle.' : 'No intentions set yet.'}
            </motion.p>
          ) : (
            intentions.map((intention) => (
              <motion.div
                key={intention.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group',
                  intention.checked
                    ? isDark
                      ? 'bg-dark-primary/5 border-dark-primary/10'
                      : 'bg-primary/5 border-primary/10'
                    : isDark
                    ? 'bg-white/3 border-white/5 hover:bg-white/5'
                    : 'bg-surface-container border-outline-variant/10 hover:bg-surface-container-high'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleIntention(intention.id)}
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all active:scale-90',
                    intention.checked
                      ? isDark
                        ? 'bg-dark-primary border-dark-primary'
                        : 'bg-primary border-primary'
                      : isDark
                      ? 'border-white/20 hover:border-dark-primary/50'
                      : 'border-outline-variant/40 hover:border-primary/50'
                  )}
                >
                  {intention.checked && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Text */}
                <span
                  className={cn(
                    'flex-1 text-sm font-medium transition-all',
                    intention.checked
                      ? 'line-through opacity-40'
                      : isDark
                      ? 'text-dark-on-surface'
                      : 'text-on-surface'
                  )}
                >
                  {intention.text}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeIntention(intention.id)}
                  className={cn(
                    'opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all hover:scale-110',
                    isDark
                      ? 'text-dark-on-surface-variant/40 hover:text-red-400'
                      : 'text-on-surface-variant/40 hover:text-red-500'
                  )}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* All done celebration */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'text-center py-3 rounded-xl text-xs font-bold',
                isDark ? 'text-dark-primary bg-dark-primary/10' : 'text-primary bg-primary/5'
              )}
            >
              {isDark ? 'All directives complete. Mission success.' : 'All intentions complete!'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
