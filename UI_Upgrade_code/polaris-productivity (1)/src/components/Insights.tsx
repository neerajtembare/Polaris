import React from 'react';
import { motion } from 'motion/react';
import { BarChart2, TrendingUp, History, Rocket, Timer, LineChart, Search, Bell, Settings, Mic, ArrowUp, Activity } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme, ScreenId } from '@/src/types';

interface InsightsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Insights({ theme, onNavigate }: InsightsProps) {
  const isDark = theme === 'dark';

  return (
    <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          {isDark && <span className="font-label text-dark-primary uppercase tracking-[0.3em] text-[10px] font-bold">Systems Diagnostics</span>}
          <h1 className={cn(
            "text-[2.5rem] md:text-[3.5rem] font-bold leading-[1.1] tracking-[-0.02em]",
            isDark ? "font-headline text-dark-on-surface" : "text-on-surface"
          )}>
            {isDark ? "Analytics Insights" : "Analytics."}
          </h1>
          <p className={cn("tracking-wide text-sm md:text-base", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
            {isDark ? "Real-time sequence sequence tracking" : "Deep focus metrics and architectural productivity flow."}
          </p>
        </div>
        <div className="flex gap-3">
          <button className={cn(
            "px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all",
            isDark ? "bg-white/5 text-dark-on-surface hover:bg-white/10" : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
          )}>
            Export Data
          </button>
          <button className={cn(
            "px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm shadow-lg active:scale-95 transition-all",
            isDark ? "plasma-gradient text-dark-bg" : "signature-gradient text-white shadow-primary/20"
          )}>
            Generate Report
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Momentum / Productivity Pulse */}
        <div className={cn(
          "lg:col-span-8 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden group",
          isDark ? "glass-morphism" : "bg-white"
        )}>
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div>
              <h3 className={cn("text-lg md:text-xl font-black tracking-tight", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
                {isDark ? "Productivity Pulse" : "Activity Momentum"}
              </h3>
              <p className={cn("text-xs md:text-sm opacity-60", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                {isDark ? "24-hour neural density mapping" : "Weekly output trend vs. objective"}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={cn(
                "px-3 md:px-4 py-1 text-[8px] md:text-[10px] font-bold rounded-full uppercase tracking-widest",
                isDark ? "bg-dark-primary text-dark-bg animate-pulse shadow-[0_0_15px_rgba(129,236,255,0.8)]" : "bg-primary/10 text-primary"
              )}>
                LIVE TELEMETRY
              </span>
            </div>
          </div>
          
          <div className="h-48 md:h-64 w-full flex items-end gap-2 relative">
            <div className="absolute inset-0 z-0">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                <defs>
                  <linearGradient id="waveGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: isDark ? '#81ecff' : '#0058be', stopOpacity: 0.3 }} />
                    <stop offset="100%" style={{ stopColor: isDark ? '#81ecff' : '#0058be', stopOpacity: 0 }} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <motion.path 
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  d="M0,150 C50,140 80,180 120,160 C160,140 200,50 250,70 C300,90 340,160 400,150 C460,140 500,40 550,60 C600,80 640,150 700,140 C750,130 800,160 800,160 L800,200 L0,200 Z" 
                  fill="url(#waveGrad)" 
                />
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                  d="M0,150 C50,140 80,180 120,160 C160,140 200,50 250,70 C300,90 340,160 400,150 C460,140 500,40 550,60 C600,80 640,150 700,140 C750,130 800,160 800,160" 
                  fill="none" 
                  stroke={isDark ? "#81ecff" : "#0058be"} 
                  strokeWidth="3" 
                  filter="url(#glow)"
                />
              </svg>
            </div>
          </div>
          <div className={cn("flex justify-between mt-6 text-[8px] md:text-[10px] font-bold tracking-[0.2em] uppercase opacity-40", isDark ? "text-dark-on-surface-variant" : "text-outline")}>
            {isDark ? (
              <><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>00:00</span></>
            ) : (
              <><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <div className={cn(
            "rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-all hover:scale-[1.02]",
            isDark ? "glass-morphism" : "bg-white"
          )}>
            <h4 className={cn("text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-4 md:mb-6", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Focus Score</h4>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn("text-4xl md:text-5xl font-black tracking-tighter", isDark ? "text-dark-on-surface font-headline drop-shadow-[0_0_10px_rgba(129,236,255,0.4)]" : "text-primary")}>94.2</div>
              <div className="flex flex-col">
                <span className={cn("font-bold text-xs md:text-sm flex items-center", isDark ? "text-dark-primary" : "text-tertiary")}>
                  <ArrowUp className="w-4 h-4 mr-1" /> 12%
                </span>
                <span className={cn("text-[10px] md:text-xs opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>vs last cycle</span>
              </div>
            </div>
            <div className={cn("mt-6 w-full h-1.5 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-high")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '94.2%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={cn("h-full", isDark ? "plasma-gradient" : "signature-gradient")} 
              />
            </div>
          </div>

          <div className={cn(
            "rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-all hover:scale-[1.02]",
            isDark ? "glass-morphism" : "bg-white"
          )}>
            <h4 className={cn("text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mb-4 md:mb-6", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Deep Work</h4>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn("text-4xl md:text-5xl font-black tracking-tighter", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>32h</div>
              <div className="flex flex-col">
                <span className={cn("font-bold text-xs md:text-sm", isDark ? "text-dark-on-surface" : "text-on-surface")}>Avg. 4.5h / day</span>
                <span className={cn("text-[10px] md:text-xs opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Peak: Wednesday</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consistency Heatmap */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>Consistency Heatmap</h3>
            <div className="flex gap-2">
              <span className="text-[10px] md:text-xs text-outline font-medium">Less</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-2.5 h-2.5 md:w-3 md:h-3 rounded-sm", isDark ? `bg-dark-primary/${i*20}` : `bg-primary/${i*20}`)} />
                ))}
              </div>
              <span className="text-[10px] md:text-xs text-outline font-medium">More</span>
            </div>
          </div>
          <div className={cn("p-6 md:p-8 rounded-3xl overflow-x-auto", isDark ? "bg-surface-container-low kinetic-border" : "bg-surface-container-low")}>
            <div className="flex gap-2 min-w-max">
              <div className="grid grid-rows-7 gap-2 pr-4 text-[8px] md:text-[10px] font-bold text-outline">
                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
              </div>
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 md:gap-2">
                {Array.from({ length: 70 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-3.5 h-3.5 md:w-4 md:h-4 rounded-sm",
                      i % 7 === 0 ? (isDark ? "bg-dark-primary" : "bg-primary") :
                      i % 5 === 0 ? (isDark ? "bg-dark-primary/60" : "bg-primary/60") :
                      i % 3 === 0 ? (isDark ? "bg-dark-primary/30" : "bg-primary/30") :
                      (isDark ? "bg-white/5" : "bg-surface-container-high")
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Timeline / Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
              {isDark ? "Activity Log" : "Activity Timeline"}
            </h3>
            <div className={cn("flex items-center gap-2 md:gap-3 p-1 rounded-xl", isDark ? "bg-surface-container-low" : "bg-surface-container-low")}>
              <button className={cn("px-3 md:px-4 py-1.5 rounded-lg shadow-sm text-[10px] md:text-xs font-bold", isDark ? "bg-surface-container-highest text-dark-primary" : "bg-surface-container-lowest text-primary")}>
                {isDark ? "Export Logs" : "All Activity"}
              </button>
              {!isDark && (
                <>
                  <button className="px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all">Milestones</button>
                  <button className="px-3 md:px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all">Focus Sessions</button>
                </>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: "Product Launch Architecture Completed", desc: "Core systems deployed to production environment.", time: "14:20", icon: Rocket, tags: ["Productive", "Engineering"] },
              { title: "Focus Sprint: Analytics Engine", desc: "Continuous deep work session achieved for 120 minutes.", time: "09:00", icon: Timer, tags: ["Focus", "Deep Work"] },
              { title: "Data Reconciliation Strategy", desc: "Mapping architectural debt for the Q3 roadmap.", time: "17:45", icon: LineChart, tags: ["Strategy", "Data"] },
            ].map((item, i) => (
              <div key={i} className={cn(
                "p-4 md:p-6 rounded-2xl flex items-center gap-4 md:gap-6 group hover:translate-x-2 transition-all duration-300",
                isDark ? "bg-surface-container-low kinetic-border" : "bg-surface-container-lowest"
              )}>
                <div className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                  isDark 
                    ? "bg-dark-primary/10 text-dark-primary group-hover:bg-dark-primary group-hover:text-dark-bg" 
                    : "bg-primary-fixed text-primary group-hover:signature-gradient group-hover:text-white"
                )}>
                  <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className={cn("font-bold text-sm md:text-base truncate", isDark ? "text-dark-on-surface" : "text-on-surface")}>{item.title}</h5>
                  <p className={cn("text-xs md:text-sm truncate md:whitespace-normal", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>{item.desc}</p>
                  {isDark && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-surface-container-highest font-label text-[8px] md:text-[9px] uppercase text-dark-primary border border-dark-primary/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest block">{i < 2 ? "Today" : "Yesterday"}</span>
                  <span className={cn("text-xs md:text-sm font-medium", isDark ? "text-dark-on-surface" : "text-on-surface")}>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
