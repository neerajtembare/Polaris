/**
 * @file components/activities/QuickLogModal.tsx
 * @description Compact (non-full-screen) quick-log modal triggered by the FAB.
 *   Voice → AI parse → confirm → done in a small focused dialog.
 *   "More options" opens the full LogActivityForm.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 *   - hooks/useActivities (useCreateActivity)
 *   - hooks/useGoals (useGoals)
 *   - hooks/useVoiceActivity (useVoiceStatus)
 *   - components/activities/AiSuggestionPanel
 *   - components/activities/LogActivityForm
 *   - components/ui/VoiceButton
 *   - services/api
 *
 * @relatedFiles
 *   - src/components/activities/FloatingLogButton.tsx
 *   - src/components/activities/LogActivityForm.tsx
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useCreateActivity } from '../../hooks/useActivities.ts';
import { useGoals } from '../../hooks/useGoals.ts';
import { useVoiceStatus } from '../../hooks/useVoiceActivity.ts';
import { api, ApiRequestError } from '../../services/api.ts';
import { AiSuggestionPanel } from './AiSuggestionPanel.tsx';
import { VoiceButton } from '../ui/VoiceButton.tsx';
import { LogActivityForm } from './LogActivityForm.tsx';
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

interface QuickLogModalProps {
  onClose: () => void;
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
 * Small centered modal for fast activity logging.
 * Does NOT take over the full screen — the current page remains visible behind it.
 */
export function QuickLogModal({ onClose }: QuickLogModalProps) {
  const [showFull,     setShowFull]     = useState(false);
  const [rawInput,     setRawInput]     = useState('');
  const [fields,       setFields]       = useState<QuickFields>({
    title: '', activityType: 'quantity', value: '', unit: '', goalId: '',
  });
  const [aiParsing,    setAiParsing]    = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIActivityParse | null>(null);
  const [aiError,      setAiError]      = useState<string | null>(null);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const createActivity = useCreateActivity();
  const { data: goals = [] }  = useGoals({ status: 'active' });
  const { data: voiceStatus } = useVoiceStatus();

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
      setAiError(err instanceof ApiRequestError ? err.message : 'AI unavailable.');
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
        ...(fields.unit.trim() ? { unit:   fields.unit.trim() }   : {}),
        ...(fields.goalId      ? { goalId: fields.goalId }         : {}),
        ...(rawInput.trim()    ? { rawInput: rawInput.trim() }     : {}),
      });
      onClose();
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  // ---------------------------------------------------------------------------
  // Render: full LogActivityForm mode
  // ---------------------------------------------------------------------------

  if (showFull) {
    return (
      <LogActivityForm
        onClose={onClose}
        onSuccess={onClose}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Render: compact modal
  // ---------------------------------------------------------------------------

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qlm-title"
    >
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 id="qlm-title" className="text-sm font-semibold text-white">Log activity</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFull(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              More options →
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-4 py-4 space-y-3">

          {submitError && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-xs text-red-300">
              {submitError}
            </div>
          )}

          {/* ── Description row ── */}
          <div className="flex items-start gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={rawInput}
              onChange={(e) => { setRawInput(e.target.value); setAiSuggestion(null); }}
              placeholder="What did you do? e.g. slept 2 hours, ran 5 km…"
              className="flex-1 bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none outline-none transition-colors"
            />
            <div className="flex flex-col gap-2 pt-0.5">
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
                  {aiParsing
                    ? <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    : '✨'}
                </button>
              )}
            </div>
          </div>

          {/* AI error */}
          {aiError && <p className="text-xs text-yellow-400">{aiError}</p>}

          {/* AI Suggestion Panel */}
          {aiSuggestion && (
            <AiSuggestionPanel
              suggestion={aiSuggestion}
              onApply={handleAiApply}
              onDismiss={() => setAiSuggestion(null)}
            />
          )}

          {/* ── Title ── */}
          <input
            type="text"
            value={fields.title || rawInput}
            onChange={(e) => setFields((p) => ({ ...p, title: e.target.value }))}
            placeholder="Activity title *"
            maxLength={200}
            className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />

          {/* ── Value / Unit / Goal row ── */}
          <div className="grid grid-cols-3 gap-2">
            {needsValue && (
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
            {needsValue && (
              <input
                type="text"
                value={fields.unit}
                onChange={(e) => setFields((p) => ({ ...p, unit: e.target.value }))}
                placeholder="Unit"
                className="bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition-colors"
              />
            )}
            <select
              value={fields.goalId}
              onChange={(e) => handleGoalChange(e.target.value)}
              className={[
                'bg-gray-800 border border-gray-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors',
                !needsValue ? 'col-span-3' : '',
              ].join(' ')}
            >
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createActivity.isPending}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {createActivity.isPending ? 'Saving…' : 'Log it'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
