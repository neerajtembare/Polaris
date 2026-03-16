/**
 * @file types/activity.ts
 * @description Activity domain types shared across frontend and backend
 * @module @polaris/shared/types
 */

export type ActivityType = 'quantity' | 'duration' | 'completion';
export type ActivityCategory = 'growth' | 'maintenance';
export type ActivityStatus = 'planned' | 'completed' | 'skipped';

export interface Activity {
  id: string;
  title: string;
  notes: string | null;
  activityType: ActivityType;
  value: number | null;
  unit: string | null;
  rawInput: string | null;
  goalId: string | null;
  activityDate: string; // ISO date string
  category: ActivityCategory;
  status: ActivityStatus;
  aiGenerated: boolean;
  aiCategorized: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateActivityInput {
  title: string;
  notes?: string;
  activityType: ActivityType;
  value?: number;
  unit?: string;
  rawInput?: string;
  goalId?: string;
  activityDate: string;
  category?: ActivityCategory;
  status?: ActivityStatus;
}

export interface UpdateActivityInput {
  title?: string;
  notes?: string | null;
  activityType?: ActivityType;
  value?: number | null;
  unit?: string | null;
  goalId?: string | null;
  activityDate?: string;
  category?: ActivityCategory;
  status?: ActivityStatus;
  completedAt?: string | null;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/**
 * Activity with goalTitle flattened from the linked goal.
 * Returned by GET /api/activities and GET /api/activities/today.
 */
export interface ListedActivity extends Activity {
  goalTitle: string | null;
}

/**
 * Activities grouped by status for a single day.
 * Returned by GET /api/activities/today.
 */
export interface TodayActivities {
  date:      string;
  planned:   ListedActivity[];
  completed: ListedActivity[];
  skipped:   ListedActivity[];
}
