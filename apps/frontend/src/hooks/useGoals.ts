/**
 * @file hooks/useGoals.ts
 * @description TanStack Query hooks for the Goals API.
 *   All goal state — fetching, creating, updating, deleting — flows through here.
 *   Mutations automatically invalidate relevant query caches on success.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - @polaris/shared (Goal, CreateGoalInput, UpdateGoalInput types)
 * - services/api.ts
 *
 * @relatedFiles
 * - src/services/api.ts
 * - src/pages/GoalsList.tsx
 * - src/pages/GoalDetail.tsx
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '../services/api.js';
import type {
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStatus,
  GoalTimeframe,
  GoalProgress,
  GoalWithProgress,
} from '@polaris/shared';

// Re-export so existing page-level imports from this file still work
export type { GoalProgress, GoalWithProgress };

// ---------------------------------------------------------------------------
// API response shapes (matching backend exactly)
// ---------------------------------------------------------------------------

interface GoalListResponse {
  success: true;
  data: GoalWithProgress[];
}

interface GoalResponse {
  success: true;
  data: GoalWithProgress;
}

interface GoalProgressResponse {
  success: true;
  data: GoalProgress;
}

interface DeleteResponse {
  success: true;
  data: { id: string; deleted: boolean };
}

// ---------------------------------------------------------------------------
// Query key factory — centralizes cache key management
// ---------------------------------------------------------------------------

export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (filters: GoalListFilter) => [...goalKeys.lists(), filters] as const,
  details: () => [...goalKeys.all, 'detail'] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
  progress: (id: string) => [...goalKeys.detail(id), 'progress'] as const,
};

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface GoalListFilter {
  status?: GoalStatus | 'all';
  timeframe?: GoalTimeframe;
  includeProgress?: boolean;
}

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * Fetch paginated list of goals, optionally filtered.
 * Defaults to status='active'.
 */
export function useGoals(
  filter: GoalListFilter = {},
  options?: Partial<UseQueryOptions<GoalWithProgress[]>>
) {
  return useQuery({
    queryKey: goalKeys.list(filter),
    queryFn: async () => {
      const res = await api.get<GoalListResponse>('/goals', {
        ...(filter.status             && { status:          filter.status }),
        ...(filter.timeframe          && { timeframe:       filter.timeframe }),
        ...(filter.includeProgress !== undefined && { includeProgress: filter.includeProgress }),
      });
      return res.data;
    },
    staleTime: 60_000,
    ...options,
  });
}

/**
 * Fetch a single goal by ID.
 * Pass includeProgress=true to get live progress metrics.
 */
export function useGoal(
  id: string,
  opts: { includeProgress?: boolean; includeChildren?: boolean } = {}
) {
  return useQuery({
    queryKey: [...goalKeys.detail(id), opts],
    queryFn: async () => {
      const res = await api.get<GoalResponse>(`/goals/${id}`, {
        ...(opts.includeProgress && { includeProgress: true }),
        ...(opts.includeChildren && { includeChildren: true }),
      });
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/**
 * Fetch computed progress metrics for a goal.
 */
export function useGoalProgress(id: string) {
  return useQuery({
    queryKey: goalKeys.progress(id),
    queryFn: async () => {
      const res = await api.get<GoalProgressResponse>(`/goals/${id}/progress`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new goal.
 * On success, invalidates the goals list cache.
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGoalInput) =>
      api.post<GoalResponse>('/goals', input).then((res) => res.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

/**
 * Partial-update a goal by ID.
 * On success, invalidates both the list and the specific goal's detail cache.
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      api.patch<GoalResponse>(`/goals/${id}`, data).then((res) => res.data),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: goalKeys.detail(id) });
    },
  });
}

/**
 * Soft-delete a goal by ID.
 * On success, removes it from list caches and clears its detail cache.
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del<DeleteResponse>(`/goals/${id}`).then((res) => res.data),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
      queryClient.removeQueries({ queryKey: goalKeys.detail(id) });
    },
  });
}
