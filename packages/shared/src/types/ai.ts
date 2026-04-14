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

// ---------------------------------------------------------------------------
// Context — injected into every AI prompt call
// ---------------------------------------------------------------------------

/** Time-of-day bucket for personalised greeting/tone */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Shared context object assembled once per AI call.
 * Injected into every AI prompt — daily coach, briefing, chat, analysis.
 * Capped at 10 goals and 20 recent activities to avoid context-window bloat.
 */
export interface PolarisContext {
  activeGoals: Array<{
    id: string;
    title: string;
    /** 0–100 */
    progress: number;
    timeframe: string;
    /** Days since the last completed activity on this goal. -1 = never logged. */
    lastActivityDaysAgo: number;
  }>;
  /** Last 7 days of activities — title + date string + type */
  recentActivities: Array<{
    title: string;
    date: string;
    type: string;
  }>;
  /** Activities scheduled for today that are not yet completed */
  todayPlanned: Array<{
    title: string;
    goalTitle?: string | null;
  }>;
  /** Activities completed today */
  todayCompleted: Array<{
    title: string;
    value?: number | null;
    unit?: string | null;
  }>;
  currentStreak: number;
  longestStreak: number;
  timeOfDay: TimeOfDay;
  dayOfWeek: string;
  /** ISO date string for today (YYYY-MM-DD) */
  currentDate: string;
}
