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
import toast from 'react-hot-toast';
import { useCreateActivity, useDeleteActivity } from './useActivities';
import { useCreateGoal, useUpdateGoal, useDeleteGoal } from './useGoals';
import { useAssistantStore } from '@/stores/assistant.store';
import { useAudioPlayer, PRESET_STREAMS } from '@/stores/audioPlayer.store';
import type { TARSAction, ScreenId } from '@/stores/assistant.store';

interface UseAssistantActionsOptions {
  onNavigate?: (screen: ScreenId) => void;
  onToggleTheme?: () => void;
  onStartFocus?: (opts: { durationMins?: number; goalId?: string }) => void;
  onStopFocus?: () => void;
}

/**
 * Returns an `executeConfirmedAction` function.
 * Call only AFTER the user has accepted the ToolConfirmCard.
 */
export function useAssistantActions({ onNavigate, onToggleTheme, onStartFocus, onStopFocus }: UseAssistantActionsOptions = {}) {
  const createActivity  = useCreateActivity();
  const deleteActivity  = useDeleteActivity();
  const createGoal      = useCreateGoal();
  const updateGoal      = useUpdateGoal();
  const deleteGoal      = useDeleteGoal();
  const setPending      = useAssistantStore((s) => s.setPendingAction);
  const addMessage      = useAssistantStore((s) => s.addMessage);
  const clearHistory    = useAssistantStore((s) => s.clearHistory);
  const setLastAction   = useAssistantStore((s) => s.setLastAction);
  const audioPlayer     = useAudioPlayer();

  const executeConfirmedAction = useCallback(async (action: TARSAction) => {
    setPending(null);

    switch (action.type) {
      case 'log_activity': {
        const { draft } = action;
        const loggedActivity = await createActivity.mutateAsync({
          title:        draft.title,
          activityType: draft.activityType,
          activityDate: draft.date ?? todayIsoDate(),
          status:       'completed',
          ...(draft.value    !== undefined && { value:  draft.value }),
          ...(draft.unit     !== undefined && { unit:   draft.unit }),
          ...(draft.goalId   != null       && { goalId: draft.goalId }),
        });
        const activityId = loggedActivity.id;
        setLastAction({ type: 'activity', id: activityId, timestamp: Date.now() });
        let activityUndone = false;
        toast(
          (t) => (
            <span className="flex items-center gap-2">
              Logged!
              <button
                className="underline font-medium"
                onClick={() => {
                  if (activityUndone) return;
                  activityUndone = true;
                  void deleteActivity.mutateAsync(activityId);
                  toast.dismiss(t.id);
                  setLastAction(null);
                }}
              >
                Undo ↩
              </button>
            </span>
          ),
          { duration: 30_000, id: `undo-activity-${activityId}` },
        );
        break;
      }

      case 'plan_activity': {
        const { draft } = action;
        const plannedActivity = await createActivity.mutateAsync({
          title:        draft.title,
          activityType: draft.activityType,
          activityDate: draft.date ?? todayIsoDate(),
          status:       'planned',
          ...(draft.value    !== undefined && { value:  draft.value }),
          ...(draft.unit     !== undefined && { unit:   draft.unit }),
          ...(draft.goalId   != null       && { goalId: draft.goalId }),
        });
        const plannedId = plannedActivity.id;
        setLastAction({ type: 'activity', id: plannedId, timestamp: Date.now() });
        let plannedUndone = false;
        toast(
          (t) => (
            <span className="flex items-center gap-2">
              Planned!
              <button
                className="underline font-medium"
                onClick={() => {
                  if (plannedUndone) return;
                  plannedUndone = true;
                  void deleteActivity.mutateAsync(plannedId);
                  toast.dismiss(t.id);
                  setLastAction(null);
                }}
              >
                Undo ↩
              </button>
            </span>
          ),
          { duration: 30_000, id: `undo-activity-${plannedId}` },
        );
        break;
      }

      case 'create_goal': {
        const { draft } = action;
        const createdGoal = await createGoal.mutateAsync({
          title:     draft.title,
          timeframe: draft.timeframe,
          ...(draft.targetValue !== undefined && { targetValue: draft.targetValue }),
          ...(draft.targetUnit  !== undefined && { targetUnit:  draft.targetUnit }),
          ...(draft.description !== undefined && { description: draft.description }),
        });
        const goalId = createdGoal.id;
        setLastAction({ type: 'goal', id: goalId, timestamp: Date.now() });
        let goalUndone = false;
        toast(
          (t) => (
            <span className="flex items-center gap-2">
              Goal created!
              <button
                className="underline font-medium"
                onClick={() => {
                  if (goalUndone) return;
                  goalUndone = true;
                  void deleteGoal.mutateAsync(goalId);
                  toast.dismiss(t.id);
                  setLastAction(null);
                }}
              >
                Undo ↩
              </button>
            </span>
          ),
          { duration: 30_000, id: `undo-goal-${goalId}` },
        );
        break;
      }

      case 'update_goal_status': {
        const { draft } = action;
        await updateGoal.mutateAsync({
          id: draft.goalId,
          data: { status: draft.status },
        });
        addMessage({
          role: 'assistant',
          content: `Goal status updated to "${draft.status}".`,
          isNew: true,
        });
        break;
      }

      case 'navigate':
        onNavigate?.(action.screen);
        break;

      case 'audio.play': {
        // Genre map: match genre string to PRESET_STREAMS id
        const GENRE_MAP: Record<string, string> = {
          lofi: 'lofi-hiphop',
          'lo-fi': 'lofi-hiphop',
          jazz: 'jazz',
          classical: 'classical',
          ambient: 'ambient',
          chillout: 'chillout',
          chill: 'chillout',
        };
        const genre = (action as unknown as { genre?: string }).genre;
        const targetId = genre ? GENRE_MAP[genre.toLowerCase()] : undefined;
        const target = targetId
          ? (PRESET_STREAMS.find((s) => s.id === targetId) ?? PRESET_STREAMS[0])
          : (audioPlayer.currentStream ?? PRESET_STREAMS[0]);

        if (target) {
          audioPlayer.selectStream(target);
          audioPlayer.play();
          if (!audioPlayer.currentStream || audioPlayer.currentStream.id !== target.id || genre) {
            addMessage({
              role: 'assistant',
              content: `Playing ${target.label}. Say "stop" to pause or "next" to switch.`,
              isNew: true,
            });
          }
        } else {
          addMessage({
            role: 'assistant',
            content: "Couldn't find a station. Try saying 'play lofi' or open the audio player.",
            isNew: true,
          });
        }
        break;
      }

      case 'audio.stop':
        audioPlayer.pause();
        break;

      case 'audio.next':
        audioPlayer.selectStream(
          PRESET_STREAMS[
            (PRESET_STREAMS.findIndex((s) => s.id === audioPlayer.currentStream?.id) + 1) %
              PRESET_STREAMS.length
          ] ?? PRESET_STREAMS[0] ?? null
        );
        break;

      case 'focus.start': {
        const opts: { durationMins?: number; goalId?: string } = {};
        if (action.durationMins !== undefined) opts.durationMins = action.durationMins;
        if (action.goalId       !== undefined) opts.goalId       = action.goalId;
        onStartFocus?.(opts);
        break;
      }

      case 'focus.stop':
        onStopFocus?.();
        addMessage({ role: 'assistant', content: 'Focus session stopped.', isNew: true });
        break;

      case 'toggle_theme':
        onToggleTheme?.();
        break;

      case 'help':
        // help is handled in useAssistant directly (not via actions)
        break;

      case 'show_goals':
        if (onNavigate) onNavigate('Goals');
        break;

      case 'show_streak':
        // No-op here — handled inline by command matcher response text.
        break;

      default:
        addMessage({ role: 'assistant', content: 'Action type not recognized.', isNew: true });
    }
  }, [createActivity, deleteActivity, createGoal, updateGoal, deleteGoal, setPending, addMessage, onNavigate, onToggleTheme, onStartFocus, onStopFocus, setLastAction, audioPlayer]);

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
