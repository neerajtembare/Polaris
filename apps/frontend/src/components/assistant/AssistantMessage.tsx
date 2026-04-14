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
  isDark:    boolean;
}

const CHAR_INTERVAL_MS = 18;

export function AssistantMessage({ content, isNew, onDone, isDark }: AssistantMessageProps) {
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
          isDark
            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
        )}
      >
        T
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm leading-relaxed',
          isDark
            ? 'bg-white/5 text-slate-200 border border-white/8'
            : 'bg-slate-100 text-slate-800 border border-slate-200'
        )}
      >
        {displayed}
        {/* Blinking cursor while typing */}
        {isNew && displayed.length < content.length && (
          <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-indigo-400 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
