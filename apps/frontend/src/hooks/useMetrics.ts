/**
 * @file hooks/useMetrics.ts
 * @description TanStack Query hooks for the Dashboard Metrics API.
 *   Fetches aggregated stats (activity counts, streaks, heatmap, goal progress)
 *   for the given reporting period.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - services/api.ts
 *
 * @relatedFiles
 * - src/pages/Dashboard.tsx
 * - apps/backend/src/services/metrics.service.ts
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetricsPeriod = 'week' | 'month' | 'year';

export interface GoalProgressEntry {
  goalId:       string;
  goalTitle:    string;
  targetValue:  number | null;
  unit:         string | null;
  currentValue: number;
  percentage:   number;
}

export interface DashboardMetrics {
  period:              MetricsPeriod;
  startDate:           string;
  endDate:             string;
  totalActivities:     number;
  completedActivities: number;
  plannedActivities:   number;
  goalsTouched:        number;
  currentStreak:       number;
  longestStreak:       number;
  /** Map from "YYYY-MM-DD" → activity count */
  activityByDay:       Record<string, number>;
  /** Top goals with accumulated progress */
  goalProgress:        GoalProgressEntry[];
}

interface MetricsResponse {
  success: true;
  data:    DashboardMetrics;
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const metricsKeys = {
  all:       ['metrics'] as const,
  dashboard: (period: MetricsPeriod) => [...metricsKeys.all, 'dashboard', period] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch aggregated dashboard metrics for the given period.
 * Stale after 60 s — metrics are soft-realtime, not live.
 */
export function useMetrics(period: MetricsPeriod = 'week') {
  return useQuery<DashboardMetrics, Error>({
    queryKey: metricsKeys.dashboard(period),
    queryFn: async () => {
      const res = await api.get<MetricsResponse>('/metrics/dashboard', { period });
      return res.data;
    },
    staleTime: 60_000,
  });
}
