/**
 * @file types/api-responses.ts
 * @description API response payload types shared by backend and frontend.
 *   Single source of truth for GET response shapes (not just domain models).
 * @module @polaris/shared/types
 */

// ---------------------------------------------------------------------------
// Dashboard / Metrics
// ---------------------------------------------------------------------------

export type MetricsPeriod = 'week' | 'month' | 'year';

/** One goal's progress in the dashboard metrics response */
export interface GoalProgressEntry {
  goalId:       string;
  goalTitle:    string;
  currentValue: number;
  targetValue:  number | null;
  unit:         string | null;
  percentage:   number | null;
}

/** Response payload for GET /api/metrics/dashboard */
export interface DashboardMetrics {
  period:              MetricsPeriod;
  startDate:            string;   // YYYY-MM-DD
  endDate:              string;   // YYYY-MM-DD
  totalActivities:      number;
  completedActivities:  number;
  plannedActivities:   number;
  goalsTouched:        number;
  currentStreak:       number;
  longestStreak:       number;
  /** Map from "YYYY-MM-DD" → count of completed activities */
  activityByDay:       Record<string, number>;
  goalProgress:        GoalProgressEntry[];
}
