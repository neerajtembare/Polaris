/**
 * @file hooks/useCommandMatcher.ts
 * @description Client-side command pattern matching for TARS.
 *   Matches fixed commands (navigate, audio, focus) before hitting the API.
 *   Returns null when no pattern matches — caller then sends to /api/ai/chat.
 *   Zero LLM calls for ~20% of common interactions.
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 * - hooks/useAssistant.ts
 * - stores/assistant.store.ts (TARSAction, ScreenId)
 */

import { useCallback } from 'react';
import type { TARSAction, ScreenId } from '@/stores/assistant.store';

// ---------------------------------------------------------------------------
// Pattern tables
// ---------------------------------------------------------------------------

interface CommandPattern {
  patterns: RegExp[];
  action:   TARSAction;
}

const NAV_COMMANDS: Array<{ patterns: RegExp[]; screen: ScreenId }> = [
  { patterns: [/\bhome\b|\bhub\b|\bdashboard\b/],            screen: 'Hub' },
  { patterns: [/\bgoals?\b|\bgoal list\b/],                  screen: 'Goals' },
  { patterns: [/\binsights?\b|\bstats?\b|\banalytics\b/],    screen: 'Insights' },
  { patterns: [/\bhistory\b|\bactivity log\b|\blog\b/],      screen: 'History' },
  { patterns: [/\bsettings?\b|\bpreferences?\b|\bconfig\b/], screen: 'Settings' },
  { patterns: [/\bweekly review\b|\bweek review\b|\breview\b/], screen: 'WeeklyReview' },
];

const OTHER_COMMANDS: CommandPattern[] = [
  // Audio
  {
    patterns: [/\bplay\b.*\bmusic\b|\bstart music\b|\bmusic on\b|\baudio on\b/],
    action: { type: 'audio.play' },
  },
  {
    patterns: [/\bstop\b.*\bmusic\b|\bmusic off\b|\baudio off\b|\bpause music\b/],
    action: { type: 'audio.stop' },
  },
  {
    patterns: [/\bnext\b.*\b(track|song|stream)\b|\bskip\b/],
    action: { type: 'audio.next' },
  },
  // Focus
  {
    patterns: [/\bstart focus\b|\bfocus mode\b|\bpomodoro\b|\bfocus session\b/],
    action: { type: 'focus.start' },
  },
  {
    patterns: [/\bstop focus\b|\bend focus\b|\bfocus off\b/],
    action: { type: 'focus.stop' },
  },
  // Quick display
  {
    patterns: [/\bshow goals?\b|\bmy goals\b|\blist goals?\b/],
    action: { type: 'show_goals' },
  },
  {
    patterns: [/\bmy streak\b|\bshow streak\b|\bcurrent streak\b|\bstreak\b/],
    action: { type: 'show_streak' },
  },
];

// ---------------------------------------------------------------------------
// Normalise input
// ---------------------------------------------------------------------------

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `match(input)` function.
 * Call it before sending a message to the API.
 * If it returns a TARSAction, execute that action directly — no API call needed.
 * If it returns null, send to /api/ai/chat.
 */
export function useCommandMatcher() {
  const match = useCallback((input: string): TARSAction | null => {
    const norm = normalise(input);

    // Navigation commands
    for (const nav of NAV_COMMANDS) {
      if (nav.patterns.some((p) => p.test(norm))) {
        return { type: 'navigate', screen: nav.screen };
      }
    }

    // Other fixed commands
    for (const cmd of OTHER_COMMANDS) {
      if (cmd.patterns.some((p) => p.test(norm))) {
        return cmd.action;
      }
    }

    return null;
  }, []);

  return { match };
}
