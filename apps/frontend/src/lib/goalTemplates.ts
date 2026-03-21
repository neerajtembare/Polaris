/**
 * @file lib/goalTemplates.ts
 * @description Keyword → unit/type suggestion map for the GoalCreate title field.
 *   When a user types a goal title that matches one of the keywords below, a
 *   dismissible suggestion strip offers to pre-fill the unit (and activity type).
 *
 *   This is intentionally simple and 100% client-side — no AI calls.
 *   It serves as the foundation for future AI-powered auto-fill.
 */

import type { ActivityType } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

export interface GoalTemplate {
  /** Unit string to suggest (matches UNIT_PRESETS or is custom) */
  suggestedUnit:         string;
  /** Inferred activity type for this unit */
  suggestedActivityType: ActivityType;
  /** Friendly description shown in the suggestion strip */
  description:           string;
}

/**
 * Map of lowercase keyword → template.
 * The matcher checks if ANY word in the goal title contains a key as a substring.
 * Order doesn't matter — first match wins (longest key takes priority via sort).
 */
export const GOAL_TEMPLATES: Record<string, GoalTemplate> = {
  // ——— Reading ———
  read:    { suggestedUnit: 'pages',    suggestedActivityType: 'quantity', description: 'Looks like a reading goal — track by pages?' },
  book:    { suggestedUnit: 'books',    suggestedActivityType: 'quantity', description: 'Looks like a reading goal — track by books?' },
  chapter: { suggestedUnit: 'chapters', suggestedActivityType: 'quantity', description: 'Looks like a reading goal — track by chapters?' },

  // ——— Running / Distance ———
  run:     { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a running goal — track distance in km?' },
  walk:    { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a walking goal — track distance in km?' },
  hike:    { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a hiking goal — track distance in km?' },
  cycle:   { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a cycling goal — track distance in km?' },
  bike:    { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a cycling goal — track distance in km?' },
  swim:    { suggestedUnit: 'km',       suggestedActivityType: 'quantity', description: 'Looks like a swimming goal — track distance in km?' },
  step:    { suggestedUnit: 'steps',    suggestedActivityType: 'quantity', description: 'Looks like a step-count goal — track by steps?' },

  // ——— Study / Learn ———
  study:   { suggestedUnit: 'hours',    suggestedActivityType: 'duration', description: 'Looks like a study goal — track time in hours?' },
  learn:   { suggestedUnit: 'hours',    suggestedActivityType: 'duration', description: 'Looks like a learning goal — track time in hours?' },
  course:  { suggestedUnit: 'lessons',  suggestedActivityType: 'quantity', description: 'Looks like a course goal — track by lessons?' },
  lesson:  { suggestedUnit: 'lessons',  suggestedActivityType: 'quantity', description: 'Looks like a learning goal — track by lessons?' },
  practi:  { suggestedUnit: 'min',      suggestedActivityType: 'duration', description: 'Looks like a practice goal — track time in minutes?' },

  // ——— Workout / Gym ———
  workout: { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a workout goal — track by sessions?' },
  gym:     { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a gym goal — track by sessions?' },
  train:   { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a training goal — track by sessions?' },

  // ——— Meditation / Mindfulness ———
  meditat: { suggestedUnit: 'min',      suggestedActivityType: 'duration', description: 'Looks like a meditation goal — track time in minutes?' },
  mindful: { suggestedUnit: 'min',      suggestedActivityType: 'duration', description: 'Looks like a mindfulness goal — track time in minutes?' },
  yoga:    { suggestedUnit: 'min',      suggestedActivityType: 'duration', description: 'Looks like a yoga goal — track time in minutes?' },

  // ——— Writing / Creative ———
  write:   { suggestedUnit: 'pages',    suggestedActivityType: 'quantity', description: 'Looks like a writing goal — track by pages?' },
  writ:    { suggestedUnit: 'pages',    suggestedActivityType: 'quantity', description: 'Looks like a writing goal — track by pages?' },
  journal: { suggestedUnit: 'pages',    suggestedActivityType: 'quantity', description: 'Looks like a journalling goal — track by pages?' },
  draw:    { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a drawing goal — track by sessions?' },
  sketch:  { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a sketching goal — track by sessions?' },

  // ——— Finance / Savings ———
  save:    { suggestedUnit: '₹',        suggestedActivityType: 'quantity', description: 'Looks like a savings goal — track by amount?' },
  spend:   { suggestedUnit: '₹',        suggestedActivityType: 'quantity', description: 'Looks like a spending goal — track by amount?' },
  invest:  { suggestedUnit: '₹',        suggestedActivityType: 'quantity', description: 'Looks like an investment goal — track by amount?' },

  // ——— Sleep / Health ———
  sleep:   { suggestedUnit: 'hours',    suggestedActivityType: 'duration', description: 'Looks like a sleep goal — track hours of sleep?' },
  water:   { suggestedUnit: 'sessions', suggestedActivityType: 'quantity', description: 'Looks like a hydration goal — track by sessions?' },
  fast:    { suggestedUnit: 'hours',    suggestedActivityType: 'duration', description: 'Looks like a fasting goal — track fasting hours?' },
};

// Sort keys longest-first so more specific matches win (e.g. "chapter" > "read")
const SORTED_KEYS = Object.keys(GOAL_TEMPLATES).sort((a, b) => b.length - a.length);

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

/**
 * Given a goal title string, return the first matching GoalTemplate, or null.
 * Match is case-insensitive substring on individual words.
 */
export function matchGoalTemplate(title: string): GoalTemplate | null {
  if (!title.trim()) return null;
  const lower = title.toLowerCase();
  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) {
      return GOAL_TEMPLATES[key] ?? null;
    }
  }
  return null;
}
