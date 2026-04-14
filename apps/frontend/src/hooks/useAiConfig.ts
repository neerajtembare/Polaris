/**
 * @file hooks/useAiConfig.ts
 * @description TanStack Query hooks for AI configuration.
 *   Fetches active provider name, model, and connection status.
 *
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 *   - src/pages/Settings.tsx
 *   - apps/backend/src/controllers/ai.controller.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.ts';
import type { ApiSuccess } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiConfig {
  provider:       'mock' | 'openai' | 'ollama' | 'gemini' | string;
  model:          string;
  status:         'connected' | 'error' | 'unknown' | 'slow';
  statusMessage?: string;
  latencyMs?:     number;
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

/** Fetches the active AI provider, model and connection status from the backend */
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

/** Fetches the list of locally installed Ollama models (only useful when provider is 'ollama') */
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

/**
 * Mutation: switch the active model at runtime.
 * Calls POST /api/ai/config and refetches the config query on success.
 * Takes effect on the backend immediately — no server restart needed.
 */
export function useSetAiModel() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (model: string) => {
      await api.post('/ai/config', { model });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiConfigKeys.config() });
    },
  });
}

/**
 * Mutation: switch the active AI provider at runtime.
 * Calls POST /api/ai/config with { provider } and refetches config.
 */
export function useSetAiProvider() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (provider: string) => {
      await api.post('/ai/config', { provider });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: aiConfigKeys.config() });
    },
  });
}

/**
 * Mutation: set a provider API key at runtime (stored in process.env only — lost on server restart).
 * Calls POST /api/ai/config/key with { provider, apiKey }.
 */
export function useSetApiKey() {
  return useMutation<void, Error, { provider: string; apiKey: string }>({
    mutationFn: async ({ provider, apiKey }) => {
      await api.post('/ai/config/key', { provider, apiKey });
    },
  });
}
