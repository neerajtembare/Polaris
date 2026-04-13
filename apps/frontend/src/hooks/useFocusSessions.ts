/**
 * @file hooks/useFocusSessions.ts
 * @description TanStack Query hooks for Focus Session CRUD —
 *   list, get, create, complete, abandon, delete.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - services/api
 * - @polaris/shared (FocusSession types)
 *
 * @relatedFiles
 * - src/components/FocusMode.tsx
 * - src/hooks/useFocusTimer.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type {
  FocusSession,
  CreateFocusSessionInput,
  CompleteFocusSessionInput,
  AbandonFocusSessionInput,
  ApiSuccess,
} from '@polaris/shared';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const focusSessionKeys = {
  all:    () => ['focus-sessions'] as const,
  lists:  () => [...focusSessionKeys.all(), 'list'] as const,
  list:   (f: Record<string, unknown>) => [...focusSessionKeys.lists(), f] as const,
  detail: (id: string) => [...focusSessionKeys.all(), 'detail', id] as const,
  stats:  (start: string, end: string) => [...focusSessionKeys.all(), 'stats', start, end] as const,
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** List sessions. Pass { status: 'active' } to get the running session. */
export function useFocusSessions(filter: Record<string, string | number | boolean | undefined> = {}) {
  return useQuery({
    queryKey: focusSessionKeys.list(filter),
    queryFn:  () =>
      api.get<ApiSuccess<FocusSession[]>>('/focus-sessions', filter).then((r) => r.data),
  });
}

/** Get the current active session (if any). */
export function useActiveSession() {
  return useQuery({
    queryKey: focusSessionKeys.list({ status: 'active' }),
    queryFn:  () =>
      api
        .get<ApiSuccess<FocusSession[]>>('/focus-sessions', { status: 'active', limit: 1 })
        .then((r) => r.data[0] ?? null),
    refetchInterval: 5000, // poll every 5s while potentially active
  });
}

/** Aggregate focus minutes per day for an Insights chart. */
export function useFocusStatsByDay(start: string, end: string) {
  return useQuery({
    queryKey: focusSessionKeys.stats(start, end),
    queryFn:  () =>
      api
        .get<ApiSuccess<Record<string, number>>>('/focus-sessions/stats/by-day', { start, end })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Start a new focus session. */
export function useStartFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFocusSessionInput) =>
      api.post<ApiSuccess<FocusSession>>('/focus-sessions', input).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: focusSessionKeys.lists() });
      toast.success('Focus session started');
    },
    onError: () => {
      toast.error('Failed to start session');
    },
  });
}

/** Complete a session and optionally auto-log an Activity. */
export function useCompleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleteFocusSessionInput }) =>
      api
        .post<ApiSuccess<FocusSession>>(`/focus-sessions/${id}/complete`, input)
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: focusSessionKeys.lists() });
      // Invalidate activity lists so the auto-logged activity appears immediately
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Session complete — activity logged!');
    },
    onError: () => {
      toast.error('Failed to complete session');
    },
  });
}

/** Abandon a session (logs partial time if > 2 min). */
export function useAbandonSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AbandonFocusSessionInput }) =>
      api
        .post<ApiSuccess<FocusSession>>(`/focus-sessions/${id}/abandon`, input)
        .then((r) => r.data),
    onSuccess: (_data, { input }) => {
      void queryClient.invalidateQueries({ queryKey: focusSessionKeys.lists() });
      if (input.actualMins > 2) {
        void queryClient.invalidateQueries({ queryKey: ['activities'] });
        toast('Session abandoned — partial time logged', { icon: '↩' });
      } else {
        toast('Session abandoned', { icon: '↩' });
      }
    },
    onError: () => {
      toast.error('Failed to abandon session');
    },
  });
}

/** Delete (soft) a focus session. */
export function useDeleteFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/focus-sessions/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: focusSessionKeys.lists() });
    },
    onError: () => {
      toast.error('Failed to delete session');
    },
  });
}
