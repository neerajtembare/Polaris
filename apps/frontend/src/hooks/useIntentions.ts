/**
 * @file hooks/useIntentions.ts
 * @description Manages daily intentions stored in localStorage, keyed by date.
 *   Intentions are lightweight "what will you do today?" commitments.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - date-fns
 *
 * @relatedFiles
 * - components/IntentionsPanel.tsx
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Intention {
  id: string;
  text: string;
  checked: boolean;
}

type IntentionsMap = Intention[];

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(): string {
  return `polaris_intentions_${format(new Date(), 'yyyy-MM-dd')}`;
}

function loadIntentions(): IntentionsMap {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return [];
    return JSON.parse(raw) as IntentionsMap;
  } catch {
    return [];
  }
}

function saveIntentions(intentions: IntentionsMap): void {
  localStorage.setItem(todayKey(), JSON.stringify(intentions));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages today's intentions (daily commitments) in localStorage.
 * Data is scoped to the current calendar day.
 */
export function useIntentions() {
  const [intentions, setIntentions] = useState<Intention[]>(loadIntentions);

  const addIntention = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const next: Intention[] = [
      ...intentions,
      { id: `${Date.now()}`, text: trimmed, checked: false },
    ];
    setIntentions(next);
    saveIntentions(next);
  }, [intentions]);

  const toggleIntention = useCallback((id: string) => {
    const next = intentions.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i
    );
    setIntentions(next);
    saveIntentions(next);
  }, [intentions]);

  const removeIntention = useCallback((id: string) => {
    const next = intentions.filter((i) => i.id !== id);
    setIntentions(next);
    saveIntentions(next);
  }, [intentions]);

  const clearChecked = useCallback(() => {
    const next = intentions.filter((i) => !i.checked);
    setIntentions(next);
    saveIntentions(next);
  }, [intentions]);

  const completedCount = intentions.filter((i) => i.checked).length;
  const totalCount = intentions.length;

  return {
    intentions,
    addIntention,
    toggleIntention,
    removeIntention,
    clearChecked,
    completedCount,
    totalCount,
  };
}
