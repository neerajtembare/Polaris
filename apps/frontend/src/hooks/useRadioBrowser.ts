/**
 * @file hooks/useRadioBrowser.ts
 * @description Hook for searching internet radio stations via the Radio Browser API.
 *   Radio Browser is a free, open community database — no API key or account required.
 *   Results map directly to AudioStream for use in the audio player.
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - radio-browser-api
 * - @tanstack/react-query
 *
 * @relatedFiles
 * - stores/audioPlayer.store.ts
 * - components/AudioPlayer.tsx
 */

import { useState, useCallback } from 'react';
import { RadioBrowserApi } from 'radio-browser-api';
import type { Station } from 'radio-browser-api';
import type { AudioStream } from '@/stores/audioPlayer.store';

export interface RadioStation extends AudioStream {
  /** Original station UUID from Radio Browser */
  stationuuid: string;
  /** Station bitrate in kbps */
  bitrate: number;
  /** Community vote count */
  votes: number;
  /** Comma-separated genre tags */
  tags: string;
}

// Singleton API client — no auth needed, picks the fastest available server
let _api: RadioBrowserApi | null = null;

function getApi(): RadioBrowserApi {
  if (!_api) {
    _api = new RadioBrowserApi('Polaris Activity Tracker', true /* hideBroken */);
  }
  return _api;
}

/** Tag → emoji mapping for recognized genres */
const TAG_EMOJI: Record<string, string> = {
  lofi: '🎵',
  'lo-fi': '🎵',
  ambient: '🌊',
  jazz: '🎷',
  classical: '🎻',
  piano: '🎹',
  focus: '🎯',
  study: '📚',
  chill: '🌙',
  chillout: '🌙',
  electronic: '⚡',
  synthwave: '🌆',
  nature: '🌿',
  rain: '🌧️',
  noise: '🔊',
  meditation: '🧘',
  acoustic: '🎸',
  pop: '🎤',
  rock: '🎸',
};

function pickEmoji(tags: string[]): string {
  for (const tag of tags) {
    const emoji = TAG_EMOJI[tag.toLowerCase().trim()];
    if (emoji) return emoji;
  }
  return '📻';
}

function stationToStream(station: Station): RadioStation {
  return {
    id: station.id,
    stationuuid: station.id,
    label: station.name,
    url: station.urlResolved,
    emoji: pickEmoji(station.tags),
    bitrate: station.bitrate,
    votes: station.votes,
    tags: station.tags.join(', '),
  };
}

interface UseRadioBrowserResult {
  results: RadioStation[];
  isLoading: boolean;
  error: string | null;
  query: string;
  setQuery: (q: string) => void;
  search: (tag: string) => Promise<void>;
  clear: () => void;
}

export function useRadioBrowser(): UseRadioBrowserResult {
  const [results, setResults] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const search = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const api = getApi();
      const stations = await api.getStationsBy(
        'byTag',
        trimmed,
        {
          limit: 30,
          order: 'votes',
          reverse: true,
        },
        undefined,
        true // removeDuplicates
      );

      setResults(stations.map(stationToStream));
    } catch {
      setError('Could not reach Radio Browser. Check your connection.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
  }, []);

  return { results, isLoading, error, query, setQuery, search, clear };
}
