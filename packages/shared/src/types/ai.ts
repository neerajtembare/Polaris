/**
 * @file types/ai.ts
 * @description Shared AI-related types used by both backend (ai.service.ts) and
 *   frontend (AiSuggestionPanel.tsx). Single source of truth — do not duplicate.
 * @module @polaris/shared
 */

import type { ActivityType } from './activity.js';

/**
 * User intent detected from the raw input.
 * - log_activity: User is reporting something they did ("ran 5km", "slept 7 hours")
 * - create_goal:  User wants to set a new goal ("I want to run 10k every week")
 * - query:        User is asking a question ("how am I doing?")
 */
export type UserIntent = 'log_activity' | 'create_goal' | 'query';

/**
 * Structured parse result returned by any AI provider.
 * Maps directly to the LogActivityForm fields the frontend will auto-fill.
 */
export interface AIActivityParse {
  /** Detected user intent — drives frontend routing */
  intent:              UserIntent;
  title:               string;
  activityType:        ActivityType;
  value:               number | null;
  unit:                string | null;
  suggestedGoalId:     string | null;
  /** Human-readable label for the suggested goal (so frontend doesn't need a lookup) */
  suggestedGoalTitle:  string | null;
  /** 0.0–1.0. Below 0.6 = low-confidence; frontend should warn the user. */
  confidence:          number;
  /** Which provider produced this result — shown in the review panel */
  provider:            string;
}

/** Suggested sub-goal from AI goal breakdown */
export interface AISubGoal {
  title:       string;
  timeframe?:  'long' | 'medium' | 'short';
  targetDate?: string;
  targetValue?: number;
  targetUnit?:  string;
  rationale?:   string;
}

/** Suggested activity from AI goal breakdown */
export interface AISuggestedActivity {
  title:            string;
  activityType:     ActivityType;
  value?:           number;
  unit?:            string;
  frequency?:       string;
  suggestedDuration?: number;
  rationale?:       string;
}

/** Goal breakdown result — sub-goals and suggested activities */
export interface AIGoalBreakdown {
  subGoals:          AISubGoal[];
  suggestedActivities: AISuggestedActivity[];
  provider:         string;
}

/** Weekly analysis result — behavioral insights from activity data */
export interface AIWeeklyAnalysis {
  summary:       string;
  insights:      string[];
  suggestions:   string[];
  provider:      string;
}
