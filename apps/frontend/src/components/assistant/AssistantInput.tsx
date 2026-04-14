/**
 * @file components/assistant/AssistantInput.tsx
 * @description Text input bar at the bottom of the TARS assistant panel.
 *   Handles submit on Enter (Shift+Enter for newline) and exposes a send callback.
 *   Mic button placeholder wired for Sprint 5 voice input.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistant.ts
 */

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AssistantInputProps {
  onSend:    (message: string) => void;
  disabled?: boolean;
  isDark:    boolean;
}

export function AssistantInput({ onSend, disabled, isDark }: AssistantInputProps) {
  const [value, setValue] = useState('');
  const textareaRef       = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Auto-grow textarea up to 5 lines
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2 px-3 py-3 border-t',
        isDark ? 'border-white/8 bg-black/20' : 'border-slate-200 bg-white/60'
      )}
    >
      {/* Mic button — placeholder for Sprint 5 voice */}
      <button
        type="button"
        disabled={disabled}
        aria-label="Voice input (coming soon)"
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          'opacity-40 cursor-not-allowed',
          isDark ? 'text-slate-400' : 'text-slate-500'
        )}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 15.93V20H9v2h6v-2h-2v-2.07A8.001 8.001 0 0 0 20 11h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
        </svg>
      </button>

      {/* Text area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="Type or speak to TARS…"
        className={cn(
          'flex-1 resize-none rounded-xl px-3 py-2 text-sm leading-relaxed outline-none transition-colors',
          'placeholder:opacity-40 min-h-[36px] max-h-[120px]',
          isDark
            ? 'bg-white/6 text-slate-100 border border-white/10 focus:border-indigo-500/50 placeholder:text-slate-400'
            : 'bg-slate-100 text-slate-900 border border-slate-200 focus:border-indigo-400 placeholder:text-slate-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Send button */}
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
    </div>
  );
}
