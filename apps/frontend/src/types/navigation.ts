/**
 * @file types/navigation.ts
 * @description State-based navigation types for the Kinetic Precision UI.
 * @module @polaris/frontend/types
 */

export type ScreenId = 'Hub' | 'Goals' | 'Insights' | 'Settings' | 'History' | 'WeeklyReview';

export type Theme = 'light' | 'dark';

export interface NavigationState {
  screen: ScreenId;
  theme: Theme;
  transition: 'none' | 'push';
  isAuthenticated: boolean;
}
