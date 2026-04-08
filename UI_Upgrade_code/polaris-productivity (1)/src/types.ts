export type ScreenId = 'Hub' | 'Goals' | 'Insights' | 'Login';
export type Theme = 'light' | 'dark';

export interface NavigationState {
  screen: ScreenId;
  theme: Theme;
  transition: 'none' | 'push';
  isAuthenticated: boolean;
}
