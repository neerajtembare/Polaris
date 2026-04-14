/**
 * @file tars/intent-classifier.ts
 * @description Heuristic-first intent classification for TARS chat messages.
 *   Runs a regex pattern match first (covers ~80% of inputs with zero LLM calls).
 *   Falls back to an LLM classification call for ambiguous inputs.
 *
 *   Intent drives what happens next:
 *     log_activity / plan_activity → include write tool schemas in LLM call
 *     create_goal                  → include goal draft tool schema
 *     query / chat                 → no tools, just context + text response
 *     unknown                      → ask for clarification
 *
 * @module @polaris/ai/tars
 *
 * @relatedFiles
 * - packages/ai/src/tars/tool-schemas.ts
 * - packages/ai/src/tars/action-types.ts
 */

// ---------------------------------------------------------------------------
// Intent types
// ---------------------------------------------------------------------------

export type IntentType =
  | 'log_activity'    // "I read 30 pages", "ran 5km today"
  | 'plan_activity'   // "I'm going to run tomorrow", "plan to study tonight"
  | 'create_goal'     // "new goal: run 100km", "I want to read more"
  | 'query'           // "how am I doing?", "what's my streak?"
  | 'chat'            // General conversation, unclear intent
  | 'unknown';        // Truly ambiguous — ask for clarification

// ---------------------------------------------------------------------------
// Heuristic patterns (ordered by specificity — more specific first)
// ---------------------------------------------------------------------------

/** Patterns that strongly indicate logging a COMPLETED activity */
const LOG_PATTERNS = /\b(logged?|did|completed?|finished?|done|read\s+\d|ran\s+\d|ran\b|walked?\s+\d|studied\s+\d|spent\s+\d|wrote\s+\d|exercised\b|meditated?\b|slept\s+\d|worked\s+out\b|hit\s+the\s+gym)\b/i;

/** Patterns that strongly indicate planning a FUTURE activity */
const PLAN_PATTERNS = /\b(going\s+to|plan\s+to|planning\s+to|will\s+(do|run|read|study|exercise|work)|want\s+to\s+(do|run|read|study)|scheduled?|remind\s+me|tomorrow|tonight|later\s+today)\b/i;

/** Patterns for goal creation */
const GOAL_PATTERNS = /\b(create\s+a?\s*goal|new\s+goal|add\s+a?\s*goal|set\s+a?\s*goal|track\s+my|my\s+goal\s+is|i\s+want\s+to\s+(read|run|learn|build|save|exercise|study|write)\b|long.term\s+goal|start\s+tracking)\b/i;

/** Patterns for queries / information requests */
const QUERY_PATTERNS = /\b(how\s+am\s+i|how\s+did\s+i|what\s+is\s+my|what's\s+my|show\s+me|how\s+much|am\s+i\s+on\s+track|my\s+progress|my\s+streak|behind|ahead|stats|summary|compare|trend|which\s+goal|tell\s+me\s+about)\b/i;

/** Patterns for navigation commands (handled client-side — should not reach here) */
const NAVIGATION_PATTERNS = /\b(go\s+to|open|navigate\s+to|show\s+(goals|settings|insights|history|hub|dashboard))\b/i;

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export interface ClassifyResult {
  intent:     IntentType;
  confidence: 'high' | 'low';
  method:     'heuristic' | 'fallback';
}

export interface ClassifyOptions {
  /**
   * The type of the last action TARS proposed (from the frontend pendingAction).
   * When set, short confirmation/denial words are routed to the right intent
   * so that the correct tool schemas are included in the LLM call.
   */
  pendingActionType?: string;
}

// Short phrases that confirm a previous TARS proposal
const CONFIRM_PATTERNS =
  /^(yes|yeah|yep|yup|sure|ok|okay|correct|right|do it|go ahead|confirm|let's go|proceed|sounds good|yes please|affirmative|go for it|make it happen)\.?$/i;

// Short phrases that cancel/deny a previous TARS proposal
const DENY_PATTERNS =
  /^(no|nope|cancel|never mind|nevermind|stop|don't|dont|abort|dismiss|negative|skip it|forget it|not now|not today)\.?$/i;

/**
 * Classify the intent of a user message.
 * Returns immediately from heuristics for ~80% of inputs.
 * Falls back to 'chat' for ambiguous inputs (the LLM will handle them).
 *
 * When `options.pendingActionType` is set (there's an outstanding TARS proposal),
 * short confirmation/denial words are mapped to the right intent so the correct
 * tool schemas are included in the LLM call — fixing the "I don't have context
 * for 'yes'" problem.
 *
 * NOTE: Fixed commands (play music, go to goals, etc.) should be matched
 * client-side BEFORE calling this. If navigation patterns are detected here,
 * classify as 'chat' to let the LLM handle the response gracefully.
 */
export function classifyIntent(input: string, options?: ClassifyOptions): ClassifyResult {
  const lower = input.toLowerCase().trim();

  // ── Confirmation-aware routing ────────────────────────────────────────────
  // If there's a pending action proposal and the user responds with a short
  // confirmation/denial, route to the right intent so tools are included.
  if (options?.pendingActionType) {
    const pendingIntent = options.pendingActionType as IntentType;
    const isWriteIntent = ['log_activity', 'plan_activity', 'create_goal'].includes(pendingIntent);

    if (isWriteIntent && CONFIRM_PATTERNS.test(lower)) {
      // e.g. "yes" while log_activity is pending → intent = log_activity → tools included
      return { intent: pendingIntent, confidence: 'high', method: 'heuristic' };
    }
    if (DENY_PATTERNS.test(lower)) {
      // User is canceling — use chat so the LLM can acknowledge naturally
      return { intent: 'chat', confidence: 'high', method: 'heuristic' };
    }
  }
  // ── End confirmation-aware routing ───────────────────────────────────────

  // Navigation — shouldn't reach backend, but handle gracefully
  if (NAVIGATION_PATTERNS.test(lower)) {
    return { intent: 'chat', confidence: 'high', method: 'heuristic' };
  }

  // Goal creation — check before log (some phrases could overlap)
  if (GOAL_PATTERNS.test(lower)) {
    return { intent: 'create_goal', confidence: 'high', method: 'heuristic' };
  }

  // Plan (future) — check before log (past)
  if (PLAN_PATTERNS.test(lower)) {
    return { intent: 'plan_activity', confidence: 'high', method: 'heuristic' };
  }

  // Log (past/completed)
  if (LOG_PATTERNS.test(lower)) {
    return { intent: 'log_activity', confidence: 'high', method: 'heuristic' };
  }

  // Query
  if (QUERY_PATTERNS.test(lower)) {
    return { intent: 'query', confidence: 'high', method: 'heuristic' };
  }

  // Ambiguous — default to chat (LLM responds in plain text, no tools)
  // This is safer than defaulting to log_activity which would send tool schemas
  // and risk creating unwanted data from ambiguous input.
  return { intent: 'chat', confidence: 'low', method: 'fallback' };
}

// ---------------------------------------------------------------------------
// Tool inclusion helper
// ---------------------------------------------------------------------------

import { LOG_ACTIVITY_TOOLS, PLAN_ACTIVITY_TOOLS, CREATE_GOAL_TOOLS } from './tool-schemas.js';
import type { ToolSchema } from '../types.js';

/**
 * Return the tool schemas to include in the LLM call based on classified intent.
 * Query and chat intents get NO tools (read-only, just text response).
 */
export function getToolsForIntent(intent: IntentType): ToolSchema[] {
  switch (intent) {
    case 'log_activity':   return LOG_ACTIVITY_TOOLS;
    case 'plan_activity':  return PLAN_ACTIVITY_TOOLS;
    case 'create_goal':    return CREATE_GOAL_TOOLS;
    default:               return [];
  }
}
