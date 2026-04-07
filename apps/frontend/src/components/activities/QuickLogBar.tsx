/**
 * @file components/activities/QuickLogBar.tsx
 * @description Inline collapsible quick-log bar for TodayView.
 *   Expands in-place with a voice/AI-first input flow.
 *   No modal, no navigation — type or speak, confirm, done.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 *   - hooks/useActivities (useCreateActivity)
 *   - hooks/useGoals (useGoals)
 *   - hooks/useVoiceActivity (useVoiceStatus)
 *   - components/activities/AiSuggestionPanel
 *   - components/ui/VoiceButton
 *   - services/api
 *
 * @relatedFiles
 *   - src/pages/TodayView.tsx
 *   - src/components/activities/LogActivityForm.tsx
 */

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useCreateActivity } from '../../hooks/useActivities.ts';
import { useGoals } from '../../hooks/useGoals.ts';
import { useVoiceStatus } from '../../hooks/useVoiceActivity.ts';
import { api, ApiRequestError } from '../../services/api.ts';
import { AiSuggestionPanel } from './AiSuggestionPanel.tsx';
import { VoiceButton } from '../ui/VoiceButton.tsx';
import { inferActivityType } from '../../lib/units.ts';
import type { ActivityType, ApiSuccess, AIActivityParse } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickFields {
  title:        string;
  activityType: ActivityType;
  value:        string;
  unit:         string;
  goalId:       string;
}

interface QuickLogBarProps {
  /** Called after a successful activity creation */
  onSuccess?: () => void;
  /** Open the full-form modal for advanced entry */
  onOpenFullForm: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso() {
  return new Date().toISOString().split('T')[0] as string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Inline collapsible log bar.
 * Collapsed: a single "What did you do today?" prompt row with a mic icon.
 * Expanded: description input, AI parse, voice, goal selector, submit.
 */
export function QuickLogBar({ onSuccess, onOpenFullForm }: QuickLogBarProps) {
  const [expanded,     setExpanded]     = useState(false);
  const [rawInput,     setRawInput]     = useState('');
  const [fields,       setFields]       = useState<QuickFields>({
    title: '', activityType: 'quantity', value: '', unit: '', goalId: '',
  });
  const [aiParsing,    setAiParsing]    = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIActivityParse | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const createActivity = useCreateActivity();
  const { data: goals = [] }      = useGoals({ status: 'active' });
  const { data: voiceStatus }     = useVoiceStatus();

  // Focus input when expanded
  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function reset() {
    setRawInput('');
    setFields({ title: '', activityType: 'quantity', value: '', unit: '', goalId: '' });
    setAiSuggestion(null);
    setAiError(null);
    setSubmitError(null);
    setAiParsing(false);
  }

  function collapse() {
    reset();
    setExpanded(false);
  }

  // ---------------------------------------------------------------------------
  // AI parse
  // ---------------------------------------------------------------------------

  async function handleAiParse() {
    const text = rawInput.trim();
    if (!text) return;
    setAiParsing(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await api.post<ApiSuccess<AIActivityParse>>('/ai/parse-activity', { rawInput: text });
      setAiSuggestion(res.data);
    } catch (err) {
      setAiError(
        err instanceof ApiRequestError ? err.message : 'AI unavailable — fill manually.',
      );
    } finally {
      setAiParsing(false);
    }
  }

  function handleAiApply(suggestion: AIActivityParse) {
    setFields({
      title:        suggestion.title,
      activityType: suggestion.activityType,
      value:        suggestion.value !== null ? String(suggestion.value) : '',
      unit:         suggestion.unit ?? '',
      goalId:       suggestion.suggestedGoalId ?? '',
    });
    setAiSuggestion(null);
  }

  /** Voice pipeline result handler — show suggestion panel (not auto-apply) */
  function handleVoiceResult(transcript: string, parsed: AIActivityParse) {
    setRawInput(transcript);
    setAiSuggestion(parsed);
  }

  // ---------------------------------------------------------------------------
  // Goal change
  // ---------------------------------------------------------------------------

  function handleGoalChange(goalId: string) {
    const goal = goals.find((g) => g.id === goalId);
    const unit  = goal?.targetUnit ?? '';
    setFields((prev) => ({
      ...prev,
      goalId,
      unit,
      activityType: unit ? inferActivityType(unit) : prev.activityType,
    }));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const needsValue = fields.activityType !== 'completion';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const title = fields.title.trim() || rawInput.trim();
    if (!title) { setSubmitError('Describe what you did.'); return; }
    if (needsValue && fields.value && isNaN(Number(fields.value))) {
      setSubmitError('Amount must be a number.'); return;
    }

    try {
      await createActivity.mutateAsync({
        title,
        activityType: fields.activityType,
        activityDate: todayIso(),
        status:       'completed',
        ...(needsValue && fields.value ? { value: Number(fields.value) } : {}),
        ...(fields.unit.trim()   ? { unit:   fields.unit.trim() }   : {}),
        ...(fields.goalId        ? { goalId: fields.goalId }         : {}),
        ...(rawInput.trim()      ? { rawInput: rawInput.trim() }     : {}),
      });
      collapse();
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  /** Allow Escape to collapse */
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') collapse();
  }

  // ---------------------------------------------------------------------------
  // Collapsed state — single prompt row
  // ---------------------------------------------------------------------------

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-700/60 rounded-xl text-left transition-colors group"
        aria-label="Log a new activity"
      >
        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-500 text-white text-sm font-bold transition-colors">
          +
        </span>
        <span className="text-sm text-gray-500 group-hover:text-gray-300 transition-colors">
          What did you do today?
        </span>
        <span className="ml-auto text-xs text-gray-600 group-hover:text-indigo-400 transition-colors font-medium">
          Log activity
        </span>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Expanded state
  // ---------------------------------------------------------------------------

  return (
    <div
      className="bg-gray-900 border border-indigo-700/40 rounded-xl shadow-lg overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Bar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <p className="text-sm font-medium text-white">Log activity</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            More options →
          </button>
          <button
            type="button"
            onClick={collapse}
            aria-label="Close"
            className="text-gray-500 hover:text-white transition-colors ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="px-4 py-3 space-y-3">

        {/* Submit error */}
        {submitError && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-xs text-red-300">
            {submitError}
          </div>
        )}

        {/* ── Description + AI parse + Voice ── */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <textarea
              ref={inputRef}
              rows={2}
              value={rawInput}
              onChange={(e) => { setRawInput(e.target.value); setAiSuggestion(null); }}
              placeholder="Describe what you did… e.g. slept for 2 hours, read 30 pages"
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none outline-none transition-colors"
            />
            <div className="flex flex-col gap-2">
              <VoiceButton
                onResult={handleVoiceResult}
                available={voiceStatus?.available ?? false}
              />
              {rawInput.trim() && (
                <button
                  type="button"
                  onClick={() => void handleAiParse()}
                  disabled={aiParsing}
                  title="Parse with AI"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-700/60 text-indigo-300 text-sm transition-colors disabled:opacity-50"
                >
                  {aiParsing ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    '✨'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* AI error */}
          {aiError && (
            <p className="text-xs text-yellow-400 mt-1">{aiError}</p>
          )}
        </div>

        {/* ── AI Suggestion Panel ── */}
        {aiSuggestion && (
          <AiSuggestionPanel
            suggestion={aiSuggestion}
            onApply={handleAiApply}
            onDismiss={() => setAiSuggestion(null)}
          />
        )}

        {/* ── Title (shown when AI has set it or user typed) ── */}
        {(fields.title || aiSuggestion === null) && (
          <input
            type="text"
            value={fields.title || rawInput}
            onChange={(e) => setFields((p) => ({ ...p, title: e.target.value }))}
            placeholder="Activity title *"
            maxLength={200}
            className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />
        )}

        {/* ── Quick fields row: value · unit · goal ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* Value */}
          {fields.activityType !== 'completion' && (
            <input
              type="number"
              min={0}
              step="any"
              value={fields.value}
              onChange={(e) => setFields((p) => ({ ...p, value: e.target.value }))}
              placeholder="Amount"
              className="bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          )}

          {/* Unit (free text) */}
          {fields.activityType !== 'completion' && (
            <input
              type="text"
              value={fields.unit}
              onChange={(e) => setFields((p) => ({ ...p, unit: e.target.value }))}
              placeholder="Unit"
              className="bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
            />
          )}

          {/* Goal select */}
          <select
            value={fields.goalId}
            onChange={(e) => handleGoalChange(e.target.value)}
            className={[
              'bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors',
              fields.activityType === 'completion' ? 'col-span-3' : '',
            ].join(' ')}
          >
            <option value="">No goal</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={collapse}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createActivity.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {createActivity.isPending ? 'Saving…' : 'Log it'}
          </button>
        </div>

      </form>
    </div>
  );
}
