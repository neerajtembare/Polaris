/**
 * @file lib/parse-input.ts
 * @description Rule-based natural language parser for activity input.
 *   Extracts title, value, unit from free-text. Works offline — no AI needed.
 *
 * @module @polaris/frontend/lib
 *
 * @relatedFiles
 * - src/lib/units.ts (UNIT_PRESETS)
 * - src/components/activities/SmartInputBar.tsx
 */

import type { ActivityType, UserIntent } from '@polaris/shared';
import { UNIT_PRESETS } from './units';

export interface ParsedInput {
  intent: UserIntent;
  title: string;
  activityType: ActivityType;
  value: number | null;
  unit: string | null;
  confidence: number;
}

const UNIT_ALIASES: Record<string, string> = {
  minute: 'min', minutes: 'min', mins: 'min', min: 'min',
  hour: 'hours', hours: 'hours', hr: 'hours', hrs: 'hours',
  day: 'days', days: 'days',
  km: 'km', kms: 'km', kilometer: 'km', kilometers: 'km', kilometre: 'km',
  mile: 'miles', miles: 'miles', mi: 'miles',
  step: 'steps', steps: 'steps',
  rep: 'reps', reps: 'reps', repetition: 'reps', repetitions: 'reps',
  set: 'sets', sets: 'sets',
  session: 'sessions', sessions: 'sessions',
  kg: 'kg', kgs: 'kg', kilogram: 'kg', kilograms: 'kg',
  lb: 'lbs', lbs: 'lbs', pound: 'lbs', pounds: 'lbs',
  page: 'pages', pages: 'pages', pg: 'pages',
  book: 'books', books: 'books',
  chapter: 'chapters', chapters: 'chapters',
  lesson: 'lessons', lessons: 'lessons',
  task: 'tasks', tasks: 'tasks',
  time: 'times', times: 'times',
};

const UNIT_WORDS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);
const UNIT_REGEX = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_WORDS.join('|')})\\b`, 'i');
const CURRENCY_REGEX = /([₹$])\s*(\d+(?:\.\d+)?)/i;
const FOR_DURATION_REGEX = /\bfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|min)\b/i;
// Matches "1am to 7am", "11:30pm and woke at 6am", "9am – 5pm", etc. — global for all pairs
const TIME_RANGE_REGEX_G = /(\d{1,2})(?::(\d{2}))?\s*(am|pm).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi;

function sumTimeRanges(text: string): number | null {
  const toMin = (h: string, m: string | undefined, p: string): number => {
    let hour = parseInt(h, 10) % 12;
    if (p.toLowerCase() === 'pm') hour += 12;
    return hour * 60 + (m ? parseInt(m, 10) : 0);
  };
  let totalMin = 0;
  let count = 0;
  for (const match of [...text.matchAll(TIME_RANGE_REGEX_G)]) {
    const start = toMin(match[1] ?? '0', match[2], match[3] ?? 'am');
    const end   = toMin(match[4] ?? '0', match[5], match[6] ?? 'am');
    const diff  = end >= start ? end - start : end + 24 * 60 - start;
    if (diff > 0 && diff <= 16 * 60) { totalMin += diff; count++; }
  }
  return count > 0 ? parseFloat((totalMin / 60).toFixed(2)) : null;
}

/**
 * Detect user intent from raw input text (offline).
 */
function detectIntent(lower: string): UserIntent {
  const goalPhrases = [
    'want to', 'want a goal', 'set a goal', 'create a goal', 'make a goal',
    'i plan to', 'my goal is', "i'm trying to", 'i am trying to',
    'i want to start', 'help me track', 'track my', 'i should',
    'i need to', 'long term goal', 'short term goal', 'goal to',
    'set a target', 'commit to', 'starting to',
  ];
  if (goalPhrases.some((p) => lower.includes(p))) return 'create_goal';
  const queryPhrases = [
    'how am i', 'how did i', 'what is my', "what's my", 'show me',
    'how much', 'am i on track', 'my progress', 'my streak',
  ];
  if (queryPhrases.some((p) => lower.includes(p))) return 'query';
  return 'log_activity';
}

/**
 * Parse free-text input into structured activity fields.
 */
export function parseInput(text: string): ParsedInput {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: 'log_activity', title: '', activityType: 'completion', value: null, unit: null, confidence: 0 };
  }

  const intent = detectIntent(trimmed.toLowerCase());

  let value: number | null = null;
  let unit: string | null = null;
  let confidence = 0.5;
  let activityType: ActivityType = 'quantity';
  let title = trimmed;

  // Time-range detection first (highest specificity): "slept at 1am and woke at 7am"
  // Supports multiple segments — sums all pairs (e.g. 5pm→8pm + 11pm→5am = 9h)
  const timeRangeValue = sumTimeRanges(trimmed);
  if (timeRangeValue !== null) {
    value = timeRangeValue;
    unit = 'hours';
    activityType = 'duration';
    confidence = 0.88;
  }

  const forMatch = timeRangeValue === null ? FOR_DURATION_REGEX.exec(trimmed) : null;
  if (forMatch) {
    value = parseFloat(forMatch[1] ?? '0');
    unit = UNIT_ALIASES[(forMatch[2] ?? '').toLowerCase()] ?? (forMatch[2] ?? null);
    confidence = 0.85;
    title = trimmed.replace(forMatch[0], '').trim();
  }

  if (value === null) {
    const currMatch = CURRENCY_REGEX.exec(trimmed);
    if (currMatch) {
      unit = currMatch[1] ?? null;
      value = parseFloat(currMatch[2] ?? '0');
      confidence = 0.9;
      title = trimmed.replace(currMatch[0], '').trim();
    }
  }

  if (value === null) {
    const unitMatch = UNIT_REGEX.exec(trimmed);
    if (unitMatch) {
      value = parseFloat(unitMatch[1] ?? '0');
      unit = UNIT_ALIASES[(unitMatch[2] ?? '').toLowerCase()] ?? (unitMatch[2] ?? null);
      confidence = 0.85;
      title = trimmed.replace(unitMatch[0], '').trim();
    }
  }

  title = title.replace(/\s+/g, ' ').trim();
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }
  if (title.length < 2) {
    title = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  // Infer activityType from unit if not already set by time-range detection
  if (activityType === 'quantity') {
    if (unit) {
      const preset = UNIT_PRESETS.find(
        (p) => p.label.toLowerCase() === unit?.toLowerCase()
      );
      activityType = preset?.activityType ?? 'quantity';
    } else if (value === null) {
      activityType = 'completion';
    }
  }

  if (value !== null && unit !== null) {
    confidence = Math.max(confidence, 0.85);
  } else if (value !== null) {
    confidence = Math.max(confidence, 0.6);
  } else {
    confidence = 0.5;
  }

  return { intent, title, activityType, value, unit, confidence };
}

interface GoalMatch {
  goalId: string;
  goalTitle: string;
  confidence: number;
}

/**
 * Try to match input text against goal titles using word overlap scoring.
 */
export function matchGoal(
  text: string,
  goals: Array<{ id: string; title: string; targetUnit?: string | null }>
): GoalMatch | null {
  if (!text.trim() || goals.length === 0) return null;

  const inputWords = text.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (inputWords.length === 0) return null;

  let bestMatch: GoalMatch | null = null;
  let bestScore = 0;

  for (const goal of goals) {
    const goalWords = goal.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (goalWords.length === 0) continue;

    const matches = inputWords.filter((w) =>
      goalWords.some((gw) => gw.includes(w) || w.includes(gw))
    );

    if (matches.length === 0) continue;

    const score = matches.length / Math.max(goalWords.length, inputWords.length);

    if (score > bestScore && score >= 0.3) {
      bestScore = score;
      bestMatch = {
        goalId: goal.id,
        goalTitle: goal.title,
        confidence: Math.min(score + 0.2, 1.0),
      };
    }
  }

  return bestMatch;
}
