/**
 * @file tars/action-types.ts
 * @description TARSAction union type — the typed bridge between LLM intent and
 *   frontend execution. Every action TARS can trigger is represented here.
 *   Read-only and navigation actions execute immediately.
 *   Write actions (log_activity, create_goal) always require user confirmation.
 * @module @polaris/ai/tars
 *
 * @relatedFiles
 * - packages/ai/src/tars/tool-schemas.ts    (LLM function definitions)
 * - packages/ai/src/tars/action-validator.ts (Zod validation of tool call output)
 * - apps/frontend/src/hooks/useAssistantActions.ts (action executor)
 */

// ---------------------------------------------------------------------------
// Shared screen IDs (mirrors frontend navigation.ts)
// ---------------------------------------------------------------------------

export type ScreenId =
  | 'Hub'
  | 'Goals'
  | 'Insights'
  | 'History'
  | 'Settings'
  | 'WeeklyReview';

// ---------------------------------------------------------------------------
// Draft types — structured data the LLM fills in, user confirms before saving
// ---------------------------------------------------------------------------

/**
 * Draft activity proposed by TARS.
 * Mirrors the fields in POST /api/activities but nothing is saved until confirmed.
 */
export interface ActivityDraft {
  title:        string;
  activityType: 'quantity' | 'duration' | 'completion';
  value?:       number;
  unit?:        string;
  /** Matched goal id (null if no match) */
  goalId?:      string | null;
  /** Human-readable goal title shown in confirmation card — avoids a lookup */
  goalTitle?:   string | null;
  /** ISO date string, defaults to today */
  date?:        string;
  /** Whether this was a planned activity (status='planned') vs completed ('completed') */
  status?:      'completed' | 'planned';
}

/**
 * Draft goal proposed by TARS.
 * Nothing is saved until the user confirms via ToolConfirmCard.
 */
export interface GoalDraft {
  title:        string;
  timeframe:    'long' | 'medium' | 'short';
  targetValue?: number;
  targetUnit?:  string;
  description?: string;
}

// ---------------------------------------------------------------------------
// TARSAction — union of all possible actions
// ---------------------------------------------------------------------------

/**
 * All possible actions TARS can trigger.
 *
 * Three categories:
 *   1. Immediate (no confirmation): navigate, audio, focus, show_*
 *   2. Confirmed writes: log_activity, plan_activity, create_goal
 *   3. Future: search, export, archive (not implemented yet)
 *
 * Consumers (frontend useAssistantActions hook) switch on `action.type`.
 */
export type TARSAction =
  // Navigation
  | { type: 'navigate'; screen: ScreenId }

  // Audio (immediate)
  | { type: 'audio.play'; streamId?: string }
  | { type: 'audio.stop' }
  | { type: 'audio.next' }

  // Focus session (immediate)
  | { type: 'focus.start'; goalId?: string; durationMins?: number }
  | { type: 'focus.stop' }

  // Write — MUST show confirmation card before executing
  | { type: 'log_activity';  draft: ActivityDraft }
  | { type: 'plan_activity'; draft: ActivityDraft }
  | { type: 'create_goal';   draft: GoalDraft }

  // Pure display — no mutation, no confirmation needed
  | { type: 'show_goals' }
  | { type: 'show_streak' }

  // UI control (immediate)
  | { type: 'toggle_theme' }
  | { type: 'help' };

// ---------------------------------------------------------------------------
// Helper type-guards
// ---------------------------------------------------------------------------

/** Returns true if the action requires user confirmation before executing */
export function requiresConfirmation(action: TARSAction): boolean {
  return (
    action.type === 'log_activity'  ||
    action.type === 'plan_activity' ||
    action.type === 'create_goal'
  );
}

/** Returns true if the action is safe to auto-execute immediately */
export function isImmediateAction(action: TARSAction): boolean {
  return !requiresConfirmation(action);
}

// ---------------------------------------------------------------------------
// Quick Reply Chips — deterministic action shortcuts shown below TARS responses
// ---------------------------------------------------------------------------

/**
 * A tappable chip rendered below a TARS response.
 * Chips are always hardcoded per action type — NEVER AI-generated.
 * Tapping a chip executes the mapped TARSAction immediately.
 */
export interface QuickReplyChip {
  /** Button label */
  label: string;
  /** Action to execute when tapped */
  action: TARSAction;
  /** Optional icon name (e.g. 'play', 'plus', 'calendar') */
  icon?: string;
}

// ---------------------------------------------------------------------------
// TARS Response — the full shape returned by the chat endpoint
// ---------------------------------------------------------------------------

/**
 * Structured response from POST /api/ai/chat.
 * Chips are optional — only returned when the action type has a known chip set.
 */
export interface TARSResponse {
  text:                 string | null;
  action:               TARSAction | null;
  requiresConfirmation: boolean;
  chips?:               QuickReplyChip[];
  intent:               string;
  confidence:           string;
  provider:             string;
  latencyMs:            number;
}
