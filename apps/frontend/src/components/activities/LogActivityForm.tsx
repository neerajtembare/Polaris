/**
 * @file components/activities/LogActivityForm.tsx
 * @description Modal form for quickly logging a new activity.
 *   Supports:
 *   - Voice input via mic button → Whisper transcription → AI parse → pre-fill
 *   - AI parse via rawInput → AiSuggestionPanel review → one-click apply
 *   - Goal selection with auto-fill of unit + activity type
 *   - Recent activity title chips (per goal)
 *   - Unit picker with preset chips
 *
 * @module @polaris/frontend/components/activities
 *
 * @relatedFiles
 *   - src/pages/TodayView.tsx
 *   - src/hooks/useActivities.ts
 *   - src/hooks/useGoals.ts
 *   - src/components/activities/AiSuggestionPanel.tsx
 */

import { useState, useCallback, type FormEvent } from 'react';
import { useCreateActivity, useActivities } from '../../hooks/useActivities.ts';
import { useGoals } from '../../hooks/useGoals.ts';
import { api, ApiRequestError } from '../../services/api.ts';
import { UnitPicker } from '../ui/UnitPicker.tsx';
import { inferActivityType } from '../../lib/units.ts';
import { AiSuggestionPanel } from './AiSuggestionPanel.tsx';
import { VoiceButton } from '../ui/VoiceButton.tsx';
import { useVoiceStatus } from '../../hooks/useVoiceActivity.ts';
import type { ActivityType, ActivityStatus, ApiSuccess, AIActivityParse } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogActivityFormProps {
  defaultDate?:   string;
  defaultStatus?: ActivityStatus;
  onClose:        () => void;
  onSuccess?:     () => void;
}

interface FormState {
  title:        string;
  activityType: ActivityType;
  value:        string;
  unit:         string;
  goalId:       string;
  activityDate: string;
  status:       ActivityStatus;
  notes:        string;
  rawInput:     string;
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
  const { data: voiceStatus } = useVoiceStatus();

  const [form,  setForm]  = useState<FormState>({
    title:        '',
    activityType: 'quantity',
    value:        '',
    unit:         '',
    goalId:       '',
    activityDate: defaultDate,
    status:       defaultStatus,
    notes:        '',
    rawInput:     '',
  });
  const [error,       setError]       = useState<string | null>(null);
  const [aiParsing,   setAiParsing]   = useState(false);
  const [aiError,     setAiError]     = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIActivityParse | null>(null);

  // Fetch recent completed activities for the selected goal to show title chips.
  // Only fires when a goal is selected — avoids a full-scan on modal open.
  const { data: recentActivitiesData } = useActivities(
    { goalId: form.goalId || undefined, status: 'completed', limit: 20 },
    { enabled: Boolean(form.goalId) }
  );
  const recentTitles: string[] = form.goalId
    ? [...new Set(
        (recentActivitiesData?.data ?? []).map((a) => a.title)
      )].slice(0, 5)
    : [];

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  /** When user picks a goal, auto-fill unit + infer activityType from goal's targetUnit */
  function handleGoalChange(goalId: string) {
    const selectedGoal = goals.find((g) => g.id === goalId);
    const unit = selectedGoal?.targetUnit ?? '';
    const inferredType = inferActivityType(unit);
    setForm((prev) => ({ ...prev, goalId, unit, activityType: inferredType }));
    if (error) setError(null);
  }

  // ---------------------------------------------------------------------------
  // AI parse
  // ---------------------------------------------------------------------------

  async function handleAiParse() {
    if (!form.rawInput.trim()) return;
    setAiParsing(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const res = await api.post<ApiSuccess<AIActivityParse>>(
        '/ai/parse-activity',
        { rawInput: form.rawInput.trim() }
      );
      setAiSuggestion(res.data);
    } catch (err) {
      setAiError(
        err instanceof ApiRequestError
          ? err.message
          : 'AI unavailable — fill the form manually.'
      );
    } finally {
      setAiParsing(false);
    }
  }

  /** Apply AI suggestion to form fields */
  function handleAiApply(suggestion: AIActivityParse) {
    setForm((prev) => ({
      ...prev,
      title:        suggestion.title,
      activityType: suggestion.activityType,
      value:        suggestion.value !== null ? String(suggestion.value) : prev.value,
      unit:         suggestion.unit ?? prev.unit,
      goalId:       suggestion.suggestedGoalId ?? prev.goalId,
    }));
    setAiSuggestion(null);
  }

  /**
   * Called by VoiceButton when voice → transcribe → AI parse completes.
   * Populates rawInput with the transcript so it's visible, then applies
   * the parsed fields to the form (same result as clicking "Parse with AI").
   */
  const handleVoiceResult = useCallback(
    (transcript: string, parsed: AIActivityParse) => {
      set('rawInput', transcript);
      handleAiApply(parsed);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

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
        ...(form.unit.trim()     && { unit:     form.unit.trim() }),
        ...(form.goalId          && { goalId:   form.goalId }),
        ...(form.notes.trim()    && { notes:    form.notes.trim() }),
        ...(form.rawInput.trim() && { rawInput: form.rawInput.trim() }),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]">

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

        <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 space-y-4">

          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ── Raw input + AI parse button ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400" htmlFor="la-raw">
                Describe what you did{' '}
                <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                {/* Voice button — always shown; disabled with tooltip if Whisper not running */}
                <VoiceButton
                  onResult={handleVoiceResult}
                  available={voiceStatus?.available ?? false}
                />
                {form.rawInput.trim() && (
                  <button
                    type="button"
                    onClick={() => void handleAiParse()}
                    disabled={aiParsing}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-700/60 text-indigo-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {aiParsing ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        Parsing…
                      </>
                    ) : (
                      <>✨ Parse with AI</>
                    )}
                  </button>
                )}
              </div>
            </div>
            <textarea
              id="la-raw"
              value={form.rawInput}
              onChange={(e) => set('rawInput', e.target.value)}
              rows={2}
              placeholder='Try: read 30 pages, ran 5km, saved ₹500'
              className={`${inputCls} resize-none`}
              autoFocus
            />
            {!form.rawInput.trim() && (
              <p className="mt-1 text-xs text-gray-600">
                Type naturally — ✨ AI parse button appears when you start typing.
              </p>
            )}
          </div>

          {/* ── AI error ── */}
          {aiError && (
            <div className="rounded-lg bg-yellow-950/60 border border-yellow-800/60 px-3 py-2 text-xs text-yellow-300">
              {aiError}
            </div>
          )}

          {/* ── AI suggestion review panel ── */}
          {aiSuggestion && (
            <AiSuggestionPanel
              suggestion={aiSuggestion}
              onApply={handleAiApply}
              onDismiss={() => setAiSuggestion(null)}
            />
          )}

          {/* ── Title ── */}
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
              className={inputCls}
            />

            {/* Recent title chips */}
            {recentTitles.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 mb-1.5">Recent:</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentTitles.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => set('title', title)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-white transition-colors"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Activity type + Status ── */}
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

          {/* ── Value + Unit ── */}
          {needsValue && (
            <div className="space-y-3">
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
                  placeholder="e.g. 5"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Unit</label>
                <UnitPicker
                  value={form.unit}
                  onChange={(unit) => {
                    const inferred = inferActivityType(unit);
                    setForm((prev) => ({ ...prev, unit, activityType: inferred }));
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Goal ── */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1" htmlFor="la-goal">
              Goal <span className="text-gray-600">(optional)</span>
            </label>
            <select
              id="la-goal"
              value={form.goalId}
              onChange={(e) => handleGoalChange(e.target.value)}
              className={inputCls}
            >
              <option value="">— none —</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
            {form.goalId && goals.find((g) => g.id === form.goalId)?.targetUnit && (
              <p className="mt-1 text-xs text-indigo-400">
                Unit and type pre-filled from goal
              </p>
            )}
          </div>

          {/* ── Date ── */}
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

          {/* ── Notes ── */}
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

          {/* ── Actions ── */}
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
