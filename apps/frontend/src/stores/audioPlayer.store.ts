/**
 * @file stores/audioPlayer.store.ts
 * @description Zustand store for the persistent audio player.
 *   Manages stream selection, playback state, and volume.
 *   The actual <audio> element lifecycle is managed by the AudioPlayer component.
 * @module @polaris/frontend/stores
 *
 * @dependencies
 * - zustand
 *
 * @relatedFiles
 * - components/AudioPlayer.tsx
 * - components/Layout.tsx
 * - components/FocusMode.tsx
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AudioStream {
  id: string;
  label: string;
  url: string;
  emoji: string;
}

/** Curated direct-stream presets — community-rated stations from Radio Browser. */
export const PRESET_STREAMS: AudioStream[] = [
  {
    id: 'lofi-hiphop',
    label: 'Lofi Hip Hop',
    url: 'https://streams.ilovemusic.de/iloveradio17.mp3',
    emoji: '🎵',
  },
  {
    id: 'chillout',
    label: 'Chillout Lounge',
    url: 'http://streaming.radionomy.com/ChilloutLounge',
    emoji: '🌙',
  },
  {
    id: 'classical',
    label: 'Classical Focus',
    url: 'http://stream.srg-ssr.ch/m/rsc_de/mp3_128',
    emoji: '🎻',
  },
  {
    id: 'jazz',
    label: 'Smooth Jazz',
    url: 'https://streaming.live365.com/a18141',
    emoji: '🎷',
  },
  {
    id: 'ambient',
    label: 'Ambient / Drone',
    url: 'https://live.radioreklama.fm/ambient128.mp3',
    emoji: '🌊',
  },
];

interface AudioPlayerState {
  /** Currently selected stream (null = none / silence) */
  currentStream: AudioStream | null;
  /** Custom URL entered by user */
  customUrl: string;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Volume 0–1 */
  volume: number;
  /** Whether the player panel is expanded */
  isExpanded: boolean;
  /** User-saved favorite stations */
  favorites: AudioStream[];

  // Actions
  selectStream: (stream: AudioStream | null) => void;
  setCustomUrl: (url: string) => void;
  playCustomUrl: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  toggleExpanded: () => void;
  addFavorite: (stream: AudioStream) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

export const useAudioPlayer = create<AudioPlayerState>()(
  persist(
    (set, get) => ({
      currentStream: null,
      customUrl: '',
      isPlaying: false,
      volume: 0.7,
      isExpanded: false,
      favorites: [],

      selectStream: (stream) => {
        set({ currentStream: stream, isPlaying: stream !== null });
      },

      setCustomUrl: (url) => set({ customUrl: url }),

      playCustomUrl: () => {
        const { customUrl } = get();
        if (!customUrl.trim()) return;
        const custom: AudioStream = {
          id: 'custom',
          label: 'Custom Stream',
          url: customUrl.trim(),
          emoji: '🔗',
        };
        set({ currentStream: custom, isPlaying: true });
      },

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),

      toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),

      addFavorite: (stream) => {
        set((s) => {
          if (s.favorites.some((f) => f.id === stream.id)) return s;
          return { favorites: [...s.favorites, stream] };
        });
      },

      removeFavorite: (id) => {
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) }));
      },

      isFavorite: (id) => {
        return get().favorites.some((f) => f.id === id);
      },
    }),
    {
      name: 'polaris:audio',
      // Only persist stream selection + volume + favorites, not transient playing state
      partialize: (s) => ({
        currentStream: s.currentStream,
        customUrl: s.customUrl,
        volume: s.volume,
        favorites: s.favorites,
      }),
    }
  )
);
