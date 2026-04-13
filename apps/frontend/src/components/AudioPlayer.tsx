/**
 * @file components/AudioPlayer.tsx
 * @description Persistent mini audio player that lives in the top nav.
 *   Manages a single <audio> element via a ref so it never unmounts.
 *   Three tabs: Presets (curated), Browse (Radio Browser API search), Favorites (saved).
 * @module @polaris/frontend/components
 *
 * @dependencies
 * - zustand (useAudioPlayer store)
 * - lucide-react
 * - framer-motion
 * - hooks/useRadioBrowser
 *
 * @relatedFiles
 * - stores/audioPlayer.store.ts
 * - hooks/useRadioBrowser.ts
 * - components/Layout.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Music,
  Volume2,
  VolumeX,
  X,
  Search,
  Heart,
  HeartOff,
  Loader2,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAudioPlayer,
  PRESET_STREAMS,
  type AudioStream,
} from '@/stores/audioPlayer.store';
import { useRadioBrowser, type RadioStation } from '@/hooks/useRadioBrowser';

interface AudioPlayerProps {
  isDark: boolean;
}

type Tab = 'presets' | 'browse' | 'favorites';

export function AudioPlayer({ isDark }: AudioPlayerProps) {
  const {
    currentStream,
    isPlaying,
    volume,
    isExpanded,
    favorites,
    selectStream,
    play,
    pause,
    togglePlay,
    setVolume,
    toggleExpanded,
    addFavorite,
    removeFavorite,
    isFavorite,
  } = useAudioPlayer();

  const { results, isLoading, error, query, setQuery, search, clear } = useRadioBrowser();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create the audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
    }
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
    audioRef.current.src = currentStream ? currentStream.url : '';
  }, [currentStream]);

  // Sync play/pause — browser autoplay policy: only plays after user gesture
  useEffect(() => {
    if (!audioRef.current || !currentStream) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        pause();
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Could not play stream. Try another.', { id: 'audio-err' });
        });
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentStream, pause]);

  const handleStop = () => {
    selectStream(null);
    pause();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) search(query);
  };

  const handleToggleFavorite = (stream: AudioStream) => {
    if (isFavorite(stream.id)) {
      removeFavorite(stream.id);
    } else {
      addFavorite(stream);
    }
  };

  const isMuted = volume === 0;

  // ── Stream row ────────────────────────────────────────────────────────────
  const StreamRow = ({
    stream,
    showFavoriteBtn = false,
    isFav = false,
  }: {
    stream: AudioStream & { bitrate?: number; votes?: number };
    showFavoriteBtn?: boolean;
    isFav?: boolean;
  }) => {
    const isActive = currentStream?.id === stream.id;
    return (
      <div
        className={cn(
          'w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2.5 transition-all group',
          isActive
            ? isDark
              ? 'bg-dark-primary/15 text-dark-primary'
              : 'bg-primary/10 text-primary'
            : isDark
            ? 'hover:bg-white/5 text-dark-on-surface-variant'
            : 'hover:bg-black/5 text-on-surface-variant'
        )}
      >
        <button
          onClick={() => selectStream(stream)}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <span className="shrink-0">{stream.emoji}</span>
          <span className="truncate flex-1">{stream.label}</span>
          {'bitrate' in stream && stream.bitrate ? (
            <span className="text-xs opacity-40 shrink-0">{stream.bitrate}k</span>
          ) : null}
          {isActive && isPlaying && (
            <span className="text-xs opacity-60 flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              live
            </span>
          )}
          {isActive && !isPlaying && (
            <span className="text-xs opacity-40 shrink-0">paused</span>
          )}
        </button>

        {showFavoriteBtn && (
          <button
            onClick={() => handleToggleFavorite(stream)}
            title={isFav ? 'Remove from favorites' : 'Save to favorites'}
            className={cn(
              'shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all',
              isFav
                ? 'opacity-100 text-rose-400 hover:text-rose-300'
                : isDark
                ? 'hover:bg-white/10 text-white/40 hover:text-white/80'
                : 'hover:bg-black/5 text-black/30 hover:text-black/60'
            )}
          >
            {isFav ? <HeartOff className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* ── Mini Player ───────────────────────────────────────── */}
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
            'relative w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border',
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

      {/* ── Expanded Panel ────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'absolute right-0 top-12 w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden flex flex-col',
              isDark
                ? 'bg-dark-surface/95 backdrop-blur-xl border-white/10'
                : 'bg-white/95 backdrop-blur-xl border-black/5'
            )}
          >
            {/* Header */}
            <div
              className={cn(
                'flex items-center justify-between px-4 py-3 border-b shrink-0',
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

            {/* Tabs */}
            <div
              className={cn(
                'flex gap-1 px-3 pt-2 shrink-0',
              )}
            >
              {(['presets', 'browse', 'favorites'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'browse') {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                  }}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl text-xs font-medium capitalize transition-all',
                    activeTab === tab
                      ? isDark
                        ? 'bg-dark-primary/20 text-dark-primary'
                        : 'bg-primary/10 text-primary'
                      : isDark
                      ? 'text-dark-on-surface-variant hover:bg-white/5'
                      : 'text-on-surface-variant hover:bg-black/5'
                  )}
                >
                  {tab === 'browse' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Radio className="w-3 h-3" />
                      Browse
                    </span>
                  ) : tab === 'favorites' ? (
                    <span className="flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3" />
                      Saved{favorites.length > 0 ? ` (${favorites.length})` : ''}
                    </span>
                  ) : (
                    'Presets'
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="overflow-y-auto max-h-64 px-2 py-2">
              {/* ── Presets tab ─────────────────────────────── */}
              {activeTab === 'presets' && (
                <div className="space-y-0.5">
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
                    {!currentStream && (
                      <span className="ml-auto text-xs opacity-60">active</span>
                    )}
                  </button>
                  {PRESET_STREAMS.map((stream) => (
                    <StreamRow
                      key={stream.id}
                      stream={stream}
                      showFavoriteBtn
                      isFav={isFavorite(stream.id)}
                    />
                  ))}
                </div>
              )}

              {/* ── Browse tab ──────────────────────────────── */}
              {activeTab === 'browse' && (
                <div>
                  <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-3 px-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="lofi, jazz, ambient, classical…"
                      className={cn(
                        'flex-1 text-xs px-3 py-2 rounded-xl border outline-none transition-all',
                        isDark
                          ? 'bg-white/5 border-white/10 text-dark-on-surface placeholder:text-white/30 focus:border-dark-primary/50'
                          : 'bg-black/5 border-black/10 text-on-surface placeholder:text-black/30 focus:border-primary/50'
                      )}
                    />
                    <button
                      type="submit"
                      disabled={!query.trim() || isLoading}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-90 flex items-center gap-1',
                        isDark
                          ? 'bg-dark-primary/20 text-dark-primary hover:bg-dark-primary/30 disabled:opacity-40'
                          : 'bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40'
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </form>

                  {error && (
                    <p className="text-xs text-center py-4 opacity-60 text-rose-400">{error}</p>
                  )}

                  {!isLoading && results.length === 0 && !error && (
                    <p className={cn('text-xs text-center py-6 opacity-40', isDark ? 'text-white' : 'text-black')}>
                      Search by genre tag — results sorted by community votes
                    </p>
                  )}

                  <div className="space-y-0.5">
                    {results.map((station: RadioStation) => (
                      <StreamRow
                        key={station.id}
                        stream={station}
                        showFavoriteBtn
                        isFav={isFavorite(station.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Favorites tab ───────────────────────────── */}
              {activeTab === 'favorites' && (
                <div>
                  {favorites.length === 0 ? (
                    <div className={cn('text-xs text-center py-8 opacity-40', isDark ? 'text-white' : 'text-black')}>
                      <Heart className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      No saved stations yet.
                      <br />
                      Click{' '}
                      <Heart className="w-3 h-3 inline-block" />
                      {' '}on any stream to save it.
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {favorites.map((stream) => (
                        <StreamRow
                          key={stream.id}
                          stream={stream}
                          showFavoriteBtn
                          isFav
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Volume */}
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 border-t shrink-0',
                isDark ? 'border-white/5' : 'border-black/5'
              )}
            >
              <button
                onClick={() => setVolume(isMuted ? 0.7 : 0)}
                className={cn(
                  'transition-colors',
                  isDark
                    ? 'text-dark-on-surface-variant hover:text-dark-primary'
                    : 'text-on-surface-variant hover:text-primary'
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
