import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import type { TarsState } from '@/stores/assistant.store';

interface MonolithAvatarProps {
  status: TarsState;
  isOpen: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const MonolithAvatar: React.FC<MonolithAvatarProps> = ({
  status,
  isOpen,
  onClick,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-12 h-20',
    md: 'w-16 h-28',
    lg: 'w-20 h-32',
  }[size];

  return (
    <motion.div
      layoutId="monolith-avatar"
      onClick={onClick}
      className={`${sizeClasses} cursor-pointer pointer-events-auto flex items-center justify-center transition-all duration-700 ${
        isOpen ? 'scale-95' : 'hover:scale-105'
      }`}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1200px',
        rotateY: isOpen ? '12deg' : '0deg',
        rotateX: isOpen ? '4deg' : '0deg',
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {/* 3D Segmented Monolith (TARS Look) */}
      <div
        className={`relative w-full h-full bg-zinc-950 border border-white/10 shadow-2xl transition-all duration-500 flex flex-col overflow-hidden ${
          status === 'listening'
            ? 'shadow-[0_0_30px_rgba(34,211,238,0.3)] border-cyan-500/50'
            : status === 'processing'
            ? 'shadow-[0_0_30px_rgba(168,85,247,0.3)] border-purple-500/50 animate-pulse'
            : 'shadow-black'
        }`}
      >
        {/* Top Segment */}
        <div className="h-1/4 border-b border-white/5 relative flex items-center justify-center">
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              status === 'listening'
                ? 'bg-cyan-400 animate-ping'
                : status === 'processing'
                ? 'bg-purple-400 animate-pulse'
                : 'bg-white/20'
            }`}
          />
        </div>

        {/* Middle Segments */}
        <div className="flex-1 flex border-b border-white/5">
          <div className="w-1/2 border-r border-white/5 flex flex-col items-center justify-center gap-1">
            <div className="w-3 h-[1px] bg-white/10" />
            <div className="w-5 h-[1px] bg-white/10" />
            <div className="w-3 h-[1px] bg-white/10" />
          </div>
          <div className="w-1/2 flex items-center justify-center">
            <Activity
              size={12}
              className={`transition-colors ${
                status === 'listening'
                  ? 'text-cyan-400 animate-pulse'
                  : status === 'processing'
                  ? 'text-purple-400'
                  : 'text-white/10'
              }`}
            />
          </div>
        </div>

        {/* Bottom Segment */}
        <div className="h-1/4 relative flex items-center justify-center bg-black/40">
          <div
            className={`text-[8px] tracking-widest font-mono font-bold transition-colors ${
              status === 'listening'
                ? 'text-cyan-400'
                : status === 'processing'
                ? 'text-purple-400'
                : 'text-white/20'
            }`}
          >
            {status.toUpperCase()}
          </div>
        </div>

        {/* Glitch Overlay on Hover */}
        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  );
};
