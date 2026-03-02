/**
 * @file components/activities/LogActivityForm.tsx
 * @description Modal form for quickly logging a new activity.
 *   Used from TodayView (quick-log button) and ActivitiesList.
 *   Covers all activity types: quantity, duration, completion.
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 * - hooks/useActivities (useCreateActivity)
 * - hooks/useGoals (useGoals — for goal dropdown)
 * - services/api (ApiRequestError)
 *
 * @relatedFiles
 * - src/pages/TodayView.tsx
 * - src/hooks/useActivities.ts
 * - src/hooks/useGoals.ts
 */

import { useState, type FormEvent } from 'react';
import { useCreateActivity } from '../../hooks/useActivities.ts';
import { useGoals } from '../../hooks/useGoals.ts';
import { ApiRequestError } from '../../services/api.ts';
import type { ActivityType, ActivityStatus } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogActivityFormProps {
  /** Pre-fill the activity date (YYYY-MM-DD). Defaults to today. */
  defaultDate?: string;
  /** Pre-fill status. Defaults to 'completed' (most common for quick-log). */
  defaultStatus?: ActivityStatus;
  /** Called when form is dismissed without saving */
  onClose: () => void;
  /** Called after successful submission */
  onSuccess?: () => void;
}

interface FormState {
  title:        string;
  activityType: ActivityType;
  value:        string;
  unit:         string;
  goalId:       string;   // '' = no goal
  activityDate: string;
  status:       ActivityStatus;
  notes:        string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso() {
  return new Date().toISOString().split('T')[0] as string;
}

const TYPE_LABELS: Record<ActivityType, string> = {
  quantity:   'Quantity (reps, pages, km…)',
  duration:   'Duration (minutes, hours…)',
  completion: 'Completion (done / not done)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-screen modal overlay with the quick-log form.
 * Clicking the backdrop closes it.
 */
export function LogActivityForm({
  defaultDate   = todayIso(),
  defaultStatus = 'completed',
  onClose,
  onSuccess,
}: LogActivityFormProps) {
  const createActivity = useCreateActivity();
  const { data: goals = [] } = useGoals({ status: 'active' });

  const [form,  setForm]  = useState<FormState>({
    title:        '',
    activityType: 'quantity',
    value:        '',
    unit:         '',
    goalId:       '',
    activityDate: defaultDate,
    status:       defaultStatus,
    notes:        '',
  });
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  const needsValue = form.activityType !== 'completion';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (needsValue && form.value && isNaN(Number(form.value))) {
      setError('Value must be a number.'); return;
    }

    try {
      await createActivity.mutateAsync({
        title:        form.title.trim(),
        activityType: form.activityType,
        activityDate: form.activityDate,
        status:       form.status,
        ...(needsValue && form.value && { value: Number(form.value) }),
        ...(form.unit.trim()   && { unit:   form.unit.trim() }),
        ...(form.goalId        && { goalId: form.goalId }),
        ...(form.notes.trim()  && { notes:  form.notes.trim() }),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  // ——— Render ———
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Log activity</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 space-y-4">

          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-title">
              What did you do? <span className="text-red-400">*</span>
            </label>
            <input
              id="la-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Morning run, Read, Meditate"
              maxLength={200}
              autoFocus
              className={inputCls}
            />
          </div>

          {/* Activity type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-type">
                Type
              </label>
              <select
                id="la-type"
                value={form.activityType}
                onChange={(e) => set('activityType', e.target.value)}
                className={inputCls}
              >
                {(Object.keys(TYPE_LABELS) as ActivityType[]).map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-status">
                Status
              </label>
              <select
                id="la-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputCls}
              >
                <option value="completed">Completed</option>
                <option value="planned">Planned</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>

          {/* Value + Unit (quantity / duration only) */}
          {needsValue && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-value">
                  {form.activityType === 'duration' ? 'Duration' : 'Amount'}
                </label>
                <input
                  id="la-value"
                  type="number"
                  min={0}
                  step="any"
                  value={form.value}
                  onChange={(e) => set('value', e.target.value)}
                  placeholder="e.g. 5.2"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-unit">
                  Unit
                </label>
                <input
                  id="la-unit"
                  type="text"
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  placeholder={form.activityType === 'duration' ? 'min, hrs' : 'km, pages'}
                  maxLength={50}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* Goal + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-goal">
                Goal <span className="text-gray-600">(optional)</span>
              </label>
              <select
                id="la-goal"
                value={form.goalId}
                onChange={(e) => set('goalId', e.target.value)}
                className={inputCls}
              >
                <option value="">— none —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-date">
                Date
              </label>
              <input
                id="la-date"
                type="date"
                value={form.activityDate}
                onChange={(e) => set('activityDate', e.target.value)}
                className={`${inputCls} [color-scheme:dark]`}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-notes">
              Notes <span className="text-gray-600">(optional)</span>
            </label>
            <textarea
              id="la-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Any extra details…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createActivity.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createActivity.isPending ? 'Saving…' : 'Log activity'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
