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
import { useCreateActivity, useUpdateActivity, useActivities } from '../../hooks/useActivities.ts';
import { useGoals } from '../../hooks/useGoals.ts';
import { api, ApiRequestError } from '../../services/api.ts';
import { UnitPicker } from '../ui/UnitPicker.tsx';
import { inferActivityType } from '../../lib/units.ts';
import { AiSuggestionPanel } from './AiSuggestionPanel.tsx';
import { VoiceButton } from '../ui/VoiceButton.tsx';
import { useVoiceStatus } from '../../hooks/useVoiceActivity.ts';
import type { ActivityType, ActivityStatus, ApiSuccess, AIActivityParse, ListedActivity } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogActivityFormProps {
  defaultDate?:    string;
  defaultStatus?:  ActivityStatus;
  /** When provided, form is in edit mode: pre-fills all fields and PATCHes on submit */
  editActivity?:   ListedActivity;
  onClose:         () => void;
  onSuccess?:      () => void;
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
  tags:         string[];
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
 * Pass `editActivity` to enter edit mode — all fields pre-filled, submit sends PATCH.
 */
export function LogActivityForm({
  defaultDate   = todayIso(),
  defaultStatus = 'completed',
  editActivity,
  onClose,
  onSuccess,
}: LogActivityFormProps) {
  const isEditMode     = Boolean(editActivity);
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const { data: goals = [] } = useGoals({ status: 'active' });
  const { data: voiceStatus } = useVoiceStatus();

  const [form,  setForm]  = useState<FormState>({
    title:        editActivity?.title        ?? '',
    activityType: editActivity?.activityType ?? 'quantity',
    value:        editActivity?.value        != null ? String(editActivity.value) : '',
    unit:         editActivity?.unit         ?? '',
    goalId:       editActivity?.goalId       ?? '',
    activityDate: editActivity?.activityDate ?? defaultDate,
    status:       editActivity?.status       ?? defaultStatus,
    notes:        editActivity?.notes        ?? '',
    rawInput:     '',
    tags:         editActivity?.tags         ?? [],
  });
  const [tagInput, setTagInput] = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [aiParsing,   setAiParsing]   = useState(false);
  const [aiError,     setAiError]     = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIActivityParse | null>(null);

  // Fetch recent completed activities for the selected goal to show title chips.
  // Only fires when a goal is selected — avoids a full-scan on modal open.
  const { data: recentActivitiesData } = useActivities(
    { ...(form.goalId ? { goalId: form.goalId } : {}), status: 'completed', limit: 20 },
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

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (!tag || form.tags.includes(tag)) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
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
   * Populates rawInput with the transcript so it's visible, then shows
   * the AiSuggestionPanel for the user to review — same flow as manual parse.
   * The user must click "Apply" to confirm before fields are overwritten.
   */
  const handleVoiceResult = useCallback(
    (transcript: string, parsed: AIActivityParse) => {
      set('rawInput', transcript);
      setAiSuggestion(parsed);
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
    if (needsValue && !form.value.trim()) {
      setError(`${form.activityType === 'duration' ? 'Duration' : 'Amount'} is required for ${form.activityType} activities.`);
      return;
    }
    if (needsValue && form.value && isNaN(Number(form.value))) {
      setError('Value must be a number.'); return;
    }

    try {
      if (isEditMode && editActivity) {
        // Edit mode — PATCH existing activity
        await updateActivity.mutateAsync({
          id:   editActivity.id,
          data: {
            title:        form.title.trim(),
            activityType: form.activityType,
            activityDate: form.activityDate,
            status:       form.status,
            value:        needsValue && form.value ? Number(form.value) : null,
            unit:         form.unit.trim()  || null,
            goalId:       form.goalId       || null,
            notes:        form.notes.trim() || null,
            tags:         form.tags,
          },
        });
      } else {
        // Create mode
        await createActivity.mutateAsync({
          title:        form.title.trim(),
          activityType: form.activityType,
          activityDate: form.activityDate,
          status:       form.status,
          tags:         form.tags,
          ...(needsValue && form.value && { value: Number(form.value) }),
          ...(form.unit.trim()     && { unit:     form.unit.trim() }),
          ...(form.goalId          && { goalId:   form.goalId }),
          ...(form.notes.trim()    && { notes:    form.notes.trim() }),
          ...(form.rawInput.trim() && { rawInput: form.rawInput.trim() }),
        });
      }
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-activity-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-dark-surface-container-low border border-outline-variant/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant/10 dark:border-white/5">
          <h2 id="log-activity-title" className="text-base font-semibold text-on-surface dark:text-dark-on-surface">
            {isEditMode ? 'Edit activity' : 'Log activity'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant dark:text-dark-on-surface-variant opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-5 py-4 space-y-4">

          {error && (
            <div className="rounded-lg bg-red-500/10 dark:bg-red-950 border border-red-500/30 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          {/* ── Raw input + AI parse button — only in create mode ── */}
          {!isEditMode && (
            <>
            <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant" htmlFor="la-raw">
                Describe what you did{' '}
                <span className="opacity-60 font-normal">(optional)</span>
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
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 dark:bg-dark-primary/10 hover:bg-primary/20 dark:hover:bg-dark-primary/20 border border-primary/30 dark:border-dark-primary/30 text-primary dark:text-dark-primary text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
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
            />
            {!form.rawInput.trim() && (
              <p className="mt-1 text-xs text-on-surface-variant dark:text-dark-on-surface-variant opacity-50">
                Type naturally — ✨ AI parse button appears when you start typing.
              </p>
            )}
          </div>

          {/* ── AI error ── */}
          {aiError && (
            <div className="rounded-lg bg-yellow-500/10 dark:bg-yellow-950/60 border border-yellow-500/30 dark:border-yellow-800/60 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
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
            </>
          )} {/* end !isEditMode */}

          {/* ── Title ── */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-title">
              What did you do? <span className="text-red-500">*</span>
            </label>
            <input
              id="la-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Morning run, Read, Meditate"
              maxLength={200}
              autoFocus={isEditMode}
              className={inputCls}
            />

            {/* Recent title chips */}
            {recentTitles.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-on-surface-variant dark:text-dark-on-surface-variant opacity-50 mb-1.5">Recent:</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentTitles.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => set('title', title)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border bg-surface-container dark:bg-white/5 border-outline-variant/20 dark:border-white/10 text-on-surface dark:text-dark-on-surface hover:border-primary dark:hover:border-dark-primary transition-colors"
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
              <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-type">
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
              <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-status">
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
                <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-value">
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
                <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1">Unit</label>
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
            <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-goal">
              Goal <span className="opacity-50">(optional)</span>
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
              <p className="mt-1 text-xs text-primary dark:text-dark-primary">
                Unit and type pre-filled from goal
              </p>
            )}
          </div>

          {/* ── Date ── */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-date">
              Date
            </label>
            <input
              id="la-date"
              type="date"
              value={form.activityDate}
              onChange={(e) => set('activityDate', e.target.value)}
              className={inputCls}
            />
          </div>

          {/* ── Notes ── */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1" htmlFor="la-notes">
              Notes <span className="opacity-50">(optional)</span>
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

          {/* ── Tags ── */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant mb-1">
              Tags <span className="opacity-50">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 dark:bg-dark-primary/15 text-primary dark:text-dark-primary border border-primary/20 dark:border-dark-primary/25"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="opacity-50 hover:opacity-100 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder="Type a tag and press Enter…"
              className={inputCls}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-on-surface-variant dark:text-dark-on-surface-variant opacity-60 hover:opacity-100 transition-opacity"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createActivity.isPending || updateActivity.isPending}
              className="px-5 py-2 bg-primary dark:bg-dark-primary text-white dark:text-dark-bg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold rounded-lg transition-colors hover:opacity-90"
            >
              {createActivity.isPending || updateActivity.isPending
                ? 'Saving…'
                : isEditMode ? 'Save changes' : 'Log activity'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface-container-low dark:bg-white/5 border border-outline-variant/20 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-dark-on-surface placeholder-on-surface-variant/40 dark:placeholder-dark-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-dark-primary/30 focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]';
