/**
 * @file components/assistant/AssistantInput.tsx
 * @description Text input bar at the bottom of the TARS assistant panel.
 *   Handles submit on Enter (Shift+Enter for newline) and exposes a send callback.
 *   Mic button uses the Web Speech API for live speech-to-text.
 *   Sets tarsState to 'listening' while the mic is active.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistant.ts
 * - stores/assistant.store.ts
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAssistantStore } from '@/stores/assistant.store';

// ---------------------------------------------------------------------------
// Minimal SpeechRecognition typings — not universally in TS lib yet
// ---------------------------------------------------------------------------

interface SpeechAlt         { readonly transcript: string }
interface SpeechResult      { readonly 0: SpeechAlt }
interface SpeechResultList  { readonly length: number; readonly [i: number]: SpeechResult }
interface SpeechResultEvent { readonly results: SpeechResultList }
interface ISpeechRecognition {
  continuous:     boolean;
  interimResults: boolean;
  lang:           string;
  start():        void;
  stop():         void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend:    (() => void) | null;
  onerror:  (() => void) | null;
}
type ISpeechRecognitionCtor = new () => ISpeechRecognition;

function getSpeechRecognitionCtor(): ISpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as unknown as Record<string, unknown>;
  const Ctor = W['SpeechRecognition'] ?? W['webkitSpeechRecognition'];
  return (Ctor as ISpeechRecognitionCtor | undefined) ?? null;
}

const SPEECH_SUPPORTED = getSpeechRecognitionCtor() !== null;

// ---------------------------------------------------------------------------

interface AssistantInputProps {
  onSend:        (message: string) => void;
  /** Called when the user clicks the stop button while TARS is processing */
  onCancel?:     () => void;
  disabled?:     boolean;
  /** When true, the stop button is shown in place of the send button */
  isProcessing?: boolean;
  isDark:        boolean;
}

export function AssistantInput({ onSend, onCancel, disabled, isProcessing, isDark }: AssistantInputProps) {
  const [value, setValue]             = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const recogRef                      = useRef<ISpeechRecognition | null>(null);
  const setTarsState                  = useAssistantStore((s) => s.setTarsState);

  // Input history — cycle with Up/Down Arrow (like a terminal)
  const historyRef    = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef      = useRef(''); // saves current draft when cycling up

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    // Save to history (deduplicate consecutive, cap at 50)
    if (historyRef.current[0] !== trimmed) {
      historyRef.current = [trimmed, ...historyRef.current].slice(0, 50);
    }
    historyIdxRef.current = -1;
    draftRef.current = '';
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    // Up arrow — cycle back through history
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const hist = historyRef.current;
      if (hist.length === 0) return;
      e.preventDefault();
      if (historyIdxRef.current === -1) {
        draftRef.current = value; // save current draft
      }
      const nextIdx = Math.min(historyIdxRef.current + 1, hist.length - 1);
      historyIdxRef.current = nextIdx;
      const next = hist[nextIdx] ?? '';
      setValue(next);
      // Move cursor to end on next tick
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = next.length;
          textareaRef.current.selectionEnd   = next.length;
        }
      });
      return;
    }
    // Down arrow — cycle forward / restore draft
    if (e.key === 'ArrowDown' && !e.shiftKey && historyIdxRef.current !== -1) {
      e.preventDefault();
      const nextIdx = historyIdxRef.current - 1;
      historyIdxRef.current = nextIdx;
      const next = nextIdx === -1 ? draftRef.current : (historyRef.current[nextIdx] ?? '');
      setValue(next);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = next.length;
          textareaRef.current.selectionEnd   = next.length;
        }
      });
    }
  };

  // Auto-grow textarea up to 5 lines
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  // ── Voice toggle ────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    recogRef.current = null;
    setIsListening(false);
    setTarsState('idle');
  }, [setTarsState]);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recog = new Ctor();
    recog.continuous     = false;
    recog.interimResults = true;
    recog.lang           = 'en-US';

    recog.onresult = (e: SpeechResultEvent) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i]?.['0']?.transcript ?? '')
        .join('');
      setValue(transcript);
      // Sync textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    };

    recog.onend  = () => {
      setIsListening(false);
      setTarsState('idle');
      recogRef.current = null;
    };

    recog.onerror = () => {
      setIsListening(false);
      setTarsState('idle');
      recogRef.current = null;
    };

    recog.start();
    recogRef.current = recog;
    setIsListening(true);
    setTarsState('listening');
  }, [isListening, stopListening, setTarsState]);

  // Stop recognition if the panel closes or input is disabled
  useEffect(() => {
    if (disabled && isListening) stopListening();
  }, [disabled, isListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => () => { recogRef.current?.stop(); }, []);

  return (
    <div
      className={cn(
        'flex items-end gap-2 px-3 py-3 border-t',
        isDark ? 'border-white/8 bg-black/20' : 'border-slate-200 bg-white/60'
      )}
    >
      {/* Mic button — active when recording */}
      <button
        type="button"
        onClick={toggleVoice}
        disabled={disabled || !SPEECH_SUPPORTED}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
        title={SPEECH_SUPPORTED ? (isListening ? 'Stop recording' : 'Speak to TARS') : 'Voice input not supported in this browser'}
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
          isListening
            ? 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500/40 animate-pulse'
            : SPEECH_SUPPORTED && !disabled
            ? isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-white/8'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            : 'opacity-30 cursor-not-allowed',
          isDark ? '' : ''
        )}
      >
        {isListening ? (
          /* Active: pulsing waveform icon */
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="8" width="2" height="8" rx="1" />
            <rect x="6" y="5" width="2" height="14" rx="1" />
            <rect x="10" y="3" width="2" height="18" rx="1" />
            <rect x="14" y="5" width="2" height="14" rx="1" />
            <rect x="18" y="8" width="2" height="8" rx="1" />
          </svg>
        ) : (
          /* Idle: mic icon */
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 15.93V20H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
          </svg>
        )}
      </button>

      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder={isListening ? 'Listening…' : 'Type or speak to TARS…'}
        className={cn(
          'flex-1 resize-none rounded-xl px-3 py-2 text-sm leading-relaxed outline-none transition-colors',
          'placeholder:opacity-40 min-h-[36px] max-h-[120px]',
          isListening
            ? isDark
              ? 'bg-cyan-500/8 text-slate-100 border border-cyan-500/30 placeholder:text-cyan-400/60'
              : 'bg-cyan-50 text-slate-900 border border-cyan-300 placeholder:text-cyan-500/70'
            : isDark
            ? 'bg-white/6 text-slate-100 border border-white/10 focus:border-indigo-500/50 placeholder:text-slate-400'
            : 'bg-slate-100 text-slate-900 border border-slate-200 focus:border-indigo-400 placeholder:text-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Stop button (while processing) or Send button */}
      {isProcessing ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Stop TARS response"
          title="Stop"
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95',
            isDark
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
              : 'bg-red-100 text-red-500 hover:bg-red-200 border border-red-200'
          )}
        >
          {/* Square stop icon */}
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
            value.trim() && !disabled
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
              : 'opacity-25 cursor-not-allowed',
            isDark ? '' : 'shadow-sm'
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
