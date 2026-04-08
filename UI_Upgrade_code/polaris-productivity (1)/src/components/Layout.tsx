import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Settings, Mic, Home, BarChart2, Flag, Search, Rocket, Target, Palette, TrendingUp, History, LayoutGrid, Lock, Command, Database, Shield, MoreVertical, Plus, ChevronRight, Sun, Moon, LogOut } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ScreenId, Theme, NavigationState } from '@/src/types';
import Background from './Background';

interface LayoutProps {
  state: NavigationState;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ state, onNavigate, onToggleTheme, onLogout, children }: LayoutProps) {
  const isDark = state.theme === 'dark';

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 relative overflow-hidden",
      isDark ? "bg-dark-bg text-dark-on-surface font-body" : "bg-surface text-on-surface font-sans"
    )}>
      {/* Live Background */}
      <Background theme={state.theme} />

      {/* Atmospheric Gradients for Dark Mode */}
      {isDark && (
        <div className="fixed inset-0 z-0 pointer-events-none atmosphere-dark opacity-50" />
      )}

      {/* Top Navigation */}
      <nav className={cn(
        "fixed top-0 w-full z-50 h-16 flex justify-between items-center px-4 md:px-8 backdrop-blur-3xl",
        isDark 
          ? "bg-[#020617]/60 border-b border-white/5" 
          : "bg-[#ffffffcc] shadow-[0_12px_40px_rgba(25,28,29,0.04)]"
      )}>
        <div className="flex items-center gap-6 md:gap-12 relative z-10">
          <div className={cn(
            "text-xl md:text-2xl font-black tracking-tighter cursor-pointer",
            isDark ? "text-dark-primary font-headline" : "text-on-surface"
          )}
          onClick={() => onNavigate('Hub')}
          >
            Polaris
          </div>
          <div className="hidden sm:flex items-center gap-4 md:gap-8 font-medium leading-tight tracking-[-0.02em]">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onNavigate('Hub'); }}
              className={cn(
                "transition-all duration-200 text-sm md:text-base",
                state.screen === 'Hub' 
                  ? (isDark ? "text-dark-primary border-b-2 border-dark-primary pb-1" : "text-primary border-b-2 border-primary pb-1 font-bold")
                  : (isDark ? "text-dark-on-surface-variant hover:text-dark-primary" : "text-on-surface-variant hover:text-primary")
              )}
            >
              Hub
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onNavigate('Insights'); }}
              className={cn(
                "transition-all duration-200 text-sm md:text-base",
                state.screen === 'Insights' 
                  ? (isDark ? "text-dark-primary border-b-2 border-dark-primary pb-1" : "text-primary border-b-2 border-primary pb-1 font-bold")
                  : (isDark ? "text-dark-on-surface-variant hover:text-dark-primary" : "text-on-surface-variant hover:text-primary")
              )}
            >
              Insights
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onNavigate('Goals'); }}
              className={cn(
                "transition-all duration-200 text-sm md:text-base",
                state.screen === 'Goals' 
                  ? (isDark ? "text-dark-primary border-b-2 border-dark-primary pb-1" : "text-primary border-b-2 border-primary pb-1 font-bold")
                  : (isDark ? "text-dark-on-surface-variant hover:text-dark-primary" : "text-on-surface-variant hover:text-primary")
              )}
            >
              Goals
            </a>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 relative z-10">
          {/* Theme Toggle Button */}
          <button 
            onClick={onToggleTheme}
            className={cn(
              "p-2 md:p-2.5 rounded-xl transition-all active:scale-90 flex items-center gap-2",
              isDark 
                ? "bg-white/5 text-dark-primary hover:bg-white/10 border border-white/10" 
                : "bg-black/5 text-on-surface-variant hover:text-primary hover:bg-black/10 border border-transparent"
            )}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block">
              {isDark ? "Light" : "Dark"}
            </span>
          </button>

          <button className={cn(
            "p-2 md:p-2.5 rounded-xl transition-all active:scale-90",
            isDark ? "text-dark-primary hover:bg-white/5" : "text-on-surface-variant hover:text-primary hover:bg-black/5"
          )}>
            <Bell className="w-4 h-4" />
          </button>

          <div className="h-6 w-[1px] bg-current opacity-10 mx-1 md:mx-2" />

          <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2">
            <div className={cn(
              "w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border",
              isDark ? "border-dark-primary/30" : "border-outline-variant/10"
            )}>
              <img 
                src="https://picsum.photos/seed/polaris-user/100/100" 
                alt="User profile" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <button 
              onClick={onLogout}
              className={cn(
                "p-2 md:p-2.5 rounded-xl transition-all active:scale-90",
                isDark ? "text-red-400 hover:bg-red-400/10" : "text-on-surface-variant hover:text-red-500 hover:bg-red-50/50"
              )}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 pb-32 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${state.screen}-${state.theme}`}
            initial={state.transition === 'push' ? { x: 100, opacity: 0 } : { opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={state.transition === 'push' ? { x: -100, opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className={cn(
        "md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-6 pb-8 pt-4 backdrop-blur-2xl rounded-t-[2rem]",
        isDark 
          ? "bg-[#060d24] border-t border-[#404761]/15" 
          : "bg-[#ffffffcc] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]"
      )}>
        <button className={cn(
          "flex flex-col items-center justify-center transition-all active:scale-90",
          isDark ? "text-dark-tertiary" : "text-on-surface-variant"
        )}>
          <Mic className="w-6 h-6" />
          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">Capture</span>
        </button>
        
        <div 
          onClick={() => onNavigate('Hub')}
          className={cn(
            "flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer",
            state.screen === 'Hub'
              ? (isDark ? "bg-gradient-to-tr from-dark-primary to-dark-primary-container text-dark-bg rounded-xl p-2" : "bg-[#d8e2ff] text-primary rounded-2xl px-6 py-2")
              : (isDark ? "text-dark-tertiary" : "text-on-surface-variant")
          )}
        >
          <Home className="w-6 h-6" />
          <span className="sr-only">home</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">Hub</span>
        </div>

        <div 
          onClick={() => onNavigate('Insights')}
          className={cn(
            "flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer",
            state.screen === 'Insights'
              ? (isDark ? "bg-gradient-to-tr from-dark-primary to-dark-primary-container text-dark-bg rounded-xl p-2" : "bg-[#d8e2ff] text-primary rounded-2xl px-6 py-2")
              : (isDark ? "text-dark-tertiary" : "text-on-surface-variant")
          )}
        >
          <BarChart2 className="w-6 h-6" />
          <span className="sr-only">bar_chart</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">Insights</span>
        </div>

        <div 
          onClick={() => onNavigate('Goals')}
          className={cn(
            "flex flex-col items-center justify-center transition-all active:scale-90 cursor-pointer",
            state.screen === 'Goals'
              ? (isDark ? "bg-gradient-to-tr from-dark-primary to-dark-primary-container text-dark-bg rounded-xl p-2" : "bg-[#d8e2ff] text-primary rounded-2xl px-6 py-2")
              : (isDark ? "text-dark-tertiary" : "text-on-surface-variant")
          )}
        >
          <Flag className="w-6 h-6" />
          <span className="sr-only">flag</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">Goals</span>
        </div>
      </nav>
    </div>
  );
}
