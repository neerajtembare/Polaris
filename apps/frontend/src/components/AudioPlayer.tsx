/**
 * @file components/AudioPlayer.tsx
 * @description Persistent mini audio player that lives in the top nav.
 *   Manages a single <audio> element via a ref so it never unmounts.
 *   Expands into a panel showing stream presets and a custom URL input.
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - zustand (useAudioPlayer store)
 * - lucide-react
 * - framer-motion
 *
 * @relatedFiles
 * - stores/audioPlayer.store.ts
 * - components/Layout.tsx
 * - components/FocusMode.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Music,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Link,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAudioPlayer,
  PRESET_STREAMS,
  type AudioStream,
} from '@/stores/audioPlayer.store';

interface AudioPlayerProps {
  isDark: boolean;
}

export function AudioPlayer({ isDark }: AudioPlayerProps) {
  const {
    currentStream,
    isPlaying,
    volume,
    isExpanded,
    customUrl,
    selectStream,
    setCustomUrl,
    playCustomUrl,
    play,
    pause,
    togglePlay,
    setVolume,
    toggleExpanded,
  } = useAudioPlayer();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  // Create the audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }
    return () => {
      // Don't destroy on unmount — this component should never unmount
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync stream URL
  useEffect(() => {
    if (!audioRef.current) return;
    if (currentStream) {
      audioRef.current.src = currentStream.url;
    } else {
      audioRef.current.src = '';
    }
  }, [currentStream]);

  // Sync play/pause (user must have interacted first — no autoplay)
  useEffect(() => {
    if (!audioRef.current || !currentStream) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay or stream unreachable — revert and notify user
        pause();
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Could not play stream. Check the URL or try another.', { id: 'audio-err' });
        });
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentStream, pause]);

  const handleSelectPreset = (stream: AudioStream) => {
    selectStream(stream);
  };

  const handleStop = () => {
    selectStream(null);
    pause();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playCustomUrl();
    setShowCustom(false);
  };

  const isMuted = volume === 0;

  return (
    <div className="relative">
      {/* ── Mini Player Button ─────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {currentStream && (
          <span className="text-xs hidden md:block max-w-[100px] truncate opacity-70">
            {currentStream.emoji} {currentStream.label}
          </span>
        )}

        <button
          onClick={togglePlay}
          disabled={!currentStream}
          title={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border',
            !currentStream && 'opacity-40 cursor-not-allowed',
            isDark
              ? 'bg-white/5 border-white/10 text-dark-primary hover:bg-white/10'
              : 'bg-black/5 border-transparent text-on-surface-variant hover:bg-black/10'
          )}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleExpanded}
          title="Audio streams"
          className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border',
            isExpanded
              ? isDark
                ? 'bg-dark-primary/20 border-dark-primary/40 text-dark-primary'
                : 'bg-primary/10 border-primary/30 text-primary'
              : isDark
              ? 'bg-white/5 border-white/10 text-dark-primary hover:bg-white/10'
              : 'bg-black/5 border-transparent text-on-surface-variant hover:bg-black/10'
          )}
        >
          <Music className="w-3.5 h-3.5" />
          {isPlaying && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ── Expanded Panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'absolute right-0 top-12 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden',
              isDark
                ? 'bg-dark-surface/95 backdrop-blur-xl border-white/10'
                : 'bg-white/95 backdrop-blur-xl border-black/5'
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b',
                isDark ? 'border-white/5' : 'border-black/5'
              )}
            >
              <span className="text-sm font-semibold">Audio Streams</span>
              <button
                onClick={toggleExpanded}
                className={cn(
                  'w-6 h-6 rounded-lg flex items-center justify-center transition-all',
                  isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stream list */}
            <div className="p-2">
              {/* Stop / silence option */}
              <button
                onClick={handleStop}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 transition-all',
                  !currentStream
                    ? isDark
                      ? 'bg-dark-primary/15 text-dark-primary'
                      : 'bg-primary/10 text-primary'
                    : isDark
                    ? 'hover:bg-white/5 text-dark-on-surface-variant'
                    : 'hover:bg-black/5 text-on-surface-variant'
                )}
              >
                <span>🔇</span>
                <span>Silence / Off</span>
                {!currentStream && <span className="ml-auto text-xs opacity-60">active</span>}
              </button>

              {PRESET_STREAMS.map((stream) => {
                const isActive = currentStream?.id === stream.id;
                return (
                  <button
                    key={stream.id}
                    onClick={() => handleSelectPreset(stream)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-3 transition-all',
                      isActive
                        ? isDark
                          ? 'bg-dark-primary/15 text-dark-primary'
                          : 'bg-primary/10 text-primary'
                        : isDark
                        ? 'hover:bg-white/5 text-dark-on-surface-variant'
                        : 'hover:bg-black/5 text-on-surface-variant'
                    )}
                  >
                    <span>{stream.emoji}</span>
                    <span>{stream.label}</span>
                    {isActive && isPlaying && (
                      <span className="ml-auto text-xs opacity-60 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                        playing
                      </span>
                    )}
                    {isActive && !isPlaying && (
                      <span className="ml-auto text-xs opacity-40">paused</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom URL */}
            <div
              className={cn(
                'border-t px-3 pb-3 pt-2',
                isDark ? 'border-white/5' : 'border-black/5'
              )}
            >
              <button
                onClick={() => setShowCustom((v) => !v)}
                className={cn(
                  'flex items-center gap-2 text-xs font-medium mb-2 transition-colors',
                  isDark
                    ? 'text-dark-on-surface-variant hover:text-dark-primary'
                    : 'text-on-surface-variant hover:text-primary'
                )}
              >
                <Link className="w-3 h-3" />
                Custom stream URL
                {showCustom ? (
                  <ChevronUp className="w-3 h-3 ml-auto" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-auto" />
                )}
              </button>

              <AnimatePresence>
                {showCustom && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCustomSubmit}
                    className="flex gap-2 overflow-hidden"
                  >
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://stream.example.com/live.mp3"
                      className={cn(
                        'flex-1 text-xs px-3 py-2 rounded-xl border outline-none transition-all',
                        isDark
                          ? 'bg-white/5 border-white/10 text-dark-on-surface placeholder:text-white/30 focus:border-dark-primary/50'
                          : 'bg-black/5 border-black/10 text-on-surface placeholder:text-black/30 focus:border-primary/50'
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!customUrl.trim()}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-90',
                        isDark
                          ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30 disabled:opacity-40'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40'
                      )}
                    >
                      Play
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Volume */}
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 border-t',
                isDark ? 'border-white/5' : 'border-black/5'
              )}
            >
              <button
                onClick={() => setVolume(isMuted ? 0.7 : 0)}
                className={cn(
                  'transition-colors',
                  isDark ? 'text-dark-on-surface-variant hover:text-dark-primary' : 'text-on-surface-variant hover:text-primary'
                )}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className={cn(
                  'flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-current',
                  isDark ? 'text-dark-primary' : 'text-primary'
                )}
              />
              <span className="text-xs opacity-50 w-7 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
