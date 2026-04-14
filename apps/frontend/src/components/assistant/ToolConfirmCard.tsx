/**
 * @file components/assistant/ToolConfirmCard.tsx
 * @description Confirmation card shown inside the AssistantPanel when TARS proposes
 *   a write action (log activity, plan activity, create goal).
 *   Write actions are NEVER executed without explicit user confirmation.
 *   High-confidence activity logs support optional auto-accept with countdown.
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - react (useEffect, useState, useRef)
 * - stores/assistant.store.ts (TARSAction)
 * - hooks/useAssistantActions.ts
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistantActions.ts
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TARSAction, ActivityDraft, GoalDraft, ScreenId } from '@/stores/assistant.store';

interface ToolConfirmCardProps {
  action:         TARSAction;
  isDark:         boolean;
  onAccept:       (action: TARSAction) => void;
  onDismiss:      () => void;
  /** If set, auto-accepts after this many ms with a visible countdown ring */
  autoAcceptMs?:  number;
  onNavigate?:    (screen: ScreenId) => void;
}

export function ToolConfirmCard({
  action,
  isDark,
  onAccept,
  onDismiss,
  autoAcceptMs,
}: ToolConfirmCardProps) {
  const [msLeft, setMsLeft]   = useState(autoAcceptMs ?? 0);
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const acceptRef             = useRef(onAccept);
  acceptRef.current           = onAccept;

  // Auto-accept countdown
  useEffect(() => {
    if (!autoAcceptMs) return;
    setMsLeft(autoAcceptMs);
    const TICK = 100;
    intervalRef.current = setInterval(() => {
      setMsLeft((prev) => {
        if (prev <= TICK) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          acceptRef.current(action);
          return 0;
        }
        return prev - TICK;
      });
    }, TICK);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAcceptMs]);

  const cancelAutoAccept = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMsLeft(0);
  }, []);

  const handleAccept = () => {
    cancelAutoAccept();
    onAccept(action);
  };

  const handleDismiss = () => {
    cancelAutoAccept();
    onDismiss();
  };

  const countdownPct = autoAcceptMs && msLeft > 0
    ? (msLeft / autoAcceptMs) * 100
    : 0;

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 text-sm',
        isDark
          ? 'bg-white/4 border-white/10'
          : 'bg-slate-50 border-slate-200 shadow-sm'
      )}
    >
      {/* Action summary */}
      <ActionSummary action={action} isDark={isDark} />

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-3">
        {/* Accept */}
        <button
          type="button"
          onClick={handleAccept}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'transition-all active:scale-95',
            'bg-indigo-600 text-white hover:bg-indigo-500'
          )}
        >
          {/* Countdown ring overlay */}
          {autoAcceptMs && msLeft > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <rect
                x="1" y="1" width="98" height="98" rx="8"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                strokeDasharray={`${countdownPct * 3.9} 390`}
                strokeLinecap="round"
              />
            </svg>
          )}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Accept
          {autoAcceptMs && msLeft > 0 && (
            <span className="opacity-75 text-[10px]">
              {Math.ceil(msLeft / 1000)}s
            </span>
          )}
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-white/8'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          )}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action summary — human-readable card body
// ---------------------------------------------------------------------------

function ActionSummary({ action, isDark }: { action: TARSAction; isDark: boolean }) {
  const label = isDark ? 'text-slate-400' : 'text-slate-500';
  const value = isDark ? 'text-slate-100' : 'text-slate-800';

  if (action.type === 'log_activity' || action.type === 'plan_activity') {
    const verb = action.type === 'log_activity' ? 'Log activity' : 'Plan activity';
    return <ActivitySummary verb={verb} draft={action.draft} label={label} value={value} />;
  }

  if (action.type === 'create_goal') {
    return <GoalSummary draft={action.draft} label={label} value={value} />;
  }

  // Fallback for unexpected action types
  return (
    <p className={`text-xs ${value}`}>Confirm action: {action.type}</p>
  );
}

function ActivitySummary({
  verb,
  draft,
  label,
  value,
}: {
  verb:  string;
  draft: ActivityDraft;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className={`text-[11px] font-medium uppercase tracking-wider ${label}`}>{verb}</p>
      <p className={`font-semibold ${value}`}>{draft.title}</p>
      {(draft.value !== undefined || draft.unit) && (
        <p className={`text-xs ${label}`}>
          {draft.value !== undefined ? draft.value : '—'}
          {draft.unit ? ` ${draft.unit}` : ''}
        </p>
      )}
      {draft.goalTitle && (
        <p className={`text-xs ${label}`}>Goal: {draft.goalTitle}</p>
      )}
    </div>
  );
}

function GoalSummary({
  draft,
  label,
  value,
}: {
  draft: GoalDraft;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <p className={`text-[11px] font-medium uppercase tracking-wider ${label}`}>Create goal</p>
      <p className={`font-semibold ${value}`}>{draft.title}</p>
      <p className={`text-xs ${label}`}>
        {draft.timeframe}
        {draft.targetValue !== undefined
          ? ` · target ${draft.targetValue}${draft.targetUnit ? ` ${draft.targetUnit}` : ''}`
          : ''}
      </p>
    </div>
  );
}
