import React from 'react';
import { Settings, Tv } from 'lucide-react';
import { useAssistantStore } from '@/stores/assistant.store';

export const PersonalityMatrix: React.FC = () => {
  const { humor, honesty, isCrtEnabled, setHumor, setHonesty, toggleCrt } = useAssistantStore();

  return (
    <div className="space-y-4 p-4 bg-white/5 border border-white/5 rounded-sm font-mono">
      <div className="flex items-center justify-between text-[10px] text-white/50 uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <Settings size={12} className="text-cyan-400" /> Personality_Matrix
        </span>
        <button
          onClick={toggleCrt}
          className={`flex items-center gap-1 text-[9px] px-2 py-0.5 border transition-colors cursor-pointer ${
            isCrtEnabled
              ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
              : 'border-white/10 text-white/30 hover:text-white'
          }`}
        >
          <Tv size={10} /> CRT_{isCrtEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="space-y-3">
        {/* Humor Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/40">
            <span>Humor_Level</span>
            <span className="text-cyan-400 font-bold">{humor}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={humor}
            onChange={(e) => setHumor(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 bg-white/10 h-1 appearance-none cursor-pointer"
          />
        </div>

        {/* Honesty Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/40">
            <span>Honesty_Protocol</span>
            <span className="text-cyan-400 font-bold">{honesty}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={honesty}
            onChange={(e) => setHonesty(parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 bg-white/10 h-1 appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
