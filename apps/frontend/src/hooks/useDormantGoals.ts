/**
 * @file hooks/useDormantGoals.ts
 * @description TanStack Query hook for GET /api/goals/dormant.
 *   Returns active goals with no completed activity for >= 7 days.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - @polaris/shared (DormantGoal)
 * - services/api.ts
 *
 * @relatedFiles
 * - apps/backend/src/services/dormancy.service.ts
 * - components/WeeklyReview.tsx
 * - components/GoalMatrix.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import type { DormantGoal } from '@polaris/shared';
import toast from 'react-hot-toast';

interface DormantGoalsResponse {
  success: true;
  data: DormantGoal[];
}

export function useDormantGoals() {
  return useQuery<DormantGoal[]>({
    queryKey: ['goals', 'dormant'],
    queryFn: async () => {
      const res = await api.get<DormantGoalsResponse>('/goals/dormant');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * One-tap "add to today" from a dormant goal — creates a planned activity for today.
 */
export function useAddDormantToToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: DormantGoal) => {
      const today = new Date().toISOString().split('T')[0] as string;
      return api.post('/activities', {
        title:        `Work on: ${goal.title}`,
        activityType: 'completion',
        value:        1,
        unit:         'session',
        goalId:       goal.id,
        status:       'planned',
        activityDate: today,
      });
    },
    onSuccess: (_, goal) => {
      toast.success(`Added "${goal.title}" to today ✓`);
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: () => toast.error('Could not add activity'),
  });
}
