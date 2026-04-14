/**
 * @file hooks/useCommandMatcher.ts
 * @description Client-side command pattern matching for TARS.
 *   Intercepts fixed commands (navigate, audio, focus) BEFORE sending to the API.
 *   Zero network calls — pure pattern matching on normalized input.
 * @module @polaris/frontend/hooks
 *
 * @relatedFiles
 * - hooks/useAssistant.ts
 * - stores/assistant.store.ts (TARSAction)
 */

import { useCallback } from 'react';
import type { TARSAction, ScreenId } from '@/stores/assistant.store';

// ---------------------------------------------------------------------------
// Command definitions
// ---------------------------------------------------------------------------

interface CommandPattern {
  patterns: string[];
  action:   () => TARSAction;
}

const SCREEN_COMMANDS: Array<{ patterns: string[]; screen: ScreenId }> = [
  { patterns: ['go to hub', 'go home', 'home', 'dashboard'],              screen: 'Hub' },
  { patterns: ['go to goals', 'show goals', 'goals', 'open goals'],       screen: 'Goals' },
  { patterns: ['go to insights', 'insights', 'show insights', 'stats'],   screen: 'Insights' },
  { patterns: ['go to history', 'history', 'show history', 'past'],       screen: 'History' },
  { patterns: ['go to settings', 'settings', 'preferences'],              screen: 'Settings' },
  { patterns: ['weekly review', 'weekly', 'week review'],                 screen: 'WeeklyReview' },
];

const COMMAND_PATTERNS: CommandPattern[] = [
  // Audio
  { patterns: ['play music', 'play audio', 'play', 'start music', 'music on'],
    action: () => ({ type: 'audio.play' }) },
  { patterns: ['stop music', 'pause music', 'stop audio', 'music off', 'quiet'],
    action: () => ({ type: 'audio.stop' }) },
  { patterns: ['next track', 'next music', 'skip', 'change music', 'next stream'],
    action: () => ({ type: 'audio.next' }) },

  // Focus
  { patterns: ['start focus', 'focus mode', 'begin focus', 'focus session', 'pomodoro'],
    action: () => ({ type: 'focus.start' }) },
  { patterns: ['stop focus', 'end focus', 'exit focus', 'cancel focus'],
    action: () => ({ type: 'focus.stop' }) },

  // Quick reads
  { patterns: ['show streak', 'my streak', 'streak', 'how long is my streak'],
    action: () => ({ type: 'show_streak' }) },
  { patterns: ['show my goals', 'list goals', 'what are my goals'],
    action: () => ({ type: 'show_goals' }) },
];

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `matchCommand` function.
 * Call it with the raw user input — it returns a TARSAction if a fixed command
 * matched, or null to fall through to the API.
 */
export function useCommandMatcher() {
  const matchCommand = useCallback((rawInput: string): TARSAction | null => {
    const normalized = normalize(rawInput);

    // Check navigation commands
    for (const { patterns, screen } of SCREEN_COMMANDS) {
      for (const p of patterns) {
        if (normalized === p || normalized.startsWith(`${p} `)) {
          return { type: 'navigate', screen };
        }
      }
    }

    // Check other fixed commands
    for (const { patterns, action } of COMMAND_PATTERNS) {
      for (const p of patterns) {
        if (normalized === p || normalized.includes(p)) {
          return action();
        }
      }
    }

    return null;
  }, []);

  return matchCommand;
}
