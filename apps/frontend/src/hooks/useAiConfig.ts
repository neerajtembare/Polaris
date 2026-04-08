/**
 * @file hooks/useAiConfig.ts
 * @description TanStack Query hooks for AI configuration.
 *   Fetches active provider name, Ollama model, and available Ollama models.
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/pages/Settings.tsx
 *   - apps/backend/src/controllers/ai.controller.ts
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api.ts';
import type { ApiSuccess } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiConfig {
  provider: 'mock' | 'openai' | 'ollama' | string;
  ollamaModel: string | null;
  ollamaUrl: string | null;
}

interface OllamaModelsData {
  models: string[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const aiConfigKeys = {
  all:    ['ai-config'] as const,
  config: () => [...aiConfigKeys.all, 'config'] as const,
  models: () => [...aiConfigKeys.all, 'ollama-models'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Fetches the active AI provider + Ollama model from the backend */
export function useAiConfig() {
  return useQuery<AiConfig, Error>({
    queryKey: aiConfigKeys.config(),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<AiConfig>>('/ai/config');
      return res.data;
    },
    staleTime: 30_000,
  });
}

/** Fetches the list of locally installed Ollama models */
export function useOllamaModels(enabled = true) {
  return useQuery<string[], Error>({
    queryKey: aiConfigKeys.models(),
    queryFn: async () => {
      const res = await api.get<ApiSuccess<OllamaModelsData>>('/ai/ollama-models');
      return res.data.models;
    },
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}
