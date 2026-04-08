/**
 * @file hooks/useWeeklyInsights.ts
 * @description TanStack Query hook for POST /api/ai/analyze-week.
 *   Fetches AI-generated behavioral insights for the past week.
 *   Cached for 5 minutes — analysis doesn't change second-to-second.
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/components/widgets/WeeklyInsights.tsx
 *   - apps/backend/src/routes/ai.ts
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.js';
import type { ApiSuccess, AIWeeklyAnalysis } from '@polaris/shared';

interface WeeklyInsightsResponse extends ApiSuccess<AIWeeklyAnalysis> {}

export function useWeeklyInsights() {
  return useQuery({
    queryKey: ['ai', 'weekly-insights'],
    queryFn: async () => {
      const res = await api.post<WeeklyInsightsResponse>('/ai/analyze-week', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — insights don't change per-second
    retry: false,              // Don't retry AI calls on failure
    refetchOnWindowFocus: false,
    enabled: false,            // Never auto-fetch — user must click "Generate"
  });
}
