/**
 * @file hooks/useActivities.ts
 * @description TanStack Query hooks for the Activities API.
 *   All activity state — fetching, logging, updating, deleting — flows through here.
 *   Mutations automatically invalidate relevant query caches on success.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - @polaris/shared (Activity, CreateActivityInput, UpdateActivityInput types)
 * - services/api.ts
 *
 * @relatedFiles
 * - src/services/api.ts
 * - src/pages/TodayView.tsx
 * - src/hooks/useGoals.ts (goal progress cache invalidated on activity mutation)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, type PaginatedResponse } from '../services/api.js';
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  ActivityStatus,
  ActivityType,
  ListedActivity,
  TodayActivities,
} from '@polaris/shared';

// Re-export so existing page-level imports from this file still work
export type { ListedActivity, TodayActivities };

// ---------------------------------------------------------------------------
// API response shapes (matching backend exactly)
// ---------------------------------------------------------------------------

interface ActivityResponse {
  success: true;
  data: Activity;
}

interface TodayResponse {
  success: true;
  data: TodayActivities;
}

interface DeleteResponse {
  success: true;
  data: { id: string; deleted: boolean };
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const activityKeys = {
  all:    ['activities'] as const,
  lists:  () => [...activityKeys.all, 'list'] as const,
  list:   (filters: ActivityListFilter) => [...activityKeys.lists(), filters] as const,
  today:  () => [...activityKeys.all, 'today'] as const,
  detail: (id: string) => [...activityKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface ActivityListFilter {
  date?: string;          // YYYY-MM-DD exact day
  startDate?: string;     // YYYY-MM-DD range start
  endDate?: string;       // YYYY-MM-DD range end
  goalId?: string;
  status?: ActivityStatus;
  activityType?: ActivityType;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Read hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of activities with optional filters.
 * Pass `{ enabled: false }` as the second argument to skip the query entirely.
 */
export function useActivities(
  filter: ActivityListFilter = {},
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: activityKeys.list(filter),
    queryFn: () =>
      api.get<PaginatedResponse<ListedActivity>>('/activities', {
        ...(filter.date         && { date:         filter.date }),
        ...(filter.startDate    && { startDate:    filter.startDate }),
        ...(filter.endDate      && { endDate:      filter.endDate }),
        ...(filter.goalId       && { goalId:       filter.goalId }),
        ...(filter.status       && { status:       filter.status }),
        ...(filter.activityType && { activityType: filter.activityType }),
        ...(filter.limit        !== undefined && { limit:   filter.limit }),
        ...(filter.offset       !== undefined && { offset:  filter.offset }),
      }),
    staleTime: 60_000,
    enabled:   options.enabled ?? true,
  });
}

/**
 * Fetch a single activity by ID.
 */
export function useActivity(id: string) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: async () => {
      const res = await api.get<ActivityResponse>(`/activities/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

/**
 * Fetch today's activities grouped by status: planned / completed / skipped.
 * Refreshes every 2 minutes automatically.
 */
export function useTodayActivities() {
  return useQuery({
    queryKey: activityKeys.today(),
    queryFn: async () => {
      const res = await api.get<TodayResponse>('/activities/today');
      return res.data;
    },
    staleTime: 2 * 60_000,    // consider stale after 2 min
    refetchInterval: 5 * 60_000, // background refresh every 5 min
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Log a new activity.
 * Body is sent as camelCase — matches the API contract and shared CreateActivityInput.
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateActivityInput) =>
      api
        .post<ActivityResponse>('/activities', input)
        .then((res) => res.data),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: activityKeys.today() });
      if (input.goalId) {
        void queryClient.invalidateQueries({ queryKey: ['goals', 'detail', input.goalId] });
      }
      toast.success('Activity logged');
    },
    onError: () => {
      toast.error('Failed to log activity');
    },
  });
}

/**
 * Partial-update an activity (e.g., mark completed, edit notes).
 * Body is sent as camelCase — matches the API contract and shared UpdateActivityInput.
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityInput }) =>
      api
        .patch<ActivityResponse>(`/activities/${id}`, data)
        .then((res) => res.data),
    onSuccess: (activity, { id }) => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: activityKeys.today() });
      void queryClient.invalidateQueries({ queryKey: activityKeys.detail(id) });
      // Invalidate goal progress if linked
      if (activity.goalId) {
        void queryClient.invalidateQueries({ queryKey: ['goals', 'detail', activity.goalId] });
      }
    },
  });
}

/**
 * Soft-delete an activity by ID.
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.del<DeleteResponse>(`/activities/${id}`).then((res) => res.data),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: activityKeys.today() });
      queryClient.removeQueries({ queryKey: activityKeys.detail(id) });
      toast.success('Activity deleted');
    },
    onError: () => {
      toast.error('Failed to delete activity');
    },
  });
}

