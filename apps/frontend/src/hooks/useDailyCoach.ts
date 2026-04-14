/**
 * @file hooks/useDailyCoach.ts
 * @description Fetches the daily AI coaching message once per calendar day.
 *   Result is cached in localStorage under 'polaris:daily-coach:{YYYY-MM-DD}'.
 *   Falls back gracefully when the API is unreachable.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - @tanstack/react-query
 * - @polaris/shared (DailyCoachResponse)
 * - services/api.ts
 *
 * @relatedFiles
 * - apps/backend/src/routes/ai.ts  (GET /api/ai/daily-coach)
 * - components/MorningBanner.tsx
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api.js';
import type { DailyCoachResponse } from '@polaris/shared';

// ---------------------------------------------------------------------------
// localStorage cache helpers — keyed by date so yesterday's cache is ignored
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'polaris:daily-coach:';

function todayKey(): string {
  return `${CACHE_PREFIX}${new Date().toISOString().split('T')[0]}`;
}

function loadCached(): DailyCoachResponse | null {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return null;
    return JSON.parse(raw) as DailyCoachResponse;
  } catch {
    return null;
  }
}

function saveCache(data: DailyCoachResponse): void {
  try {
    // Purge stale keys (any day other than today)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX) && key !== todayKey()) {
        localStorage.removeItem(key);
      }
    }
    localStorage.setItem(todayKey(), JSON.stringify(data));
  } catch {
    // Storage unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

const COACH_KEY = ['daily-coach'] as const;

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface CoachApiResponse {
  success: true;
  data: DailyCoachResponse;
}

// ---------------------------------------------------------------------------
// Hook: useDailyCoach
// ---------------------------------------------------------------------------

/**
 * Returns the daily coaching message for today.
 * - On first load: checks cache → fetches if missing.
 * - Once fetched: result is cached for today; no further network calls.
 * - If AI is unavailable: the fallback quote/suggestion is served by the backend.
 */
export function useDailyCoach() {
  const cached = loadCached();

  return useQuery<DailyCoachResponse>({
    queryKey: COACH_KEY,
    queryFn: async () => {
      const res = await api.get<CoachApiResponse>('/ai/daily-coach');
      const data = res.data;
      saveCache(data);
      return data;
    },
    // Initialise from cache so UI renders immediately without a network spin
    ...(cached !== null && { initialData: cached }),
    // Fetch only once per session (cache already handles per-day)
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// Mutation: "Add to today" from a coach suggestion
// ---------------------------------------------------------------------------

/**
 * Creates a planned activity for today based on the AI suggestion.
 * Invalidates activities cache on success.
 */
export function useAddSuggestionToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestion: DailyCoachResponse['suggestion']) => {
      if (!suggestion) throw new Error('No suggestion to add');
      const today = new Date().toISOString().split('T')[0] as string;
      return api.post('/activities', {
        title:        suggestion.title,
        activityType: suggestion.activityType,
        value:        suggestion.value,
        unit:         suggestion.unit,
        goalId:       suggestion.goalId ?? undefined,
        status:       'planned',
        activityDate: today,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
