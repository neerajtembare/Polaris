import React from 'react';
import { motion } from 'motion/react';
import { Rocket, Palette, Monitor, Users, Plus, MoreVertical, Target, Lock, Command, Database, Shield, ChevronRight, Search, Bell, Settings, Mic, History, Activity } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Theme, ScreenId } from '@/src/types';
import ReactiveCard from './ui/ReactiveCard';
import GoalConstellation from './3d/GoalConstellation';

interface GoalMatrixProps {
  theme: Theme;
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export default function GoalMatrix({ theme, onNavigate }: GoalMatrixProps) {
  const isDark = theme === 'dark';

  return (
    <div className="px-4 md:px-12 lg:px-20 max-w-[1600px] mx-auto relative">
      {/* 3D Background */}
      <GoalConstellation theme={theme} />

      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-16 relative z-10">
        <div className="max-w-2xl space-y-2">
          {isDark && <p className="font-label text-[10px] uppercase tracking-[0.2em] text-dark-primary">Mission Protocol</p>}
          <h1 className={cn(
            "text-4xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-4",
            isDark ? "font-headline text-dark-on-surface" : "text-on-surface"
          )}>
            {isDark ? "Goal Matrix" : "Goal Constellations"}
          </h1>
          <p className={cn(
            "text-base md:text-lg tracking-wide leading-relaxed",
            isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant"
          )}>
            {isDark ? "Real-time telemetry for active development cycles and strategic objectives." : "Map your strategic objectives and track velocity across all active nodes."}
          </p>
        </div>
        <div className="flex gap-3 md:gap-4 w-full md:w-auto">
          <button className={cn(
            "flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-sm transition-all",
            isDark ? "bg-white/5 text-dark-on-surface hover:bg-white/10" : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest"
          )}>
            Filter Nodes
          </button>
          <button className={cn(
            "flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 text-sm",
            isDark ? "plasma-gradient text-dark-bg" : "signature-gradient text-white shadow-primary/20"
          )}>
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            {isDark ? "Deploy" : "New Goal"}
          </button>
        </div>
      </header>

      {/* Bento Grid of Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
        {/* Primary Goal Card (Featured) */}
        <ReactiveCard isDark={isDark} className="md:col-span-2 overflow-hidden group">
          {/* Background Glow for Dark Mode */}
          {isDark && (
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-dark-primary/20 blur-[100px] pointer-events-none" />
          )}

          <div className="absolute top-0 right-0 p-6 md:p-10">
            <span className={cn(
              "px-3 md:px-5 py-1 md:py-2 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]",
              isDark ? "bg-dark-secondary/10 text-dark-secondary border border-dark-secondary/20" : "bg-tertiary/10 text-tertiary"
            )}>
              {isDark ? "Critical Path" : "Priority Alpha"}
            </span>
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-10">
              <div className={cn(
                "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12 shrink-0",
                isDark ? "bg-white/5 text-dark-primary border border-white/10" : "bg-primary/5 text-primary"
              )}>
                <Rocket className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="min-w-0">
                <h3 className={cn("text-xl md:text-3xl font-black tracking-tight truncate", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>
                  {isDark ? "Neural Architecture v2" : "Market Expansion Q3"}
                </h3>
                <p className={cn("text-xs md:text-sm opacity-60 truncate", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Telemetry active • Last sync: 2m ago</p>
              </div>
            </div>
            <div className="mt-auto pt-6 md:pt-10">
              <div className="flex justify-between items-end mb-4 md:mb-6">
                <div className="flex flex-col">
                  <span className={cn("text-4xl md:text-5xl font-black leading-none tracking-tighter", isDark ? "text-dark-primary font-label" : "text-primary")}>
                    84<span className="text-xl md:text-2xl font-medium">%</span>
                  </span>
                  <span className={cn("text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-2", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>System Velocity</span>
                </div>
                <div className="text-right">
                  <span className={cn("text-xl md:text-2xl font-black", isDark ? "text-dark-on-surface" : "text-on-surface")}>{isDark ? "42 / 50" : "12 / 15"}</span>
                  <span className={cn("block text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-1", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>{isDark ? "Nodes Deployed" : "Regions Captured"}</span>
                </div>
              </div>
              <div className={cn("w-full h-3 md:h-4 rounded-full overflow-hidden p-0.5 md:p-1", isDark ? "bg-white/5" : "bg-surface-container-high")}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '84%' }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className={cn("h-full rounded-full transition-all relative", isDark ? "plasma-gradient shadow-[0_0_20px_rgba(129,236,255,0.6)]" : "signature-gradient")} 
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          </div>
        </ReactiveCard>

        {/* Goal Card 1 */}
        <ReactiveCard isDark={isDark} className="group">
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
              isDark ? "bg-white/5 text-dark-tertiary border border-white/10" : "bg-secondary/5 text-secondary"
            )}>
              <Palette className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <button className={cn("opacity-40 hover:opacity-100 transition-opacity relative z-20", isDark ? "text-dark-on-surface" : "text-on-surface")}><MoreVertical className="w-5 h-5" /></button>
          </div>
          <h3 className={cn("text-lg md:text-xl font-bold mb-3", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>Core Optimization</h3>
          <p className={cn("text-xs md:text-sm opacity-60 mb-8 md:mb-10 leading-relaxed", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Increase efficiency of the primary data processing nodes across all clusters.</p>
          <div className="space-y-4 md:space-y-5">
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>Progress</span>
              <span className={isDark ? "text-dark-tertiary" : "text-primary"}>42%</span>
            </div>
            <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-low")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '42%' }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className={cn("h-full rounded-full", isDark ? "bg-dark-tertiary shadow-[0_0_10px_rgba(112,170,255,0.4)]" : "bg-primary")} 
              />
            </div>
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-label uppercase tracking-widest opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>18/40 Units</span>
              <span className="flex items-center gap-1">
                <History className="w-3 h-3" /> 4D Streak
              </span>
            </div>
          </div>
        </ReactiveCard>

        {/* Goal Card 2 */}
        <ReactiveCard isDark={isDark} className="group">
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
              isDark ? "bg-white/5 text-dark-secondary border border-white/10" : "bg-tertiary/5 text-tertiary"
            )}>
              <Database className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <button className={cn("opacity-40 hover:opacity-100 transition-opacity relative z-20", isDark ? "text-dark-on-surface" : "text-on-surface")}><MoreVertical className="w-5 h-5" /></button>
          </div>
          <h3 className={cn("text-lg md:text-xl font-bold mb-3", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>API Mesh Deployment</h3>
          <p className={cn("text-xs md:text-sm opacity-60 mb-8 md:mb-10 leading-relaxed", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Deploy the new API gateway across all global clusters for reduced latency.</p>
          <div className="space-y-4 md:space-y-5">
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>Milestone</span>
              <span className={isDark ? "text-dark-secondary" : "text-tertiary"}>68%</span>
            </div>
            <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-low")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '68%' }}
                transition={{ duration: 1.5, delay: 0.4 }}
                className={cn("h-full rounded-full", isDark ? "bg-dark-secondary shadow-[0_0_10px_rgba(194,128,255,0.4)]" : "bg-tertiary")} 
              />
            </div>
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-label uppercase tracking-widest opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>34/50 Units</span>
              <span className="flex items-center gap-1">
                <History className="w-3 h-3" /> 15D Streak
              </span>
            </div>
          </div>
        </ReactiveCard>

        {/* Goal Card 3 */}
        <ReactiveCard isDark={isDark} className="group">
          <div className="flex justify-between items-start mb-8 md:mb-10">
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
              isDark ? "bg-white/5 text-dark-primary border border-white/10" : "bg-primary/5 text-primary"
            )}>
              <Shield className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <button className={cn("opacity-40 hover:opacity-100 transition-opacity relative z-20", isDark ? "text-dark-on-surface" : "text-on-surface")}><MoreVertical className="w-5 h-5" /></button>
          </div>
          <h3 className={cn("text-lg md:text-xl font-bold mb-3", isDark ? "text-dark-on-surface font-headline" : "text-on-surface")}>Security Hardening</h3>
          <p className={cn("text-xs md:text-sm opacity-60 mb-8 md:mb-10 leading-relaxed", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>Implement zero-trust architecture across the internal network nodes.</p>
          <div className="space-y-4 md:space-y-5">
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>Efficiency</span>
              <span className={isDark ? "text-dark-primary" : "text-primary"}>92%</span>
            </div>
            <div className={cn("w-full h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-surface-container-low")}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.5, delay: 0.6 }}
                className={cn("h-full rounded-full", isDark ? "bg-dark-primary shadow-[0_0_10px_rgba(129,236,255,0.4)]" : "bg-primary")} 
              />
            </div>
            <div className={cn("flex justify-between text-[8px] md:text-[10px] font-label uppercase tracking-widest opacity-40", isDark ? "text-dark-on-surface-variant" : "text-on-surface-variant")}>
              <span>11/12 Units</span>
              <span className="flex items-center gap-1">
                <History className="w-3 h-3" /> 2D Streak
              </span>
            </div>
          </div>
        </ReactiveCard>
      </div>

      {/* Resource Allocation Focus (Dark Only) */}
      {isDark && (
        <div className="mt-12 bg-surface-container-low rounded-2xl p-6 md:p-8 border border-outline-variant/10 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="font-bold font-headline text-dark-on-surface">Resource Allocation Focus</h3>
              <p className="text-[10px] text-dark-on-surface-variant font-label uppercase tracking-widest">Adjust Priority for System Resources</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-label text-dark-on-surface-variant uppercase tracking-widest">Criticality:</span>
              <span className="text-xl font-label font-bold text-dark-primary">8.5 / 10</span>
            </div>
          </div>
          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1 bg-surface-container-highest rounded-full"></div>
            </div>
            <div className="absolute inset-y-0 left-0 w-[85%] flex items-center">
              <div className="w-full h-1 bg-dark-primary rounded-full"></div>
            </div>
            <div className="relative flex justify-between">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="w-4 h-4 rounded-full bg-surface-container-highest border-2 border-white/10"></div>
              ))}
            </div>
            <div className="absolute left-[85%] top-1/2 -translate-y-1/2 -translate-x-1/2">
              <div className="w-6 h-6 rounded-full bg-dark-primary shadow-[0_0_20px_rgba(129,236,255,0.6)] cursor-pointer flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-dark-bg"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
