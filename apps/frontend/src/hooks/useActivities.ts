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
import { api, type PaginatedResponse } from '../services/api.js';
import type {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  ActivityStatus,
  ActivityType,
} from '@polaris/shared';

// ---------------------------------------------------------------------------
// API response shapes (matching backend exactly)
// ---------------------------------------------------------------------------

/** Activity with goalTitle flattened (returned by list/today endpoints) */
export interface ListedActivity extends Activity {
  goalTitle: string | null;
}

/** Grouped shape returned by GET /api/activities/today */
export interface TodayActivities {
  date: string;
  planned: ListedActivity[];
  completed: ListedActivity[];
  skipped: ListedActivity[];
}

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
 */
export function useActivities(filter: ActivityListFilter = {}) {
  return useQuery({
    queryKey: activityKeys.list(filter),
    queryFn: () =>
      api.get<PaginatedResponse<ListedActivity>>('/activities', {
        ...(filter.date         && { date:         filter.date }),
        ...(filter.startDate    && { start_date:   filter.startDate }),
        ...(filter.endDate      && { end_date:     filter.endDate }),
        ...(filter.goalId       && { goal_id:      filter.goalId }),
        ...(filter.status       && { status:       filter.status }),
        ...(filter.activityType && { activity_type: filter.activityType }),
        ...(filter.limit        !== undefined && { limit:  filter.limit }),
        ...(filter.offset       !== undefined && { offset: filter.offset }),
      }),
    staleTime: 60_000,
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
 * Note: body fields use camelCase here — the controller maps them to snake_case
 * before passing to the service. The snake_case mapping happens IN the controller
 * because the API contract specifies snake_case bodies; this hook sends camelCase
 * and relies on the api.ts serialization being transparent.
 *
 * Wait — actually the API contract uses snake_case for request bodies
 * (activity_type, goal_id, etc.). This hook sends the camelCase input and
 * maps to snake_case before posting to match the contract.
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateActivityInput) =>
      api
        .post<ActivityResponse>('/activities', toSnakeCase(input))
        .then((res) => res.data),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: activityKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: activityKeys.today() });
      // Invalidate goal progress if this activity was linked to a goal
      if (input.goalId) {
        void queryClient.invalidateQueries({ queryKey: ['goals', 'detail', input.goalId] });
      }
    },
  });
}

/**
 * Partial-update an activity (e.g., mark completed, edit notes).
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityInput }) =>
      api
        .patch<ActivityResponse>(`/activities/${id}`, toUpdateSnakeCase(data))
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
    },
  });
}

// ---------------------------------------------------------------------------
// Internal snake_case mappers (API contract uses snake_case for request bodies)
// ---------------------------------------------------------------------------

/** Map camelCase CreateActivityInput to the snake_case body the API expects */
function toSnakeCase(input: CreateActivityInput): Record<string, unknown> {
  return {
    title:         input.title,
    activity_type: input.activityType,
    activity_date: input.activityDate,
    ...(input.notes        !== undefined && { notes:       input.notes }),
    ...(input.value        !== undefined && { value:       input.value }),
    ...(input.unit         !== undefined && { unit:        input.unit }),
    ...(input.rawInput     !== undefined && { raw_input:   input.rawInput }),
    ...(input.goalId       !== undefined && { goal_id:     input.goalId }),
    ...(input.category     !== undefined && { category:    input.category }),
    ...(input.status       !== undefined && { status:      input.status }),
  };
}

/** Map camelCase UpdateActivityInput to the snake_case body the API expects */
function toUpdateSnakeCase(input: UpdateActivityInput): Record<string, unknown> {
  return {
    ...(input.title        !== undefined && { title:         input.title }),
    ...(input.notes        !== undefined && { notes:         input.notes }),
    ...(input.activityType !== undefined && { activity_type: input.activityType }),
    ...(input.value        !== undefined && { value:         input.value }),
    ...(input.unit         !== undefined && { unit:          input.unit }),
    ...(input.goalId       !== undefined && { goal_id:       input.goalId }),
    ...(input.activityDate !== undefined && { activity_date: input.activityDate }),
    ...(input.category     !== undefined && { category:      input.category }),
    ...(input.status       !== undefined && { status:        input.status }),
    ...(input.completedAt  !== undefined && { completed_at:  input.completedAt }),
  };
}
