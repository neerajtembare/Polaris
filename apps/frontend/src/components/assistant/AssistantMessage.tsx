/**
 * @file components/assistant/AssistantMessage.tsx
 * @description TARS assistant message bubble with typewriter reveal animation.
 *   New messages animate in character-by-character. Old messages render instantly.
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - react (useEffect, useState, useRef)
 *
 * @relatedFiles
 * - components/assistant/ConversationThread.tsx
 * - stores/assistant.store.ts
 */

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AssistantMessageProps {
  content:   string;
  /** When true, reveals content with typewriter animation then calls onDone */
  isNew?:    boolean;
  onDone?:   () => void;
  /** When true, renders an error style + retry button */
  isError?:  boolean;
  /** Called when user clicks retry — resends the last user message */
  onRetry?:  () => void;
  isDark:    boolean;
}

const CHAR_INTERVAL_MS = 18;

export function AssistantMessage({ content, isNew, onDone, isError, onRetry, isDark }: AssistantMessageProps) {
  const [displayed, setDisplayed]   = useState(isNew ? '' : content);
  const intervalRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef                     = useRef(0);
  const onDoneRef                    = useRef(onDone);
  onDoneRef.current                  = onDone;

  useEffect(() => {
    if (!isNew) {
      setDisplayed(content);
      return;
    }

    // Start typewriter
    indexRef.current = 0;
    setDisplayed('');

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(content.slice(0, indexRef.current));
      if (indexRef.current >= content.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onDoneRef.current?.();
      }
    }, CHAR_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isNew]);

  return (
    <div className="flex items-start gap-2.5 max-w-[85%]">
      {/* TARS icon */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold mt-0.5',
          isError
            ? isDark
              ? 'bg-red-500/15 text-red-300 border border-red-500/25'
              : 'bg-red-100 text-red-500 border border-red-200'
            : isDark
            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
            : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
        )}
      >
        {isError ? '!' : 'T'}
      </div>

      {/* Bubble + optional retry */}
      <div className="flex flex-col gap-1.5">
        <div
          className={cn(
            'rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed',
            isError
              ? isDark
                ? 'bg-red-500/[0.08] text-red-300 border border-red-500/20'
                : 'bg-red-50 text-red-700 border border-red-200'
              : isDark
              ? 'bg-white/[0.04] text-slate-200 border border-cyan-500/[0.12] shadow-[0_0_12px_rgba(34,211,238,0.04)]'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          )}
        >
          {displayed}
          {isNew && displayed.length < content.length && (
            <span className={cn(
              'inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle',
              isDark ? 'bg-cyan-400' : 'bg-indigo-400'
            )} />
          )}
        </div>

        {/* Retry button — only on error messages once typing is done */}
        {isError && onRetry && displayed.length >= content.length && (
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              'self-start text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5',
              isDark
                ? 'text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/[0.08]'
                : 'text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 hover:bg-red-50'
            )}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
