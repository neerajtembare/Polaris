import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, BarChart3, Target, Dumbbell, BookOpen, Plus, BarChart2, Flag, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme, ScreenId } from '@/src/types';
import ReactiveCard from './ui/ReactiveCard';
import { processAchievement, AIResponse } from '@/src/services/aiService';

interface HubProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Hub({ theme, onNavigate }: HubProps) {
  const isDark = theme === 'dark';
  const [inputValue, setInputValue] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIResponse | null>(null);

  const handleLog = async () => {
    if (!inputValue.trim() || isLogging) return;

    setIsLogging(true);
    setAiFeedback(null);
    
    try {
      const response = await processAchievement(inputValue);
      setAiFeedback(response);
      setInputValue('');
      
      // Clear feedback after 5 seconds
      setTimeout(() => setAiFeedback(null), 5000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="px-4 md:px-12 max-w-7xl mx-auto relative">
      {/* Hero: Large Typographic Clock & AI Input */}
      <section className="flex flex-col items-center mb-12 md:mb-16 text-center relative py-12">
        <div className="mb-4 relative z-10">
          <h1 className={cn(
            "text-[4rem] sm:text-[6rem] md:text-[8rem] font-black tracking-tighter leading-none drop-shadow-2xl",
            isDark ? "text-dark-on-surface" : "text-on-surface"
          )}>
            {isDark ? "21:42" : "10:42"}
          </h1>
          <p className={cn(
            "font-medium tracking-[0.2em] uppercase text-xs md:text-sm mt-2 drop-shadow-md",
            isDark ? "text-dark-primary" : "text-primary"
          )}>
            {isDark ? "Tuesday, October 24" : "Monday, Oct 23"}
          </p>
        </div>

        <div className="w-full max-w-2xl mt-8 md:mt-12 group relative z-10">
          <div className={cn(
            "relative shadow-[0_12px_40px_rgba(25,28,29,0.04)] rounded-xl p-1 flex items-center border transition-all focus-within:ring-2 backdrop-blur-md",
            isDark 
              ? "bg-dark-surface-container-lowest/80 border-white/10 focus-within:ring-dark-primary/20" 
              : "bg-surface-container-lowest/80 border-outline-variant/10 focus-within:ring-primary/20"
          )}>
            <div className="px-3 md:px-4">
              <Mic className={cn("w-5 h-5 md:w-6 md:h-6", isDark ? "text-dark-primary" : "text-primary")} />
            </div>
            <input 
              className={cn(
                "w-full bg-transparent border-none focus:ring-0 text-base md:text-lg py-3 md:py-4 placeholder:text-outline/60 font-medium",
                isDark ? "text-dark-on-surface" : "text-on-surface"
              )} 
              placeholder={isDark ? "Initialize command or log vitals..." : "What did you achieve today?"}
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLog()}
              disabled={isLogging}
            />
            <button 
              onClick={handleLog}
              disabled={isLogging}
              className={cn(
                "text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm mr-1 shadow-sm active:scale-95 transition-all flex items-center gap-2 min-w-[80px] justify-center",
                isDark ? "plasma-gradient text-dark-bg" : "signature-gradient",
                isLogging && "opacity-70 cursor-not-allowed"
              )}
            >
              {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log"}
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            {aiFeedback ? (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={cn(
                  "mt-6 p-5 rounded-2xl flex items-start gap-4 text-left border backdrop-blur-xl shadow-2xl",
                  isDark 
                    ? "bg-dark-primary/10 border-dark-primary/30 shadow-dark-primary/5" 
                    : "bg-primary/5 border-primary/20 shadow-primary/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  isDark ? "bg-dark-primary/20 text-dark-primary" : "bg-primary/10 text-primary"
                )}>
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm md:text-base font-bold leading-tight", isDark ? "text-dark-on-surface" : "text-on-surface")}>
                    {aiFeedback.message}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <div className="flex flex-col">
                      <span className={cn("text-[9px] uppercase font-black tracking-widest opacity-50", isDark ? "text-dark-on-surface" : "text-on-surface")}>Category</span>
                      <span className={cn("text-xs font-bold capitalize", isDark ? "text-dark-primary" : "text-primary")}>{aiFeedback.category}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("text-[9px] uppercase font-black tracking-widest opacity-50", isDark ? "text-dark-on-surface" : "text-on-surface")}>Impact</span>
                      <div className="flex items-center gap-1">
                        <span className={cn("text-xs font-bold", isDark ? "text-dark-primary" : "text-primary")}>{aiFeedback.impact}</span>
                        <div className={cn("w-12 h-1 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-black/5")}>
                          <div 
                            className={cn("h-full", isDark ? "plasma-gradient" : "signature-gradient")} 
                            style={{ width: `${aiFeedback.impact * 10}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <p className={cn(
                "text-xs mt-4 font-medium drop-shadow-sm transition-colors",
                isDark ? "text-dark-on-surface-variant/80" : "text-on-surface-variant/80"
              )}>
                {isDark ? "Try: 'Finished the Q4 projection report' or 'Ran 5km in 24 mins'" : "Try: \"Finished the Q4 projection report\" or \"Ran 5km in 24 mins\""}
              </p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 relative z-10">
        {/* Activity Streak / Self-Mastery */}
        <ReactiveCard isDark={isDark} className="md:col-span-4 flex flex-col justify-between h-full">
          <div>
            <h3 className={cn(
              "text-[10px] font-bold tracking-[0.3em] uppercase mb-6 md:mb-8",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
              {isDark ? "Self-Mastery Index" : "Activity Streak"}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-6xl md:text-7xl font-black tracking-tighter", isDark ? "text-dark-on-surface drop-shadow-[0_0_15px_rgba(129,236,255,0.3)]" : "text-on-surface")}>14</span>
              <span className={cn("text-lg md:text-xl font-bold", isDark ? "text-dark-primary" : "text-on-surface-variant")}>
                {isDark ? "Cycles" : "days"}
              </span>
            </div>
            <p className={cn("mt-4 leading-relaxed text-sm opacity-80", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              {isDark ? "Your neural focus consistency is at peak efficiency." : "You're in the top 5% of productive users this month."}
            </p>
          </div>
          <div className="mt-8 flex gap-2 overflow-hidden h-20 md:h-24">
            {[60, 80, 40, 95, 70, 85].map((h, i) => (
              <div key={i} className={cn("flex-1 rounded-xl flex items-end p-1", isDark ? "bg-white/5" : "bg-primary/5")}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={cn("w-full rounded-lg", isDark ? "plasma-gradient shadow-[0_0_10px_rgba(129,236,255,0.4)]" : "signature-gradient")} 
                />
              </div>
            ))}
          </div>
        </ReactiveCard>

        {/* Momentum Visualizations (Options for User) */}
        <ReactiveCard isDark={isDark} className="md:col-span-8 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h3 className={cn(
              "text-[10px] font-bold tracking-[0.3em] uppercase",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
              {isDark ? "Activity Momentum" : "Momentum Spline"}
            </h3>
            <div className="flex gap-2">
              <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded", isDark ? "bg-dark-primary/20 text-dark-primary" : "bg-primary/10 text-primary")}>Live</span>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Option A: Velocity Spline */}
            <div className="w-full relative">
              <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 text-center", isDark ? "text-dark-on-surface" : "text-on-surface")}>Option A: Velocity Spline</p>
              <div className="h-32 w-full relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                  <defs>
                    <linearGradient id="splineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isDark ? "#81ecff" : "#0058be"} stopOpacity="0.1" />
                      <stop offset="50%" stopColor={isDark ? "#81ecff" : "#0058be"} stopOpacity="1" />
                      <stop offset="100%" stopColor={isDark ? "#c280ff" : "#2170e4"} stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    d="M0,80 C100,80 150,20 250,40 C350,60 400,10 500,30" 
                    fill="none" 
                    stroke="url(#splineGrad)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    style={{ filter: isDark ? 'drop-shadow(0px 0px 8px rgba(129,236,255,0.5))' : 'none' }}
                  />
                  <circle cx="250" cy="40" r="4" fill={isDark ? "#81ecff" : "#0058be"} className="animate-pulse" />
                  <circle cx="500" cy="30" r="4" fill={isDark ? "#c280ff" : "#2170e4"} className="animate-pulse" />
                </svg>
              </div>
            </div>

            {/* Option B: Orbital Radar */}
            <div className="w-full relative flex flex-col items-center">
              <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 text-center", isDark ? "text-dark-on-surface" : "text-on-surface")}>Option B: Orbital Radar</p>
              <div className="h-32 w-32 relative flex items-center justify-center">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="20" fill="none" stroke={isDark ? "#81ecff" : "#0058be"} strokeWidth="1" strokeOpacity="0.2" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke={isDark ? "#81ecff" : "#0058be"} strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 4" />
                  <circle cx="50" cy="50" r="50" fill="none" stroke={isDark ? "#81ecff" : "#0058be"} strokeWidth="1" strokeOpacity="0.1" />
                  
                  <motion.circle 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "50px 50px" }}
                    cx="50" cy="15" r="3" fill={isDark ? "#81ecff" : "#0058be"} 
                    className="drop-shadow-[0_0_5px_rgba(129,236,255,0.8)]"
                  />
                  <motion.circle 
                    animate={{ rotate: -360 }} 
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    style={{ transformOrigin: "50px 50px" }}
                    cx="85" cy="50" r="2" fill={isDark ? "#c280ff" : "#2170e4"} 
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-current opacity-10 flex justify-between items-center">
            <div className="flex items-center gap-3 md:gap-4">
              <BarChart2 className={cn("w-4 h-4 md:w-5 md:h-5", isDark ? "text-dark-primary" : "text-primary")} />
              <div>
                <p className={cn("text-xs md:text-sm font-bold", isDark ? "text-dark-on-surface" : "text-on-surface")}>Deep Work Focus</p>
                <p className={cn("text-[10px] md:text-xs opacity-60", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Average 4.2h / day</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate('Insights', 'push'); }}
              className={cn(
                "font-bold text-[10px] md:text-xs uppercase tracking-widest px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all relative z-20",
                isDark ? "bg-white/5 text-dark-primary hover:bg-white/10" : "bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              Telemetry
            </button>
          </div>
        </ReactiveCard>

        {/* Active Goal Progress / Strategic Alignment */}
        <ReactiveCard isDark={isDark} className="md:col-span-12">
          <div className="flex justify-between items-center mb-8 md:mb-10">
            <h3 className={cn(
              "text-[10px] font-bold tracking-[0.3em] uppercase",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
              {isDark ? "Strategic Alignment" : "Active Goal Progress"}
            </h3>
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate('Goals', 'push'); }}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest flex items-center hover:opacity-80 transition-all relative z-20",
                isDark ? "text-dark-primary" : "text-primary"
              )}
            >
              Matrix <ChevronRight className="ml-1 w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
            {[
              { label: isDark ? "Neural Network Training" : "Product Launch Phase 1", progress: 72, color: isDark ? "plasma-gradient" : "signature-gradient", icon: Target },
              { label: isDark ? "Cognitive Flow Optimization" : "Marathon Training", progress: 45, color: isDark ? "bg-gradient-to-r from-dark-secondary to-purple-400" : "bg-gradient-to-r from-purple-500 to-indigo-500", icon: Dumbbell },
              { label: isDark ? "System Latency Reduction" : "Read 24 Books", progress: 50, color: isDark ? "bg-gradient-to-r from-dark-tertiary to-blue-400" : "bg-gradient-to-r from-blue-500 to-cyan-500", icon: BookOpen },
            ].map((goal, i) => (
              <div key={i} className="space-y-3 md:space-y-4 group cursor-pointer">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={cn(
                      "p-1.5 md:p-2 rounded-lg transition-all group-hover:scale-110",
                      isDark ? "bg-white/5 text-dark-primary" : "bg-primary/5 text-primary"
                    )}>
                      <goal.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </div>
                    <span className={cn("font-bold text-xs md:text-sm", isDark ? "text-dark-on-surface" : "text-on-surface")}>{goal.label}</span>
                  </div>
                  <span className={cn("text-[10px] md:text-xs font-black", isDark ? "text-dark-primary" : "text-primary")}>
                    {goal.progress}%
                  </span>
                </div>
                <div className={cn("w-full h-1.5 md:h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-high")}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 + i * 0.2 }}
                    className={cn("h-full rounded-full shadow-sm", goal.color)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </ReactiveCard>
      </div>
    </div>
  );
}
