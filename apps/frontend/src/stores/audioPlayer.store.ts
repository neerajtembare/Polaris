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

/** Curated direct-stream presets. Update URLs here if a stream goes down. */
export const PRESET_STREAMS: AudioStream[] = [
  {
    id: 'lofi',
    label: 'Lofi Chill',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    emoji: '🎵',
  },
  {
    id: 'rain',
    label: 'Rain & Thunder',
    url: 'https://stream.zeno.fm/yn065g0jnqhvv',
    emoji: '🌧️',
  },
  {
    id: 'brown-noise',
    label: 'Brown Noise',
    url: 'https://stream.zeno.fm/a8e4smdphs8uv',
    emoji: '🟫',
  },
  {
    id: 'synthwave',
    label: 'Synthwave',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
    emoji: '🌆',
  },
  {
    id: 'coffee',
    label: 'Coffee Shop',
    url: 'https://stream.zeno.fm/scny4qn0e28uv',
    emoji: '☕',
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

  // Actions
  selectStream: (stream: AudioStream | null) => void;
  setCustomUrl: (url: string) => void;
  playCustomUrl: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  toggleExpanded: () => void;
}

export const useAudioPlayer = create<AudioPlayerState>()(
  persist(
    (set, get) => ({
      currentStream: null,
      customUrl: '',
      isPlaying: false,
      volume: 0.7,
      isExpanded: false,

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
    }),
    {
      name: 'polaris:audio',
      // Only persist stream selection + volume, not transient playing state
      partialize: (s) => ({
        currentStream: s.currentStream,
        customUrl: s.customUrl,
        volume: s.volume,
      }),
    }
  )
);
