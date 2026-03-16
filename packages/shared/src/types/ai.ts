/**
 * @file types/ai.ts
 * @description Shared AI-related types used by both backend (ai.service.ts) and
 *   frontend (AiSuggestionPanel.tsx). Single source of truth — do not duplicate.
 * @module @polaris/shared
 */

import type { ActivityType } from './activity.js';

/**
 * Structured parse result returned by any AI provider.
 * Maps directly to the LogActivityForm fields the frontend will auto-fill.
 */
export interface AIActivityParse {
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
