import React from 'react';
import { motion } from 'motion/react';
import { Mic, BarChart3, Target, Dumbbell, BookOpen, Plus, BarChart2, Flag, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme, ScreenId } from '@/src/types';

interface HubProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Hub({ theme, onNavigate }: HubProps) {
  const isDark = theme === 'dark';

  return (
    <div className="px-4 md:px-12 max-w-7xl mx-auto">
      {/* Hero: Large Typographic Clock & AI Input */}
      <section className="flex flex-col items-center mb-12 md:mb-16 text-center">
        <div className="mb-4">
          <h1 className={cn(
            "text-[4rem] sm:text-[6rem] md:text-[8rem] font-black tracking-tighter leading-none",
            isDark ? "text-dark-on-surface" : "text-on-surface"
          )}>
            {isDark ? "21:42" : "10:42"}
          </h1>
          <p className={cn(
            "font-medium tracking-[0.2em] uppercase text-xs md:text-sm mt-2",
            isDark ? "text-dark-primary" : "text-on-surface-variant"
          )}>
            {isDark ? "Tuesday, October 24" : "Monday, Oct 23"}
          </p>
        </div>

        <div className="w-full max-w-2xl mt-8 md:mt-12 group">
          <div className={cn(
            "relative shadow-[0_12px_40px_rgba(25,28,29,0.04)] rounded-xl p-1 flex items-center border transition-all focus-within:ring-2",
            isDark 
              ? "bg-surface-container-lowest border-white/10 focus-within:ring-dark-primary/20" 
              : "bg-surface-container-lowest border-outline-variant/10 focus-within:ring-primary/20"
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
            />
            <button className={cn(
              "text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold text-xs md:text-sm mr-1 shadow-sm active:scale-95 transition-all",
              isDark ? "plasma-gradient text-dark-bg" : "signature-gradient"
            )}>
              Log
            </button>
          </div>
          <p className="text-xs text-on-surface-variant mt-4 opacity-60">
            {isDark ? "Try: 'Finished the Q4 projection report' or 'Ran 5km in 24 mins'" : "Try: \"Finished the Q4 projection report\" or \"Ran 5km in 24 mins\""}
          </p>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* Activity Streak / Self-Mastery */}
        <div className={cn(
          "md:col-span-4 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between h-full transition-all hover:scale-[1.02]",
          isDark ? "glass-morphism" : "bg-white"
        )}>
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
        </div>

        {/* Consistency Heatmap */}
        <div className={cn(
          "md:col-span-8 rounded-3xl p-8 shadow-2xl transition-all hover:scale-[1.01]",
          isDark ? "glass-morphism" : "bg-white"
        )}>
          <div className="flex justify-between items-center mb-8">
            <h3 className={cn(
              "text-[10px] font-bold tracking-[0.3em] uppercase",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
              {isDark ? "Consistency Matrix" : "Consistency Heatmap"}
            </h3>
            <div className="flex gap-2">
              <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-white/5" : "bg-surface-container-high")} />
              <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-dark-primary/20" : "bg-primary/20")} />
              <div className={cn("w-3 h-3 rounded-sm", isDark ? "bg-dark-primary/50" : "bg-primary/60")} />
              <div className={cn("w-3 h-3 rounded-sm", isDark ? "plasma-gradient" : "signature-gradient")} />
            </div>
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 md:gap-3">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.01 }}
                className={cn(
                  "aspect-square rounded-lg shadow-sm transition-all hover:scale-110 cursor-pointer",
                  i % 4 === 0 ? (isDark ? "plasma-gradient shadow-[0_0_8px_rgba(129,236,255,0.3)]" : "signature-gradient") :
                  i % 3 === 0 ? (isDark ? "bg-dark-primary/40" : "bg-primary/60") :
                  i % 5 === 0 ? (isDark ? "bg-dark-primary/10" : "bg-primary/20") :
                  (isDark ? "bg-white/5" : "bg-surface-container-high")
                )} 
              />
            ))}
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
              onClick={() => onNavigate('Insights', 'push')}
              className={cn(
                "font-bold text-[10px] md:text-xs uppercase tracking-widest px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all",
                isDark ? "bg-white/5 text-dark-primary hover:bg-white/10" : "bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              Telemetry
            </button>
          </div>
        </div>

        {/* Active Goal Progress / Strategic Alignment */}
        <div className={cn(
          "md:col-span-12 rounded-3xl p-6 md:p-8 shadow-2xl",
          isDark ? "glass-morphism" : "bg-white"
        )}>
          <div className="flex justify-between items-center mb-8 md:mb-10">
            <h3 className={cn(
              "text-[10px] font-bold tracking-[0.3em] uppercase",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
              {isDark ? "Strategic Alignment" : "Active Goal Progress"}
            </h3>
            <button className={cn(
              "text-[10px] font-bold uppercase tracking-widest flex items-center hover:opacity-80 transition-all",
              isDark ? "text-dark-primary" : "text-primary"
            )}>
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
        </div>
      </div>
    </div>
  );
}
