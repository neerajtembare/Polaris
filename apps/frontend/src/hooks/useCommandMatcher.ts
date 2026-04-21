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
  { patterns: ['go to hub', 'go home', 'home', 'dashboard', 'hub'],        screen: 'Hub' },
  { patterns: ['go to goals', 'show goals', 'goals', 'open goals', 'my goals', 'goal list'], screen: 'Goals' },
  { patterns: ['go to insights', 'insights', 'show insights', 'stats', 'analytics'],   screen: 'Insights' },
  { patterns: ['go to history', 'history', 'show history', 'past', 'past activities'], screen: 'History' },
  { patterns: ['go to settings', 'settings', 'preferences'],                screen: 'Settings' },
  { patterns: ['weekly review', 'weekly', 'week review', 'review'],         screen: 'WeeklyReview' },
];

const COMMAND_PATTERNS: CommandPattern[] = [
  // Audio
  { patterns: ['play music', 'play audio', 'play', 'start music', 'music on', 'music'],
    action: () => ({ type: 'audio.play' }) },
  { patterns: ['stop music', 'pause music', 'stop audio', 'music off', 'quiet', 'stop', 'pause'],
    action: () => ({ type: 'audio.stop' }) },
  { patterns: ['next track', 'next music', 'skip', 'change music', 'next stream', 'next'],
    action: () => ({ type: 'audio.next' }) },

  // Play by genre
  { patterns: ['play lofi', 'lofi', 'lo-fi', 'lo fi'],
    action: () => ({ type: 'audio.play', genre: 'lofi' } as unknown as TARSAction) },
  { patterns: ['play jazz', 'jazz'],
    action: () => ({ type: 'audio.play', genre: 'jazz' } as unknown as TARSAction) },
  { patterns: ['play classical', 'classical'],
    action: () => ({ type: 'audio.play', genre: 'classical' } as unknown as TARSAction) },
  { patterns: ['play ambient', 'ambient'],
    action: () => ({ type: 'audio.play', genre: 'ambient' } as unknown as TARSAction) },
  { patterns: ['play chillout', 'chillout', 'chill'],
    action: () => ({ type: 'audio.play', genre: 'chillout' } as unknown as TARSAction) },

  // Focus
  { patterns: ['start focus', 'focus mode', 'begin focus', 'focus session', 'pomodoro', 'focus'],
    action: () => ({ type: 'focus.start' }) },
  { patterns: ['stop focus', 'end focus', 'exit focus', 'cancel focus'],
    action: () => ({ type: 'focus.stop' }) },

  // Quick reads
  { patterns: ['show streak', 'my streak', 'streak', 'how long is my streak'],
    action: () => ({ type: 'show_streak' }) },
  { patterns: ['show my goals', 'list goals', 'what are my goals'],
    action: () => ({ type: 'show_goals' }) },

  // UI
  { patterns: ['clear chat', 'clear', 'reset chat', 'start over'],
    action: () => ({ type: 'clear_chat' } as unknown as TARSAction) },
  { patterns: ['dark mode', 'dark theme', 'switch to dark', 'go dark'],
    action: () => ({ type: 'toggle_theme' }) },
  { patterns: ['light mode', 'light theme', 'switch to light', 'go light'],
    action: () => ({ type: 'toggle_theme' }) },
  { patterns: ['toggle theme', 'switch theme', 'change theme', 'toggle dark'],
    action: () => ({ type: 'toggle_theme' }) },
  { patterns: ['help', 'what can you do', 'what can you do?', 'commands', 'command list', 'what do you do'],
    action: () => ({ type: 'help' }) },
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
