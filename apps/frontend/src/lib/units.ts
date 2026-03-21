/**
 * @file lib/units.ts
 * @description Unit presets and activity-type inference.
 *   Used by GoalCreate (unit picker) and LogActivityForm (auto-fill on goal select).
 */

import type { ActivityType } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Preset catalogue
// ---------------------------------------------------------------------------

export interface UnitPreset {
  label:        string;   // display text and value sent to the API
  activityType: ActivityType;
  group:        'distance' | 'time' | 'volume' | 'body' | 'learning' | 'other';
}

/** Ordered list of common unit presets shown in the picker */
export const UNIT_PRESETS: UnitPreset[] = [
  // Time
  { label: 'min',      activityType: 'duration',   group: 'time'     },
  { label: 'hours',    activityType: 'duration',   group: 'time'     },
  { label: 'days',     activityType: 'quantity',   group: 'time'     },
  // Distance / movement
  { label: 'km',       activityType: 'quantity',   group: 'distance' },
  { label: 'miles',    activityType: 'quantity',   group: 'distance' },
  { label: 'steps',    activityType: 'quantity',   group: 'distance' },
  // Volume / reps
  { label: 'reps',     activityType: 'quantity',   group: 'volume'   },
  { label: 'sets',     activityType: 'quantity',   group: 'volume'   },
  { label: 'sessions', activityType: 'quantity',   group: 'volume'   },
  // Body
  { label: 'kg',       activityType: 'quantity',   group: 'body'     },
  { label: 'lbs',      activityType: 'quantity',   group: 'body'     },
  // Learning / creative
  { label: 'pages',    activityType: 'quantity',   group: 'learning' },
  { label: 'books',    activityType: 'quantity',   group: 'learning' },
  { label: 'chapters', activityType: 'quantity',   group: 'learning' },
  { label: 'lessons',  activityType: 'quantity',   group: 'learning' },
  // Finance / misc
  { label: '₹',        activityType: 'quantity',   group: 'other'    },
  { label: '$',        activityType: 'quantity',   group: 'other'    },
  { label: 'tasks',    activityType: 'quantity',   group: 'other'    },
  { label: 'times',    activityType: 'quantity',   group: 'other'    },
];

/** Just the label strings, in order, for the chip grid */
export const PRESET_LABELS = UNIT_PRESETS.map((p) => p.label);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a unit string, return the recommended ActivityType.
 * Falls back to 'quantity' if the unit isn't recognised.
 * Empty / null unit returns 'completion'.
 */
export function inferActivityType(unit: string | null | undefined): ActivityType {
  if (!unit || unit.trim() === '') return 'completion';
  const preset = UNIT_PRESETS.find(
    (p) => p.label.toLowerCase() === unit.trim().toLowerCase()
  );
  return preset?.activityType ?? 'quantity';
}
