import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, X, Check, Edit2, Zap, Terminal, Activity, Settings, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CRTOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]" />
    <div className="absolute inset-0 bg-white/5 opacity-[0.01]" />
  </div>
);

const Waveform = ({ active }: { active: boolean }) => (
  <div className="flex items-center gap-1 h-4">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        animate={active ? {
          height: [4, 16, 8, 12, 4],
        } : { height: 4 }}
        transition={{
          repeat: Infinity,
          duration: 0.5,
          delay: i * 0.05,
        }}
        className="w-1 bg-cyan-500 rounded-full"
      />
    ))}
  </div>
);

const Monolith = ({ status, isOpen, onClick }: { status: string, isOpen: boolean, onClick: () => void }) => (
  <motion.div 
    layoutId="monolith-avatar"
    onClick={onClick}
    className={`w-20 h-32 cursor-pointer pointer-events-auto flex items-center justify-center transition-all duration-700
      ${isOpen ? 'scale-90' : 'hover:scale-110'}`}
    style={{
      transformStyle: 'preserve-3d',
      perspective: '1200px',
      rotateY: isOpen ? '15deg' : '0deg',
      rotateX: isOpen ? '5deg' : '0deg'
    }}
    transition={{ type: "spring", stiffness: 260, damping: 20 }}
  >
    {/* The 3D Slab Shape - Segmented TARS Look */}
    <div className={`relative w-full h-full bg-zinc-950 border border-white/10 shadow-2xl transition-all duration-500 flex flex-col overflow-hidden
      ${status === 'listening' ? 'shadow-[0_0_40px_rgba(34,211,238,0.3)] border-cyan-500/50' : 'shadow-black'}`}>
      
      {/* Top Segment */}
      <div className="h-1/4 border-b border-white/5 relative flex items-center justify-center">
        <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${status === 'listening' ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
      </div>
      
      {/* Middle Segments */}
      <div className="flex-1 flex border-b border-white/5">
        <div className="w-1/2 border-r border-white/5 flex flex-col items-center justify-center gap-1">
          <div className="w-4 h-[1px] bg-white/10" />
          <div className="w-6 h-[1px] bg-white/10" />
          <div className="w-4 h-[1px] bg-white/10" />
        </div>
        <div className="w-1/2 flex items-center justify-center">
          <Activity size={12} className={`transition-colors ${status === 'listening' ? 'text-cyan-500' : 'text-white/10'}`} />
        </div>
      </div>
      
      {/* Bottom Segment */}
      <div className="h-1/4 relative flex items-center justify-center">
        <div className={`text-[7px] tracking-tighter font-bold transition-colors ${status === 'listening' ? 'text-cyan-400' : 'text-white/10'}`}>
          {status.toUpperCase()}
        </div>
      </div>

      {/* Glitch Effect on Hover */}
      <div className="absolute inset-0 bg-cyan-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  </motion.div>
);

const TARSAgentUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [text, setText] = useState("");
  const [humor, setHumor] = useState(75);
  const [honesty, setHonesty] = useState(90);
  const [logs, setLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fullText = "7-day streak. Don't break it today. Reading goal is 68% complete. Suggest: 30 minutes of Atomic Habits before dinner.";

  // Typewriter Effect Simulation
  useEffect(() => {
    if (isOpen) {
      let i = 0;
      const interval = setInterval(() => {
        setText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) clearInterval(interval);
      }, 30);
      return () => clearInterval(interval);
    } else {
      setText("");
    }
  }, [isOpen]);

  // Simulated System Logs
  useEffect(() => {
    const logMessages = [
      "INITIALIZING POLARIS_CORE...",
      "SYNCING NEURAL_NET_V4.2...",
      "HUMOR_LEVEL SET TO 75%",
      "HONESTY_PROTOCOL ACTIVE",
      "MONITORING STREAKS...",
      "FETCHING GOAL_DATA...",
      "READY FOR COMMAND >"
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logMessages.length) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logMessages[i]}`].slice(-5));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none font-mono selection:bg-cyan-500/30">
      <CRTOverlay />
      
      {/* 1. DOCKED MONOLITH */}
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-8 right-8 z-50">
            <Monolith status={status} isOpen={false} onClick={() => setIsOpen(true)} />
          </div>
        )}
      </AnimatePresence>

      {/* 2. ASSISTANT PANEL */}
      <div className={`fixed right-0 top-0 h-full w-[400px] bg-zinc-950/90 backdrop-blur-3xl border-l border-white/10 
        transition-transform duration-500 ease-in-out pointer-events-auto flex flex-col shadow-2xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header with ASCII Art and EXPANDED MONOLITH */}
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Terminal size={16} className="text-cyan-500" />
                <h2 className="text-[10px] tracking-[0.4em] uppercase text-white/50">System.TARS // Polaris</h2>
              </div>
              <pre className="text-[6px] leading-[1] text-cyan-500/40 font-mono select-none">
{`   _______  _______  ______    _______ 
  |       ||   _   ||    _ |  |       |
  |_     _||  |_|  ||   | ||  |  _____|
    |   |  |       ||   |_||_ | |_____ 
    |   |  |       ||    __  ||_____  |
    |   |  |   _   ||   |  | | _____| |
    |___|  |__| |__||___|  |_||_______|`}
              </pre>
            </div>
            
            <div className="flex flex-col items-end gap-4">
              <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white cursor-pointer transition-colors"><X size={18} /></button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Monolith status={status} isOpen={true} onClick={() => {}} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* TARS Message */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-cyan-500 tracking-widest">
                <Zap size={10} /> BRIEFING_CORE // 04:14 PM
              </div>
              <Waveform active={status === 'listening'} />
            </div>
            
            <div className="relative">
              <div className="absolute -left-3 top-0 bottom-0 w-[1px] bg-cyan-500/20" />
              <p className="text-xs leading-relaxed text-zinc-300 min-h-[60px] pl-2">
                {text}
                <span className="inline-block w-2 h-4 bg-cyan-500 ml-1 animate-pulse align-middle" />
              </p>
            </div>
          </div>

          {/* Personality Settings (The Geeky Part) */}
          <div className="space-y-4 p-4 bg-white/5 border border-white/5 rounded-sm">
            <div className="flex items-center gap-2 text-[9px] text-white/40 uppercase tracking-widest">
              <Settings size={10} /> Personality_Matrix
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] uppercase text-white/30">
                  <span>Humor_Level</span>
                  <span className="text-cyan-500">{humor}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={humor} 
                  onChange={(e) => setHumor(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 bg-white/10 h-1 rounded-none appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] uppercase text-white/30">
                  <span>Honesty_Protocol</span>
                  <span className="text-cyan-500">{honesty}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={honesty} 
                  onChange={(e) => setHonesty(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 bg-white/10 h-1 rounded-none appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Tool Confirmation Card */}
          <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-sm overflow-hidden backdrop-blur-md relative group">
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-4 space-y-4 relative">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert size={10} className="text-cyan-400" />
                    <h4 className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Pending_Action</h4>
                  </div>
                  <p className="text-base text-white font-light tracking-tight">Log 30 Pages</p>
                  <p className="text-[10px] text-white/40 mt-1">Goal: Reading_2026 // ID: 8821-X</p>
                </div>
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5" />
                    <motion.circle 
                      cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1" 
                      strokeDasharray="113" 
                      initial={{ strokeDashoffset: 113 }}
                      animate={{ strokeDashoffset: 30 }}
                      className="text-cyan-500" 
                    />
                  </svg>
                  <span className="text-[9px] text-cyan-400 font-bold">3s</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 bg-white hover:bg-cyan-400 text-black text-[9px] font-bold py-3 uppercase flex items-center justify-center gap-2 transition-all group cursor-pointer active:scale-95">
                  <Check size={12} className="group-hover:scale-110 transition-transform" /> Execute_Command
                </button>
                <button className="px-4 border border-white/10 hover:bg-white/5 text-white/40 text-[9px] uppercase transition-colors cursor-pointer active:scale-95">
                  <Edit2 size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* System Logs */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[8px] text-white/20 uppercase tracking-widest">
              <Activity size={8} /> System_Logs
            </div>
            <div className="text-[8px] font-mono text-white/30 space-y-1 bg-black/20 p-2 border border-white/5">
              {logs.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Input Dock */}
        <div className="p-6 bg-black/40 border-t border-white/5">
          <div className="relative group">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-cyan-500/50 text-[10px] font-bold">{`>`}</div>
            <input 
              type="text" 
              placeholder="ENTER_COMMAND_HERE..."
              onFocus={() => setStatus('listening')}
              onBlur={() => setStatus('idle')}
              className="w-full bg-transparent border-b border-white/10 rounded-none py-3 px-4 text-xs focus:outline-none focus:border-cyan-500 transition-all placeholder:text-white/10 text-white"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3">
              <Mic size={14} className={`transition-colors cursor-pointer ${status === 'listening' ? 'text-cyan-500' : 'text-white/20 hover:text-white'}`} />
              <Send size={14} className="text-white/20 hover:text-cyan-500 transition-colors cursor-pointer" />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {['FOCUS_INIT', 'GOAL_STATUS', 'SYSTEM_REBOOT'].map(tag => (
              <button key={tag} className="text-[8px] border border-white/5 px-3 py-1 text-white/20 hover:text-cyan-400 hover:border-cyan-400/30 transition-all uppercase tracking-widest cursor-pointer bg-white/5">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
};

export default TARSAgentUI;
