/**
 * @file components/ui/VoiceButton.tsx
 * @description Animated microphone button for voice activity input.
 *   Manages the recording lifecycle UI: idle → recording (pulsing red) →
 *   processing (spinner). Shows a tooltip when voice is unavailable.
 *
 * @module @polaris/frontend/components/ui
 *
 * @relatedFiles
 *   - src/hooks/useVoiceRecorder.ts
 *   - src/hooks/useVoiceActivity.ts
 *   - src/components/activities/LogActivityForm.tsx
 */

import { useCallback }         from 'react';
import { useVoiceRecorder }    from '../../hooks/useVoiceRecorder.ts';
import { useVoiceActivity }    from '../../hooks/useVoiceActivity.ts';
import type { AIActivityParse } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceButtonProps {
  /** Called when voice pipeline completes — pass result to the form */
  onResult:     (transcript: string, parsed: AIActivityParse) => void;
  /** Whether the Whisper service is currently available */
  available?:   boolean;
  /** Optional extra CSS classes */
  className?:   string;
}

// ---------------------------------------------------------------------------
// Icons (inline SVG — no extra dependency)
// ---------------------------------------------------------------------------

function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4Z" />
      <path
        fillRule="evenodd"
        d="M6 10a1 1 0 0 1 1 1 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-3.07A7 7 0 0 1 5 11a1 1 0 0 1 1-1Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Mic button that runs the full voice pipeline:
 *   record → transcribe → AI parse → call onResult()
 *
 * When available is false (Whisper not running), renders a disabled button
 * with a tooltip explaining why — the rest of the form still works normally.
 */
export function VoiceButton({ onResult, available = true, className = '' }: VoiceButtonProps) {
  const { transcribeAndParse, isProcessing } = useVoiceActivity();

  const handleAudioReady = useCallback(
    (blob: Blob) => {
      void transcribeAndParse(blob).then((result) => {
        if (result) onResult(result.transcript, result.parsed);
      });
    },
    [transcribeAndParse, onResult],
  );

  const { state, startRecording, stopRecording, cancelRecording, duration, error } =
    useVoiceRecorder({ onAudioReady: handleAudioReady });

  // ── Derived state ──────────────────────────────────────────────────────────

  const isRecording   = state === 'recording';
  const isRequesting  = state === 'requesting';
  const isBusy        = isRequesting || isRecording || isProcessing;

  function handleClick() {
    if (isRecording) {
      stopRecording();
    } else if (!isBusy) {
      void startRecording();
    }
  }

  // ── Unavailable state ──────────────────────────────────────────────────────

  if (!available) {
    return (
      <div className="relative group">
        <button
          type="button"
          disabled
          aria-label="Voice input unavailable"
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border
            bg-gray-800/40 border-gray-700/40 text-gray-600 cursor-not-allowed ${className}`}
        >
          <MicIcon />
          Voice
        </button>
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs
          bg-gray-800 border border-gray-700 rounded-lg text-gray-300 whitespace-nowrap
          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          Start Whisper service to enable voice input
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
            border-transparent border-t-gray-700" />
        </div>
      </div>
    );
  }

  // ── Main button ────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isRequesting || isProcessing}
        aria-label={
          isRecording   ? `Stop recording (${duration}s)`
          : isProcessing ? 'Processing voice…'
          : 'Start voice recording'
        }
        className={[
          'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border',
          'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1',
          'focus:ring-offset-gray-900',
          isRecording
            ? 'bg-red-900/60 border-red-700 text-red-300 hover:bg-red-800/60 focus:ring-red-500'
            : 'bg-indigo-900/40 border-indigo-700/60 text-indigo-300 hover:bg-indigo-800/50 focus:ring-indigo-500',
          (isRequesting || isProcessing) && 'opacity-60 cursor-not-allowed',
        ].join(' ')}
      >
        {isProcessing ? (
          <>
            <Spinner />
            <span>Processing…</span>
          </>
        ) : isRecording ? (
          <>
            {/* Pulsing red dot while recording */}
            <span className="relative flex items-center justify-center">
              <span className="absolute inline-block w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="relative inline-block w-2 h-2 rounded-full bg-red-500" />
            </span>
            <StopIcon />
            <span>{duration > 0 ? `${duration}s — stop` : 'Recording…'}</span>
          </>
        ) : (
          <>
            <MicIcon />
            <span>Voice</span>
          </>
        )}
      </button>

      {/* Cancel link during recording */}
      {isRecording && (
        <button
          type="button"
          onClick={cancelRecording}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors ml-1"
        >
          cancel
        </button>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}
