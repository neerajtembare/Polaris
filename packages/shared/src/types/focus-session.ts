/**
 * @file types/focus-session.ts
 * @description Shared types for FocusSession — used by backend service,
 *   frontend hooks, and API serialisation layer.
 * @module @polaris/shared/types
 *
 * @dependencies
 * - None (pure TypeScript types)
 *
 * @relatedFiles
 * - apps/backend/src/services/focus-session.service.ts
 * - apps/frontend/src/hooks/useFocusSessions.ts
 */

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type FocusSessionStatus = 'active' | 'completed' | 'abandoned';

export interface FocusSession {
  id:          string;
  goalId:      string | null;
  activityId:  string | null;
  plannedMins: number;
  actualMins:  number | null;
  breaks:      number;
  status:      FocusSessionStatus;
  startedAt:   string; // ISO-8601
  endedAt:     string | null;
  notes:       string | null;
  userId:      string | null;
  isDeleted:   boolean;
  createdAt:   string;
  updatedAt:   string;
}

// ---------------------------------------------------------------------------
// API input shapes
// ---------------------------------------------------------------------------

/** Body for POST /api/focus-sessions */
export interface CreateFocusSessionInput {
  goalId?:     string;
  plannedMins: number;
  notes?:      string;
}

/** Body for PATCH /api/focus-sessions/:id */
export interface UpdateFocusSessionInput {
  status?:     FocusSessionStatus;
  actualMins?: number;
  breaks?:     number;
  endedAt?:    string;
  notes?:      string;
  activityId?: string;
}

/** Body for POST /api/focus-sessions/:id/complete */
export interface CompleteFocusSessionInput {
  actualMins:    number;
  breaks?:       number;
  notes?:        string;
  /** If true, auto-creates an Activity linked to this session */
  autoLogActivity?: boolean;
}

/** Body for POST /api/focus-sessions/:id/abandon */
export interface AbandonFocusSessionInput {
  actualMins: number;
  notes?:     string;
}
