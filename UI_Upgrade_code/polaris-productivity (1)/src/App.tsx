/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Layout from './components/Layout';
import Hub from './components/Hub';
import GoalMatrix from './components/GoalMatrix';
import Insights from './components/Insights';
import Login from './components/Login';
import { ScreenId, Theme, NavigationState } from './types';

export default function App() {
  const [state, setState] = useState<NavigationState>({
    screen: 'Hub',
    theme: 'light',
    transition: 'none',
    isAuthenticated: false
  });

  const handleNavigate = (screen: ScreenId, transition: 'none' | 'push' = 'none') => {
    setState(prev => ({
      ...prev,
      screen,
      transition
    }));
  };

  const handleToggleTheme = () => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
      transition: 'none'
    }));
  };

  const handleLogin = () => {
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      screen: 'Hub'
    }));
  };

  const handleLogout = () => {
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      screen: 'Login'
    }));
  };

  if (!state.isAuthenticated) {
    return <Login theme={state.theme} onLogin={handleLogin} />;
  }

  const renderScreen = () => {
    switch (state.screen) {
      case 'Hub':
        return <Hub theme={state.theme} onNavigate={handleNavigate} />;
      case 'Goals':
        return <GoalMatrix theme={state.theme} onNavigate={handleNavigate} />;
      case 'Insights':
        return <Insights theme={state.theme} onNavigate={handleNavigate} />;
      default:
        return <Hub theme={state.theme} onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout 
      state={state} 
      onNavigate={handleNavigate} 
      onToggleTheme={handleToggleTheme}
      onLogout={handleLogout}
    >
      {renderScreen()}
    </Layout>
  );
}
