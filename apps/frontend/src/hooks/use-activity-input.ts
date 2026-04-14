/**
 * @file hooks/use-activity-input.ts
 * @description Core parse → confirm → save logic for activity input.
 *   Extracts stateful business logic from SmartInputBar so the component
 *   can focus purely on rendering and user interaction.
 *
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - hooks/useActivities (useCreateActivity)
 * - hooks/useGoals (useGoals)
 * - hooks/useAiParse (useAiParse)
 * - hooks/useVoiceActivity (useVoiceActivity)
 * - lib/parse-input (parseInput, matchGoal)
 *
 * @relatedFiles
 * - src/components/activities/SmartInputBar.tsx
 * - src/components/activities/ParsedActivityCard.tsx
 */

import { useState, useRef, useCallback } from 'react';
import { useCreateActivity } from './useActivities';
import { useGoals } from './useGoals';
import { useVoiceActivity } from './useVoiceActivity';
import { useAiParse } from './useAiParse';
import { parseInput, matchGoal } from '../lib/parse-input';
import type { ParsedFields } from '../components/activities/ParsedActivityCard';

function todayIso(): string {
  return new Date().toISOString().split('T')[0] as string;
}

export interface UseActivityInputOptions {
  /**
   * Called when the AI detects a create_goal intent and the user confirms.
   * Receives pre-filled URLSearchParams (title, unit, target).
   * If not provided, the goal creation path is silently ignored.
   */
  onNavigateToGoalCreate?: (params: URLSearchParams) => void;
}

export interface UseActivityInputReturn {
  /** Current parsed result awaiting user confirmation. null when idle. */
  parsedResult: ParsedFields | null;
  /** True while waiting for the AI upgrade call to return. */
  isAiParsing: boolean;
  /** True while the save mutation is in-flight. */
  isSaving: boolean;
  /** Active goals list — passed straight through to ParsedActivityCard. */
  goals: Array<{ id: string; title: string }>;
  /**
   * Parse a text input string.
   * Runs local NLP first, shows result immediately, then fires AI upgrade if
   * local confidence is below the threshold.
   */
  handleSubmitInput: (text: string) => Promise<void>;
  /** Handle a voice audio blob: transcribe → AI parse → set parsedResult. */
  handleVoiceBlob: (blob: Blob) => Promise<void>;
  /** Save the confirmed parsed result as a new completed Activity. */
  handleSave: (fields: ParsedFields) => Promise<void>;
  /** Navigate to goal creation with pre-filled fields from parsedResult. */
  handleCreateGoal: () => void;
  /** Override a create_goal intent — flip to log_activity so card renders. */
  handleLogAsActivity: () => void;
  /** Clear parsedResult. */
  handleDismiss: () => void;
  /** True while voice transcription / AI pipeline is running. */
  isVoiceProcessing: boolean;
}

/**
 * Central hook for the Polaris activity input flow.
 *
 * Parse sequence:
 *   1. User submits text
 *   2. Local rule-based parse runs synchronously (instant feedback)
 *   3. If confidence < threshold, AI parse runs and may upgrade the result
 *   4. User reviews ParsedActivityCard, edits if needed, and confirms
 *   5. Activity is saved via POST /api/activities
 */
export function useActivityInput(
  options: UseActivityInputOptions = {}
): UseActivityInputReturn {
  const { onNavigateToGoalCreate } = options;

  const [parsedResult, setParsedResult] = useState<ParsedFields | null>(null);
  const [isAiParsing, setIsAiParsing]   = useState(false);

  // Track whether the user has already saved so we can discard a late AI response
  const savedRef = useRef(false);

  // Preserve the original user text for rawInput — cleared when the input
  // field resets, but the ref survives until save fires.
  const rawInputRef = useRef('');

  const createActivity            = useCreateActivity();
  const { data: rawGoals = [] }   = useGoals({ status: 'active' });
  const { transcribeAndParse, isProcessing: isVoiceProcessing } = useVoiceActivity();
  const { aiParse }               = useAiParse();

  const goals = rawGoals.map((g) => ({ id: g.id, title: g.title }));
  const goalContext = rawGoals.map((g) => ({
    id:         g.id,
    title:      g.title,
    targetUnit: g.targetUnit,
  }));

  // ---------------------------------------------------------------------------
  // handleSubmitInput
  // ---------------------------------------------------------------------------

  const handleSubmitInput = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;

      rawInputRef.current = trimmed;
      savedRef.current = false; // reset saved flag for each new submission

      // Step 1: instant rule-based parse
      const localParsed = parseInput(trimmed);
      const goalMatch   = matchGoal(trimmed, goalContext);

      const initial: ParsedFields = {
        intent:       localParsed.intent,
        title:        localParsed.title,
        activityType: localParsed.activityType,
        value:        localParsed.value,
        unit:         localParsed.unit,
        goalId:       goalMatch?.goalId ?? null,
        goalTitle:    goalMatch?.goalTitle ?? null,
        confidence:   localParsed.confidence,
        source:       'local',
      };

      setParsedResult(initial);

      // Step 2: AI upgrade when local confidence is below threshold
      setIsAiParsing(true);
      try {
        const aiResult = await aiParse(trimmed, initial.confidence);
        if (!savedRef.current && aiResult && aiResult.confidence > initial.confidence) {
          setParsedResult({
            intent:       aiResult.intent,
            title:        aiResult.title,
            activityType: aiResult.activityType,
            value:        aiResult.value,
            unit:         aiResult.unit,
            goalId:       aiResult.goalId,
            goalTitle:    aiResult.goalTitle,
            confidence:   aiResult.confidence,
            source:       'ai',
          });
        }
      } finally {
        setIsAiParsing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goalContext, aiParse]
  );

  // ---------------------------------------------------------------------------
  // handleVoiceBlob
  // ---------------------------------------------------------------------------

  const handleVoiceBlob = useCallback(
    async (blob: Blob): Promise<void> => {
      const result = await transcribeAndParse(blob);
      if (result) {
        rawInputRef.current = result.transcript;
        setParsedResult({
          intent:       result.parsed.intent ?? 'log_activity',
          title:        result.parsed.title,
          activityType: result.parsed.activityType,
          value:        result.parsed.value,
          unit:         result.parsed.unit,
          goalId:       result.parsed.suggestedGoalId,
          goalTitle:    result.parsed.suggestedGoalTitle,
          confidence:   result.parsed.confidence,
          source:       'voice',
        });
      }
    },
    [transcribeAndParse]
  );

  // ---------------------------------------------------------------------------
  // handleSave
  // ---------------------------------------------------------------------------

  const handleSave = useCallback(
    async (fields: ParsedFields): Promise<void> => {
      savedRef.current = true;
      await createActivity.mutateAsync({
        title:        fields.title,
        activityType: fields.activityType,
        activityDate: todayIso(),
        status:       'completed',
        ...(fields.value  !== null ? { value:  fields.value }  : {}),
        ...(fields.unit              ? { unit:   fields.unit }   : {}),
        ...(fields.goalId            ? { goalId: fields.goalId } : {}),
        ...(fields.tags?.length      ? { tags:   fields.tags }   : {}),
        rawInput: rawInputRef.current || fields.title,
      });
      setParsedResult(null);
      rawInputRef.current = '';
    },
    [createActivity]
  );

  // ---------------------------------------------------------------------------
  // handleCreateGoal
  // ---------------------------------------------------------------------------

  const handleCreateGoal = useCallback((): void => {
    if (!parsedResult) return;
    if (onNavigateToGoalCreate) {
      const params = new URLSearchParams();
      params.set('title', parsedResult.title);
      if (parsedResult.unit)              params.set('unit',   parsedResult.unit);
      if (parsedResult.value !== null)    params.set('target', String(parsedResult.value));
      onNavigateToGoalCreate(params);
    }
    setParsedResult(null);
  }, [parsedResult, onNavigateToGoalCreate]);

  // ---------------------------------------------------------------------------
  // Utility handlers
  // ---------------------------------------------------------------------------

  const handleLogAsActivity = useCallback((): void => {
    if (!parsedResult) return;
    setParsedResult({ ...parsedResult, intent: 'log_activity' });
  }, [parsedResult]);

  const handleDismiss = useCallback((): void => {
    setParsedResult(null);
  }, []);

  return {
    parsedResult,
    isAiParsing,
    isSaving:          createActivity.isPending,
    goals,
    handleSubmitInput,
    handleVoiceBlob,
    handleSave,
    handleCreateGoal,
    handleLogAsActivity,
    handleDismiss,
    isVoiceProcessing,
  };
}
