/**
 * @file components/assistant/ToolConfirmCard.tsx
 * @description Confirmation card shown inside the AssistantPanel when TARS proposes
 *   a write action (log activity, plan activity, create goal).
 *   All fields are EDITABLE — user can correct what the AI got wrong before confirming.
 *   Write actions are NEVER executed without explicit user confirmation.
 *   High-confidence activity logs support optional auto-accept with countdown.
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - react (useEffect, useState, useRef, useCallback)
 * - stores/assistant.store.ts (TARSAction)
 * - hooks/useGoals.ts (for goal dropdown)
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistantActions.ts
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useGoals } from '@/hooks/useGoals';
import type { TARSAction, ActivityDraft, GoalDraft, GoalStatusDraft, ScreenId } from '@/stores/assistant.store';

// ---------------------------------------------------------------------------
// Common field styles
// ---------------------------------------------------------------------------

function fieldClass(isDark: boolean) {
  return cn(
    'w-full rounded-lg px-2.5 py-1.5 text-xs border outline-none transition-colors',
    isDark
      ? 'bg-white/[0.06] border-white/10 text-slate-100 focus:border-indigo-500/60 placeholder:text-slate-500'
      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-400 placeholder:text-slate-400'
  );
}

function labelClass(isDark: boolean) {
  return cn('text-[10px] font-medium uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-slate-500');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ToolConfirmCardProps {
  action:         TARSAction;
  isDark:         boolean;
  onAccept:       (action: TARSAction) => void;
  onDismiss:      () => void;
  /** If set, auto-accepts after this many ms with a visible countdown */
  autoAcceptMs?:  number;
  onNavigate?:    (screen: ScreenId) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ToolConfirmCard({
  action,
  isDark,
  onAccept,
  onDismiss,
  autoAcceptMs,
}: ToolConfirmCardProps) {
  // Editable working copy of the action — user can modify fields before confirming
  const [draft, setDraft] = useState<TARSAction>(action);

  // Sync draft if a new action comes in (e.g. TARS re-proposes)
  useEffect(() => { setDraft(action); }, [action]);

  // Auto-accept countdown
  const [msLeft, setMsLeft] = useState(autoAcceptMs ?? 0);
  const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const acceptRef           = useRef(onAccept);
  acceptRef.current         = onAccept;
  const draftRef            = useRef(draft);
  draftRef.current          = draft;

  useEffect(() => {
    if (!autoAcceptMs) return;
    setMsLeft(autoAcceptMs);
    const TICK = 100;
    intervalRef.current = setInterval(() => {
      setMsLeft((prev) => {
        if (prev <= TICK) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          acceptRef.current(draftRef.current);
          return 0;
        }
        return prev - TICK;
      });
    }, TICK);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAcceptMs]);

  const cancelAutoAccept = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setMsLeft(0);
  }, []);

  const handleAccept = () => { cancelAutoAccept(); onAccept(draft); };
  const handleDismiss = () => { cancelAutoAccept(); onDismiss(); };

  const countdownPct = autoAcceptMs && msLeft > 0 ? (msLeft / autoAcceptMs) * 100 : 0;
  const verbLabel =
    draft.type === 'log_activity'       ? 'Log Activity' :
    draft.type === 'plan_activity'      ? 'Plan Activity' :
    draft.type === 'create_goal'        ? 'Create Goal' :
    draft.type === 'update_goal_status' ? 'Update Goal Status' : 'Confirm';

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 text-sm flex flex-col gap-3',
        isDark ? 'bg-white/4 border-white/10' : 'bg-slate-50 border-slate-200 shadow-sm'
      )}
      // Any interaction cancels auto-accept
      onPointerDown={cancelAutoAccept}
    >
      <p className={labelClass(isDark)}>{verbLabel}</p>

      {/* Editable fields */}
      {(draft.type === 'log_activity' || draft.type === 'plan_activity') && (
        <ActivityFields
          draft={draft.draft}
          isDark={isDark}
          onChange={(updated) =>
            setDraft({ ...draft, draft: updated } as TARSAction)
          }
        />
      )}

      {draft.type === 'create_goal' && (
        <GoalFields
          draft={draft.draft}
          isDark={isDark}
          onChange={(updated) =>
            setDraft({ ...draft, draft: updated } as TARSAction)
          }
        />
      )}

      {draft.type === 'update_goal_status' && (
        <GoalStatusFields
          draft={draft.draft}
          isDark={isDark}
          onChange={(updated) =>
            setDraft({ ...draft, draft: updated } as TARSAction)
          }
        />
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className={cn(
            'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
            'transition-all active:scale-95 bg-indigo-600 text-white hover:bg-indigo-500'
          )}
        >
          {autoAcceptMs && msLeft > 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <rect x="1" y="1" width="98" height="98" rx="8" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
                strokeDasharray={`${countdownPct * 3.9} 390`} strokeLinecap="round" />
            </svg>
          )}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Accept
          {autoAcceptMs && msLeft > 0 && (
            <span className="opacity-75 text-[10px]">{Math.ceil(msLeft / 1000)}s</span>
          )}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/8' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          )}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity fields — editable form for log/plan activity
// ---------------------------------------------------------------------------

function ActivityFields({
  draft,
  isDark,
  onChange,
}: {
  draft:    ActivityDraft;
  isDark:   boolean;
  onChange: (d: ActivityDraft) => void;
}) {
  const { data: goals } = useGoals({ status: 'active' });

  const COMMON_UNITS = ['pages', 'km', 'miles', 'mins', 'hours', 'reps', 'sets', 'kg', 'lbs', 'steps', 'sessions'];

  const upd = (patch: { [K in keyof ActivityDraft]?: ActivityDraft[K] | undefined }) =>
    onChange({ ...draft, ...patch } as ActivityDraft);

  return (
    <div className="flex flex-col gap-2">
      {/* Title */}
      <div>
        <label className={cn('block mb-1', labelClass(isDark))}>Title</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => upd({ title: e.target.value })}
          className={fieldClass(isDark)}
          placeholder="Activity name"
        />
      </div>

      {/* Type + Value row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={cn('block mb-1', labelClass(isDark))}>Type</label>
          <select
            value={draft.activityType}
            onChange={(e) => upd({ activityType: e.target.value as ActivityDraft['activityType'] })}
            className={fieldClass(isDark)}
          >
            <option value="quantity">Quantity</option>
            <option value="duration">Duration</option>
            <option value="completion">Completion</option>
          </select>
        </div>
        {draft.activityType !== 'completion' && (
          <div className="w-20">
            <label className={cn('block mb-1', labelClass(isDark))}>Value</label>
            <input
              type="number"
              value={draft.value ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) { upd({ value: undefined }); return; }
                const num = Number(raw);
                if (!isNaN(num) && num >= 0) upd({ value: num });
              }}
              className={fieldClass(isDark)}
              placeholder="0"
              min={0}
            />
          </div>
        )}
        {draft.activityType !== 'completion' && (
          <div className="w-24">
            <label className={cn('block mb-1', labelClass(isDark))}>Unit</label>
            <select
              value={draft.unit ?? ''}
              onChange={(e) => upd({ unit: e.target.value || undefined })}
              className={fieldClass(isDark)}
            >
              <option value="">—</option>
              {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Goal selector */}
      <div>
        <label className={cn('block mb-1', labelClass(isDark))}>Goal (optional)</label>
        <select
          value={draft.goalId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            const title = goals?.find((g) => g.id === id)?.title ?? null;
            upd({ goalId: id, goalTitle: title });
          }}
          className={fieldClass(isDark)}
        >
          <option value="">No goal</option>
          {goals?.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goal fields — editable form for create_goal
// ---------------------------------------------------------------------------

function GoalFields({
  draft,
  isDark,
  onChange,
}: {
  draft:    GoalDraft;
  isDark:   boolean;
  onChange: (d: GoalDraft) => void;
}) {
  const upd = (patch: { [K in keyof GoalDraft]?: GoalDraft[K] | undefined }) =>
    onChange({ ...draft, ...patch } as GoalDraft);

  return (
    <div className="flex flex-col gap-2">
      {/* Title */}
      <div>
        <label className={cn('block mb-1', labelClass(isDark))}>Goal title</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => upd({ title: e.target.value })}
          className={fieldClass(isDark)}
          placeholder="e.g. Read 24 books this year"
        />
      </div>

      {/* Timeframe + Target value */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={cn('block mb-1', labelClass(isDark))}>Timeframe</label>
          <select
            value={draft.timeframe}
            onChange={(e) => upd({ timeframe: e.target.value as GoalDraft['timeframe'] })}
            className={fieldClass(isDark)}
          >
            <option value="long">Long-term</option>
            <option value="medium">Medium-term</option>
            <option value="short">Short-term</option>
          </select>
        </div>
        <div className="w-20">
          <label className={cn('block mb-1', labelClass(isDark))}>Target</label>
          <input
            type="number"
            value={draft.targetValue ?? ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) { upd({ targetValue: undefined }); return; }
              const num = Number(raw);
              if (!isNaN(num) && num >= 0) upd({ targetValue: num });
            }}
            className={fieldClass(isDark)}
            placeholder="—"
            min={0}
          />
        </div>
        <div className="w-24">
          <label className={cn('block mb-1', labelClass(isDark))}>Unit</label>
          <input
            type="text"
            value={draft.targetUnit ?? ''}
            onChange={(e) => upd({ targetUnit: e.target.value || undefined })}
            className={fieldClass(isDark)}
            placeholder="books"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goal Status Fields
// ---------------------------------------------------------------------------

interface GoalStatusFieldsProps {
  draft:    GoalStatusDraft;
  isDark:   boolean;
  onChange: (updated: GoalStatusDraft) => void;
}

function GoalStatusFields({ draft, isDark, onChange }: GoalStatusFieldsProps) {
  const upd = (patch: Partial<GoalStatusDraft>) => onChange({ ...draft, ...patch });

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className={cn('block mb-1', labelClass(isDark))}>Goal</label>
        <p className={cn('text-xs font-medium px-2.5 py-1.5 rounded-lg border', isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-800')}>
          {draft.goalTitle ?? `Goal ID: ${draft.goalId}`}
        </p>
      </div>

      <div>
        <label className={cn('block mb-1', labelClass(isDark))}>Target Status</label>
        <select
          value={draft.status}
          onChange={(e) => upd({ status: e.target.value as GoalStatusDraft['status'] })}
          className={fieldClass(isDark)}
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  );
}


