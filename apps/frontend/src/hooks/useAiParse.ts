/**
 * @file hooks/useAiParse.ts
 * @description Shared hook for AI activity parsing.
 *   Single implementation used by SmartInputBar, LogActivityForm, QuickLogModal.
 *   - Only calls AI when local confidence is below threshold (skips unnecessary calls)
 *   - Returns structured loading + result state
 *   - Falls back silently on error (user already has local parse)
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/components/activities/SmartInputBar.tsx
 *   - src/components/activities/LogActivityForm.tsx
 *   - src/components/activities/QuickLogModal.tsx
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api.js';
import type { ApiSuccess, AIActivityParse, UserIntent } from '@polaris/shared';

/** Minimum local confidence score below which we bother calling the AI. */
const AI_THRESHOLD = 0.85;

export interface AiParseResult {
  intent:      UserIntent;
  title:       string;
  activityType: 'quantity' | 'duration' | 'completion';
  value:       number | null;
  unit:        string | null;
  goalId:      string | null;
  goalTitle:   string | null;
  confidence:  number;
  provider:    string;
}

export interface UseAiParseReturn {
  /** Trigger AI parse.  Resolves to the AI result, or null if skipped/error. */
  aiParse: (rawInput: string, localConfidence?: number) => Promise<AiParseResult | null>;
  /** True while awaiting the AI response */
  isLoading: boolean;
  /** Last successful AI result */
  result: AiParseResult | null;
  /** Clear result (e.g., on form reset) */
  clear: () => void;
}

/**
 * Call POST /api/ai/parse-activity and return a normalised result.
 * If localConfidence >= AI_THRESHOLD the call is skipped — local parse is
 * good enough and we don't waste Ollama/OpenAI quota.
 */
export function useAiParse(): UseAiParseReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiParseResult | null>(null);

  const aiParse = useCallback(
    async (rawInput: string, localConfidence = 0): Promise<AiParseResult | null> => {
      const text = rawInput.trim();
      if (!text) return null;

      // Skip if local parse is already high-confidence
      if (localConfidence >= AI_THRESHOLD) return null;

      setIsLoading(true);
      try {
        const res = await api.post<ApiSuccess<AIActivityParse>>(
          '/ai/parse-activity',
          { rawInput: text }
        );
        const ai = res.data;
        const parsed: AiParseResult = {
          intent:       ai.intent ?? 'log_activity',
          title:        ai.title,
          activityType: ai.activityType,
          value:        ai.value,
          unit:         ai.unit,
          goalId:       ai.suggestedGoalId,
          goalTitle:    ai.suggestedGoalTitle,
          confidence:   ai.confidence,
          provider:     ai.provider,
        };
        setResult(parsed);
        return parsed;
      } catch {
        // AI unavailable — caller falls back to local parse silently
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setResult(null);
  }, []);

  return { aiParse, isLoading, result, clear };
}
