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
  | 'log_activity'       // "I read 30 pages", "ran 5km today"
  | 'plan_activity'      // "I'm going to run tomorrow", "plan to study tonight"
  | 'create_goal'        // "new goal: run 100km", "I want to read more"
  | 'update_goal_status' // "pause my reading goal", "resume gym goal"
  | 'start_focus'        // "start 25 min focus", "pomodoro for reading"
  | 'query'              // "how am I doing?", "what's my streak?"
  | 'daily_coach'        // "coach me", "what should I focus on today?"
  | 'analyze_week'       // "analyze my week", "how was my week?"
  | 'goal_breakdown'     // "break down my reading goal", "how do I achieve my gym goal?"
  | 'chat'               // General conversation, unclear intent
  | 'unknown';           // Truly ambiguous — ask for clarification

// ---------------------------------------------------------------------------
// Heuristic patterns (ordered by specificity — more specific first)
// ---------------------------------------------------------------------------

/** Patterns that strongly indicate logging a COMPLETED activity */
const LOG_PATTERNS = /\b(logged?|did|completed?|finished?|done|read\s+\d|ran\s+\d|ran\b|walked?\s+\d|studied\s+\d|spent\s+\d|wrote\s+\d|exercised\b|meditated?\b|slept\s+\d|worked\s+out\b|hit\s+the\s+gym)\b/i;

/** Patterns that strongly indicate planning a FUTURE activity */
const PLAN_PATTERNS = /\b(going\s+to|plan\s+to|planning\s+to|will\s+(do|run|read|study|exercise|work)|want\s+to\s+(do|run|read|study)|scheduled?|remind\s+me|tomorrow|tonight|later\s+today)\b/i;

/** Patterns for goal creation */
const GOAL_PATTERNS = /\b(create\s+a?\s*goal|new\s+goal|add\s+a?\s*goal|set\s+a?\s*goal|track\s+my|my\s+goal\s+is|i\s+want\s+to\s+(read|run|learn|build|save|exercise|study|write)\b|long.term\s+goal|start\s+tracking)\b/i;

/** Patterns for updating goal status */
const UPDATE_GOAL_PATTERNS = /\b(pause\s+((my|the)\s+)?.*goal|resume\s+((my|the)\s+)?.*goal|archive\s+((my|the)\s+)?.*goal|mark\s+.*goal\s+as\s+(completed|done|paused|archived))\b/i;

/** Patterns for starting focus session */
const START_FOCUS_PATTERNS = /\b(start\s+(a\s+)?(focus|pomodoro)|begin\s+focus|focus\s+session\s+for|pomodoro\s+timer)\b/i;

/** Patterns for queries / information requests */
const QUERY_PATTERNS = /\b(how\s+am\s+i|how\s+did\s+i|what\s+is\s+my|what's\s+my|show\s+me|how\s+much|am\s+i\s+on\s+track|my\s+progress|my\s+streak|behind|ahead|stats|summary|compare|trend|which\s+goal|tell\s+me\s+about|what\s+did\s+i|what('s|\s+is|\s+are)?\s+(planned|do\s+i\s+have)|today'?s?\s+(plan|list|progress|completed|done|stats?)|today'?s?\s+activities?|\bstreak\b|list\s+(my\s+)?goals?|show\s+(all|my)\s+goals?|how\s+many\s+activities?|activity\s+count|weekly\s+(stats?|metrics?|performance|count)|how'?s?\s+(my|the)\s+\w+\s+goal|longest\s+streak)\b/i;

/** Patterns for navigation commands (handled client-side — should not reach here) */
const NAVIGATION_PATTERNS = /\b(go\s+to|open|navigate\s+to|show\s+(goals|settings|insights|history|hub|dashboard))\b/i;

/** Patterns for daily-coach requests */
const DAILY_COACH_PATTERNS = /\b(coach\s+me|daily\s+coach|what\s+should\s+i\s+(focus\s+on|do|work\s+on)\s+today|what'?s?\s+(my\s+)?focus\s+today|give\s+me\s+(advice|coaching|guidance|a\s+tip)|motivate\s+me|inspire\s+me|any\s+(advice|tips?|suggestions?)\s+for\s+today|today'?s?\s+(coaching|tip|advice)|suggest\s+(something|an?\s+activity))\b/i;

/** Patterns for weekly analysis requests */
const ANALYZE_WEEK_PATTERNS = /\b(analyze\s+my\s+week|weekly\s+(analysis|insights?|review|reflection)|how\s+(was\s+my\s+week|did\s+i\s+do\s+this\s+week|was\s+this\s+week)|last\s+week('?s?)?\s+(performance|summary|review)|reflect\s+on\s+(my\s+)?week|my\s+week\s+in\s+review)\b/i;

/** Patterns for goal breakdown requests */
const GOAL_BREAKDOWN_PATTERNS = /\b(break\s+(down|it\s+down)|break\s+down\s+(my\s+)?(\w+\s+)*goal|how\s+(do\s+i|can\s+i)\s+achieve|(decompose|deconstruct)\s+(my\s+)?(\w+\s+)*goal|sub.?goals?\s+for|steps?\s+to\s+(reach|achieve|meet)|break\s+(my\s+)?(\w+\s+)*goal\s+down)\b/i;

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
  /**
   * Current screen the user is viewing — used as a disambiguation hint.
   * e.g. "add one" on Goals → create_goal, on Hub → ambiguous.
   */
  currentScreen?: string | undefined;
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
 */
export function classifyIntent(input: string, options?: ClassifyOptions): ClassifyResult {
  const lower = input.toLowerCase().trim();

  if (options?.pendingActionType) {
    const pendingIntent = options.pendingActionType as IntentType;
    const isWriteIntent = ['log_activity', 'plan_activity', 'create_goal', 'update_goal_status'].includes(pendingIntent);

    if (isWriteIntent && CONFIRM_PATTERNS.test(lower)) {
      return { intent: pendingIntent, confidence: 'high', method: 'heuristic' };
    }
    if (DENY_PATTERNS.test(lower)) {
      return { intent: 'chat', confidence: 'high', method: 'heuristic' };
    }
  }

  if (NAVIGATION_PATTERNS.test(lower)) {
    return { intent: 'chat', confidence: 'high', method: 'heuristic' };
  }

  if (UPDATE_GOAL_PATTERNS.test(lower)) {
    return { intent: 'update_goal_status', confidence: 'high', method: 'heuristic' };
  }

  if (START_FOCUS_PATTERNS.test(lower)) {
    return { intent: 'start_focus', confidence: 'high', method: 'heuristic' };
  }

  if (GOAL_PATTERNS.test(lower)) {
    return { intent: 'create_goal', confidence: 'high', method: 'heuristic' };
  }

  if (PLAN_PATTERNS.test(lower)) {
    return { intent: 'plan_activity', confidence: 'high', method: 'heuristic' };
  }

  if (LOG_PATTERNS.test(lower)) {
    return { intent: 'log_activity', confidence: 'high', method: 'heuristic' };
  }

  if (QUERY_PATTERNS.test(lower)) {
    return { intent: 'query', confidence: 'high', method: 'heuristic' };
  }

  if (DAILY_COACH_PATTERNS.test(lower)) {
    return { intent: 'daily_coach', confidence: 'high', method: 'heuristic' };
  }

  if (ANALYZE_WEEK_PATTERNS.test(lower)) {
    return { intent: 'analyze_week', confidence: 'high', method: 'heuristic' };
  }

  if (GOAL_BREAKDOWN_PATTERNS.test(lower)) {
    return { intent: 'goal_breakdown', confidence: 'high', method: 'heuristic' };
  }

  return { intent: 'chat', confidence: 'low', method: 'fallback' };
}

// ---------------------------------------------------------------------------
// Tool inclusion helper
// ---------------------------------------------------------------------------

import {
  LOG_ACTIVITY_TOOLS,
  PLAN_ACTIVITY_TOOLS,
  CREATE_GOAL_TOOLS,
  UPDATE_GOAL_STATUS_TOOLS,
  START_FOCUS_SESSION_TOOLS,
} from './tool-schemas.js';
import type { ToolSchema } from '../types.js';

/**
 * Return the tool schemas to include in the LLM call based on classified intent.
 * Query and chat intents get NO tools (read-only, just text response).
 */
export function getToolsForIntent(intent: IntentType): ToolSchema[] {
  switch (intent) {
    case 'log_activity':       return LOG_ACTIVITY_TOOLS;
    case 'plan_activity':      return PLAN_ACTIVITY_TOOLS;
    case 'create_goal':        return CREATE_GOAL_TOOLS;
    case 'update_goal_status': return UPDATE_GOAL_STATUS_TOOLS;
    case 'start_focus':        return START_FOCUS_SESSION_TOOLS;
    default:                   return [];
  }
}
