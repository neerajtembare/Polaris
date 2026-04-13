import React from 'react';
import { motion } from 'motion/react';
import { BarChart2, TrendingUp, History, Rocket, Timer, LineChart, Search, Bell, Settings, Mic, ArrowUp, Activity, Cpu, Zap, Globe, Brain } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme, ScreenId } from '@/src/types';
import ReactiveCard from './ui/ReactiveCard';
import TopographicalHeatmap from './3d/TopographicalHeatmap';
import PulseWave from './3d/PulseWave';

interface InsightsProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function Insights({ theme, onNavigate }: InsightsProps) {
  const isDark = theme === 'dark';

  return (
    <div className="px-4 md:px-8 max-w-7xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase",
              isDark ? "bg-dark-primary/20 text-dark-primary border border-dark-primary/30" : "bg-primary/10 text-primary border border-primary/20"
            )}>
              System Status: Optimal
            </span>
          </div>
          <h1 className={cn(
            "text-[2.5rem] md:text-[4rem] font-black leading-[0.9] tracking-tighter",
            isDark ? "font-headline text-dark-on-surface" : "text-on-surface"
          )}>
            {isDark ? "Diagnostics" : "Insights."}
          </h1>
          <p className={cn("tracking-wide text-sm md:text-base font-medium opacity-70", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
            {isDark ? "Real-time neural sequence tracking and cognitive load analysis." : "Deep focus metrics and architectural productivity flow."}
          </p>
        </div>
        <div className="flex gap-3 relative z-20">
          <button className={cn(
            "px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs transition-all border",
            isDark ? "bg-white/5 text-dark-on-surface border-white/10 hover:bg-white/10" : "bg-surface-container-high text-on-surface border-outline-variant/20 hover:bg-surface-container-highest"
          )}>
            Export Data
          </button>
          <button className={cn(
            "px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all",
            isDark ? "plasma-gradient text-dark-bg" : "signature-gradient text-white shadow-primary/20"
          )}>
            Generate Report
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Live System Load */}
        <ReactiveCard isDark={isDark} className="lg:col-span-8 overflow-hidden group min-h-[400px] flex flex-col relative">
          <div className="absolute inset-0 z-0 opacity-50">
            <PulseWave theme={theme} />
          </div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className={cn("text-lg md:text-xl font-black tracking-tight uppercase", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
                {isDark ? "Live System Load" : "Live Telemetry"}
              </h3>
              <p className={cn("text-xs md:text-sm opacity-60 font-medium", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                {isDark ? "Real-time cognitive resource allocation" : "Current system resource usage"}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={cn(
                "px-3 md:px-4 py-1 text-[8px] md:text-[10px] font-black rounded-full uppercase tracking-widest flex items-center gap-2",
                isDark ? "bg-dark-primary/20 text-dark-primary border border-dark-primary/40 shadow-[0_0_15px_rgba(129,236,255,0.2)]" : "bg-primary/10 text-primary border border-primary/20"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isDark ? "bg-dark-primary" : "bg-primary")} />
                ACTIVE
              </span>
            </div>
          </div>
          
          <div className="flex-1 relative z-10 flex items-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full">
              {[
                { label: "CPU (Cognitive)", value: "84%", icon: Cpu, trend: "+12%" },
                { label: "Memory (Focus)", value: "3.2h", icon: Brain, trend: "Stable" },
                { label: "Network (Sync)", value: "99.9%", icon: Globe, trend: "Optimal" },
                { label: "Energy (Battery)", value: "62%", icon: Zap, trend: "-5%" }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className={cn(
                    "p-4 rounded-2xl border backdrop-blur-md",
                    isDark ? "bg-white/5 border-white/10" : "bg-white/60 border-black/5 shadow-sm"
                  )}
                >
                  <stat.icon className={cn("w-5 h-5 mb-3", isDark ? "text-dark-primary" : "text-primary")} />
                  <p className={cn("text-[10px] uppercase font-black tracking-widest opacity-60 mb-1", isDark ? "text-dark-on-surface" : "text-on-surface")}>{stat.label}</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-2xl md:text-3xl font-black tracking-tighter", isDark ? "text-dark-on-surface" : "text-on-surface")}>{stat.value}</span>
                  </div>
                  <p className={cn("text-[10px] font-bold mt-2", stat.trend.includes('-') ? "text-red-400" : isDark ? "text-dark-primary" : "text-primary")}>{stat.trend}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </ReactiveCard>

        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <ReactiveCard isDark={isDark}>
            <h4 className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6", isDark ? "text-dark-primary" : "text-primary")}>Focus Score</h4>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn("text-5xl md:text-6xl font-black tracking-tighter leading-none", isDark ? "text-dark-on-surface font-headline drop-shadow-[0_0_10px_rgba(129,236,255,0.4)]" : "text-on-surface")}>94.2</div>
              <div className="flex flex-col">
                <span className={cn("font-black text-xs md:text-sm flex items-center", isDark ? "text-dark-primary" : "text-primary")}>
                  <ArrowUp className="w-4 h-4 mr-1" /> 12%
                </span>
                <span className={cn("text-[10px] md:text-xs font-bold opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>vs last cycle</span>
              </div>
            </div>
            <div className={cn("mt-6 w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-high")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '94.2%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className={cn("h-full rounded-full", isDark ? "plasma-gradient shadow-[0_0_10px_rgba(129,236,255,0.4)]" : "signature-gradient")} 
              />
            </div>
          </ReactiveCard>

          <ReactiveCard isDark={isDark}>
            <h4 className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mb-4 md:mb-6", isDark ? "text-dark-primary" : "text-primary")}>Deep Work</h4>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={cn("text-5xl md:text-6xl font-black tracking-tighter leading-none", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>32h</div>
              <div className="flex flex-col">
                <span className={cn("font-black text-xs md:text-sm", isDark ? "text-dark-on-surface" : "text-on-surface")}>Avg. 4.5h / day</span>
                <span className={cn("text-[10px] md:text-xs font-bold opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Peak: Wednesday</span>
              </div>
            </div>
          </ReactiveCard>
        </div>
      </section>

      {/* Actionable Telemetry Grid & AI Analysis */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cognitive Flow Spectrum */}
        <div className="lg:col-span-8">
          <ReactiveCard isDark={isDark} className="h-full flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className={cn("text-xl md:text-2xl font-black tracking-tight uppercase", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>Cognitive Flow Spectrum</h3>
                <p className={cn("text-xs md:text-sm opacity-60 font-medium", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                  Deep Work vs. System Friction over 7 cycles.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isDark ? "bg-[#81ecff]" : "bg-[#0058be]")} />
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-dark-on-surface" : "text-on-surface")}>Deep Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", isDark ? "bg-[#c280ff]" : "bg-[#70aaff]")} />
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest", isDark ? "text-dark-on-surface" : "text-on-surface")}>Friction</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative w-full min-h-[250px]">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 1000 300">
                <defs>
                  <linearGradient id="deepWorkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#81ecff" : "#0058be"} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={isDark ? "#81ecff" : "#0058be"} stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="distractionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={isDark ? "#c280ff" : "#70aaff"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isDark ? "#c280ff" : "#70aaff"} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Distraction Area (Background) */}
                <motion.path 
                  initial={{ opacity: 0, d: "M0,300 L0,300 C200,300 300,300 500,300 C700,300 800,300 1000,300 L1000,300 Z" }}
                  animate={{ opacity: 1, d: "M0,300 L0,250 C200,280 300,150 500,200 C700,250 800,100 1000,180 L1000,300 Z" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  fill="url(#distractionGrad)" 
                />
                {/* Deep Work Area (Foreground) */}
                <motion.path 
                  initial={{ opacity: 0, d: "M0,300 L0,300 C200,300 300,300 500,300 C700,300 800,300 1000,300 L1000,300 Z" }}
                  animate={{ opacity: 1, d: "M0,300 L0,150 C200,100 300,250 500,80 C700,-20 800,150 1000,50 L1000,300 Z" }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  fill="url(#deepWorkGrad)" 
                />
                {/* Deep Work Line */}
                <motion.path 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
                  d="M0,150 C200,100 300,250 500,80 C700,-20 800,150 1000,50" 
                  fill="none" 
                  stroke={isDark ? "#81ecff" : "#0058be"} 
                  strokeWidth="4" 
                />
              </svg>
            </div>
          </ReactiveCard>
        </div>

        {/* AI Analysis Panel */}
        <div className="lg:col-span-4">
          <ReactiveCard isDark={isDark} className={cn(
            "h-full flex flex-col relative overflow-hidden",
            isDark ? "bg-gradient-to-br from-dark-surface-container-lowest to-dark-primary/5" : "bg-gradient-to-br from-surface-container-lowest to-primary/5"
          )}>
            {/* Decorative background element */}
            <div className={cn(
              "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none",
              isDark ? "bg-dark-primary" : "bg-primary"
            )} />

            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className={cn("p-2 rounded-lg", isDark ? "bg-dark-primary/20 text-dark-primary" : "bg-primary/10 text-primary")}>
                <Zap className="w-5 h-5" />
              </div>
              <h3 className={cn("text-lg font-black tracking-tight uppercase", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
                AI Analysis
              </h3>
            </div>

            <div className="space-y-6 relative z-10 flex-1">
              <div className={cn("p-4 rounded-xl border", isDark ? "bg-black/20 border-white/10" : "bg-white/60 border-black/5")}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={cn("w-4 h-4", isDark ? "text-dark-primary" : "text-primary")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-dark-on-surface" : "text-on-surface")}>Current Streak</span>
                </div>
                <p className={cn("text-sm font-bold", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                  <span className={cn("text-lg font-black", isDark ? "text-dark-primary" : "text-primary")}>12 Days</span> of Deep Work. You are maintaining a highly consistent output rhythm.
                </p>
              </div>

              <div className={cn("p-4 rounded-xl border", isDark ? "bg-black/20 border-white/10" : "bg-white/60 border-black/5")}>
                <div className="flex items-center gap-2 mb-2">
                  <Timer className={cn("w-4 h-4", isDark ? "text-dark-secondary" : "text-purple-500")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-dark-on-surface" : "text-on-surface")}>Peak Performance</span>
                </div>
                <p className={cn("text-sm font-bold", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                  Your optimal focus occurs between <span className={cn("font-black", isDark ? "text-dark-on-surface" : "text-on-surface")}>09:00 and 11:30</span>. Schedule complex tasks here.
                </p>
              </div>

              <div className={cn("p-4 rounded-xl border", isDark ? "bg-dark-primary/10 border-dark-primary/30" : "bg-primary/10 border-primary/30")}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className={cn("w-4 h-4", isDark ? "text-dark-primary" : "text-primary")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-dark-on-surface" : "text-on-surface")}>System Recommendation</span>
                </div>
                <p className={cn("text-sm font-bold", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
                  Activity dropped by 15% this week. Consider initiating a recovery cycle to prevent cognitive fatigue.
                </p>
              </div>
            </div>
          </ReactiveCard>
        </div>
      </section>

      {/* Activity Timeline / Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className={cn("text-xl md:text-2xl font-black tracking-tight uppercase", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
              {isDark ? "Neural Sequence" : "Activity Timeline"}
            </h3>
            <div className={cn("flex items-center gap-2 md:gap-3 p-1 rounded-xl border", isDark ? "bg-white/5 border-white/10" : "bg-surface-container-low border-outline-variant/20")}>
              <button className={cn("px-4 py-1.5 rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest", isDark ? "bg-dark-primary text-dark-bg" : "bg-white text-primary shadow-sm")}>
                All Logs
              </button>
              <button className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all", isDark ? "text-dark-on-surface" : "text-on-surface")}>
                Milestones
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { title: "Product Launch Architecture Completed", desc: "Core systems deployed to production environment.", time: "14:20", icon: Rocket, tags: ["Productive", "Engineering"] },
              { title: "Focus Sprint: Analytics Engine", desc: "Continuous deep work session achieved for 120 minutes.", time: "09:00", icon: Timer, tags: ["Focus", "Deep Work"] },
              { title: "Data Reconciliation Strategy", desc: "Mapping architectural debt for the Q3 roadmap.", time: "17:45", icon: LineChart, tags: ["Strategy", "Data"] },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className={cn(
                  "p-4 md:p-6 rounded-3xl flex items-center gap-4 md:gap-6 group hover:translate-x-2 transition-all duration-300 border",
                  isDark ? "bg-white/5 border-white/5 hover:border-dark-primary/30" : "bg-white border-black/5 hover:border-primary/30 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all shrink-0 border",
                  isDark 
                    ? "bg-dark-primary/10 text-dark-primary border-dark-primary/20 group-hover:bg-dark-primary group-hover:text-dark-bg" 
                    : "bg-primary/5 text-primary border-primary/10 group-hover:signature-gradient group-hover:text-white"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className={cn("font-black text-sm md:text-lg truncate tracking-tight", isDark ? "text-dark-on-surface" : "text-on-surface")}>{item.title}</h5>
                  <p className={cn("text-xs md:text-sm truncate md:whitespace-normal font-medium opacity-60", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>{item.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {item.tags.map(tag => (
                      <span key={tag} className={cn(
                        "px-2 py-0.5 rounded-md font-black text-[8px] md:text-[9px] uppercase tracking-widest border",
                        isDark ? "bg-white/5 text-dark-primary border-dark-primary/20" : "bg-primary/5 text-primary border-primary/20"
                      )}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest block opacity-40">{i < 2 ? "Today" : "Yesterday"}</span>
                  <span className={cn("text-xs md:text-sm font-black", isDark ? "text-dark-on-surface" : "text-on-surface")}>{item.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

