/**
 * @file components/activities/AiSuggestionPanel.tsx
 * @description Review panel shown after the AI parses a rawInput description.
 *   Displays each suggested field with a confidence badge.
 *   User can "Apply suggestions" (auto-fills form) or "Dismiss" (hides panel).
 *   This is the "beta testing" UX for AI — the user always reviews before saving.
 *
 * @module @polaris/frontend/components/activities
 *
 * @dependencies
 *   - types from @polaris/shared (ActivityType)
 *
 * @relatedFiles
 *   - src/components/activities/LogActivityForm.tsx
 *   - Docs/05_ai_strategy.md (AI suggests, user confirms)
 */

import type { AIActivityParse, ActivityType } from '@polaris/shared';

export type { AIActivityParse };

interface AiSuggestionPanelProps {
  suggestion:  AIActivityParse;
  /** Called when the user clicks "Apply suggestions" */
  onApply:    (suggestion: AIActivityParse) => void;
  /** Called when the user clicks "Dismiss" */
  onDismiss:  () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Display label for activity type */
const TYPE_LABELS: Record<ActivityType, string> = {
  quantity:   'Quantity',
  duration:   'Duration',
  completion: 'Completion',
};

/** Return Tailwind color classes based on confidence level */
function confidenceStyle(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-400';
  if (confidence >= 0.6) return 'text-yellow-400';
  return 'text-red-400';
}

function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the AI suggestion review card.
 * Each detected field is shown as a row with a confidence indicator.
 * Low-confidence suggestions (< 60%) show a warning banner.
 *
 * Designed to be embedded inside LogActivityForm, just below the rawInput.
 */
export function AiSuggestionPanel({
  suggestion,
  onApply,
  onDismiss,
}: AiSuggestionPanelProps) {
  const isLowConfidence = suggestion.confidence < 0.6;

  return (
    <div className="rounded-xl border border-primary/20 dark:border-dark-primary/20 bg-primary/5 dark:bg-dark-primary/5 p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary dark:text-dark-primary text-sm">✨</span>
          <p className="text-xs font-semibold text-primary dark:text-dark-primary uppercase tracking-wide">
            AI suggests
          </p>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container dark:bg-white/5 text-on-surface-variant dark:text-dark-on-surface-variant border border-outline-variant/20 dark:border-white/10"
            title={suggestion.provider === 'mock' ? 'Keyword-based matching (no API)' : 'OpenAI GPT-4o-mini'}
          >
            {suggestion.provider === 'mock' ? 'Mock' : 'OpenAI'}
          </span>
        </div>
        <span className={`text-xs font-semibold tabular-nums ${confidenceStyle(suggestion.confidence)}`}>
          {confidenceLabel(suggestion.confidence)} confidence
        </span>
      </div>

      {/* Low-confidence warning */}
      {isLowConfidence && (
        <div className="rounded-lg bg-yellow-500/10 dark:bg-yellow-950/60 border border-yellow-500/30 dark:border-yellow-800/60 px-3 py-2 text-xs text-yellow-700 dark:text-yellow-300">
          Low confidence — edit before applying if needed.
        </div>
      )}

      {/* Suggestion rows */}
      <div className="space-y-1.5">
        <SuggestionRow label="Title"  value={suggestion.title} />
        <SuggestionRow label="Type"   value={TYPE_LABELS[suggestion.activityType]} />
        {suggestion.value !== null && (
          <SuggestionRow
            label="Value"
            value={`${suggestion.value}${suggestion.unit ? ` ${suggestion.unit}` : ''}`}
          />
        )}
        {suggestion.unit !== null && suggestion.value === null && (
          <SuggestionRow label="Unit" value={suggestion.unit} />
        )}
        {suggestion.suggestedGoalTitle && (
          <SuggestionRow
            label="Goal"
            value={suggestion.suggestedGoalTitle}
            badge="AI suggested"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onApply(suggestion)}
          className="px-4 py-1.5 bg-primary dark:bg-dark-primary text-white dark:text-dark-bg text-xs font-semibold rounded-lg transition-colors hover:opacity-90"
        >
          Apply suggestions
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 text-xs font-medium text-on-surface-variant dark:text-dark-on-surface-variant opacity-50 hover:opacity-100 transition-opacity"
        >
          Dismiss
        </button>
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one suggestion row
// ---------------------------------------------------------------------------

function SuggestionRow({
  label,
  value,
  badge,
}: {
  label:   string;
  value:   string;
  badge?:  string;
}) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="w-12 flex-shrink-0 text-on-surface-variant dark:text-dark-on-surface-variant opacity-50">{label}:</span>
      <span className="text-on-surface dark:text-dark-on-surface font-medium">{value}</span>
      {badge && (
        <span className="text-primary dark:text-dark-primary text-xs">✨ {badge}</span>
      )}
    </div>
  );
}
