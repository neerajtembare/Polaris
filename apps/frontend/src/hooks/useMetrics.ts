/**
 * @file hooks/useMetrics.ts
 * @description TanStack Query hooks for the Dashboard Metrics API.
 *   Fetches aggregated stats (activity counts, streaks, heatmap, goal progress)
 *   for the given reporting period.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - @polaris/shared (DashboardMetrics, MetricsPeriod)
 * - services/api.ts
 *
 * @relatedFiles
 * - src/pages/Dashboard.tsx
 * - apps/backend/src/services/metrics.service.ts
 */

import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@polaris/shared';
import type { DashboardMetrics, MetricsPeriod } from '@polaris/shared';
import { api } from '../services/api.js';

// Re-export for consumers (e.g. Dashboard, which uses MetricsPeriod and GoalProgressEntry via DashboardMetrics)
export type { DashboardMetrics, GoalProgressEntry, MetricsPeriod } from '@polaris/shared';

type MetricsResponse = ApiSuccess<DashboardMetrics>;

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
