/**
 * @file hooks/useAssistantActions.ts
 * @description Executes TARSActions using existing app hooks and stores.
 *   The bridge between "TARS proposed an action" and "the app actually does it".
 *   All write actions (log_activity, plan_activity, create_goal) flow through here
 *   AFTER the user confirms via ToolConfirmCard.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - hooks/useActivities.ts (useCreateActivity)
 * - hooks/useGoals.ts (useCreateGoal)
 * - stores/assistant.store.ts
 *
 * @relatedFiles
 * - components/assistant/ToolConfirmCard.tsx
 * - hooks/useAssistant.ts
 */

import { useCallback } from 'react';
import { useCreateActivity } from './useActivities';
import { useCreateGoal }     from './useGoals';
import { useAssistantStore } from '@/stores/assistant.store';
import type { TARSAction, ScreenId } from '@/stores/assistant.store';

interface UseAssistantActionsOptions {
  onNavigate?: (screen: ScreenId) => void;
}

/**
 * Returns an `executeConfirmedAction` function.
 * Call only AFTER the user has accepted the ToolConfirmCard.
 */
export function useAssistantActions({ onNavigate }: UseAssistantActionsOptions = {}) {
  const createActivity = useCreateActivity();
  const createGoal     = useCreateGoal();
  const setPending     = useAssistantStore((s) => s.setPendingAction);
  const addMessage     = useAssistantStore((s) => s.addMessage);

  const executeConfirmedAction = useCallback(async (action: TARSAction) => {
    setPending(null);

    switch (action.type) {
      case 'log_activity': {
        const { draft } = action;
        await createActivity.mutateAsync({
          title:        draft.title,
          activityType: draft.activityType,
          activityDate: draft.date ?? todayIsoDate(),
          status:       'completed',
          ...(draft.value    !== undefined && { value:  draft.value }),
          ...(draft.unit     !== undefined && { unit:   draft.unit }),
          ...(draft.goalId   != null       && { goalId: draft.goalId }),
        });
        // createActivity already shows a toast — no extra addMessage needed
        break;
      }

      case 'plan_activity': {
        const { draft } = action;
        await createActivity.mutateAsync({
          title:        draft.title,
          activityType: draft.activityType,
          activityDate: draft.date ?? todayIsoDate(),
          status:       'planned',
          ...(draft.value    !== undefined && { value:  draft.value }),
          ...(draft.unit     !== undefined && { unit:   draft.unit }),
          ...(draft.goalId   != null       && { goalId: draft.goalId }),
        });
        break;
      }

      case 'create_goal': {
        const { draft } = action;
        await createGoal.mutateAsync({
          title:     draft.title,
          timeframe: draft.timeframe,
          ...(draft.targetValue !== undefined && { targetValue: draft.targetValue }),
          ...(draft.targetUnit  !== undefined && { targetUnit:  draft.targetUnit }),
          ...(draft.description !== undefined && { description: draft.description }),
        });
        break;
      }

      case 'navigate':
        onNavigate?.(action.screen);
        break;

      case 'audio.play':
      case 'audio.stop':
      case 'audio.next':
      case 'focus.start':
      case 'focus.stop':
      case 'show_goals':
      case 'show_streak':
        // Immediate actions — handled by useAssistant on first receipt.
        // If they somehow reach here via confirm, just execute navigation.
        if (action.type === 'show_goals' && onNavigate) {
          onNavigate('Goals');
        }
        break;

      default:
        addMessage({ role: 'assistant', content: 'Action type not recognized.', isNew: true });
    }
  }, [createActivity, createGoal, setPending, addMessage, onNavigate]);

  const dismissAction = useCallback(() => {
    setPending(null);
    addMessage({ role: 'assistant', content: 'Dismissed.', isNew: false });
  }, [setPending, addMessage]);

  return { executeConfirmedAction, dismissAction };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0] as string;
}
