/**
 * @file types/goal.ts
 * @description Goal domain types shared across frontend and backend
 * @module @polaris/shared/types
 */

export type GoalTimeframe = 'long' | 'medium' | 'short';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  timeframe: GoalTimeframe;
  targetValue: number | null;
  targetUnit: string | null;
  targetDate: string | null; // ISO date string
  parentId: string | null;
  status: GoalStatus;
  isDeleted: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  timeframe?: GoalTimeframe;
  targetValue?: number;
  targetUnit?: string;
  targetDate?: string;
  parentId?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  timeframe?: GoalTimeframe;
  targetValue?: number | null;
  targetUnit?: string | null;
  targetDate?: string | null;
  parentId?: string | null;
  status?: GoalStatus;
}
