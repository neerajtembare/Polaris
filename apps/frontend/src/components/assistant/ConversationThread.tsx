/**
 * @file components/assistant/ConversationThread.tsx
 * @description Scrollable message history for the TARS assistant panel.
 *   Renders AssistantMessage and UserMessage bubbles.
 *   Renders Quick Reply Chips below assistant messages (one-shot — disappear after tap).
 *   Auto-scrolls to bottom when new messages arrive.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/AssistantMessage.tsx
 * - components/assistant/UserMessage.tsx
 * - stores/assistant.store.ts
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { ConversationMessage, TARSAction } from '@/stores/assistant.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';

interface ConversationThreadProps {
  messages:    ConversationMessage[];
  isDark:      boolean;
  /** Called with the last user message when the retry button on an error is clicked */
  onRetry?:    (lastUserMessage: string) => void;
  /** Called when the user taps a Quick Reply Chip */
  onChipTap?:  (action: TARSAction) => void;
  /** Whether TARS is currently processing (shows typing indicator) */
  isProcessing?: boolean;
}

export function ConversationThread({ messages, isDark, onRetry, onChipTap, isProcessing }: ConversationThreadProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const markRead     = useAssistantStore((s) => s.markMessageRead);
  const dismissChips = useAssistantStore((s) => s.dismissChips);

  // Scroll to bottom when messages change or processing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isProcessing]);

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Ask anything about your goals and progress.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scroll-smooth">
      {messages.map((msg, idx) => {
        if (msg.role === 'user') {
          return <UserMessage key={msg.id} content={msg.content} isDark={isDark} timestamp={msg.timestamp} />;
        }

        // Detect error messages from the assistant
        const isError = msg.content.startsWith('Something went wrong') || msg.content === 'Cancelled.';

        // Find the last user message before this assistant message for retry
        const lastUserMsg = isError && onRetry
          ? [...messages].slice(0, idx).reverse().find((m) => m.role === 'user')?.content
          : undefined;

        return (
          <div key={msg.id} className="flex flex-col gap-1.5">
            <AssistantMessage
              content={msg.content}
              {...(msg.isNew ? { isNew: true } : {})}
              isDark={isDark}
              onDone={() => markRead(msg.id)}
              isError={isError}
              timestamp={msg.timestamp}
              {...(lastUserMsg && onRetry ? { onRetry: () => onRetry(lastUserMsg) } : {})}
            />
            {/* Quick Reply Chips */}
            {msg.chips && msg.chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-8">
                {msg.chips.map((chip, chipIdx) => (
                  <button
                    key={chipIdx}
                    type="button"
                    onClick={() => {
                      dismissChips(msg.id);
                      onChipTap?.(chip.action);
                    }}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      isDark
                        ? 'text-cyan-300 border-cyan-500/25 hover:border-cyan-500/50 hover:bg-cyan-500/[0.08] bg-transparent'
                        : 'text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white'
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Typing indicator — shown while TARS is processing */}
      {isProcessing && (
        <div className="flex items-start gap-2.5 max-w-[85%]">
          <div
            className={cn(
              'flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold mt-0.5',
              isDark
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
            )}
          >
            T
          </div>
          <div
            className={cn(
              'rounded-2xl rounded-tl-sm px-3.5 py-3 flex items-center gap-1',
              isDark
                ? 'bg-white/[0.04] border border-cyan-500/[0.12]'
                : 'bg-slate-100 border border-slate-200'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]',   isDark ? 'bg-cyan-400' : 'bg-indigo-400')} />
            <span className={cn('w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]', isDark ? 'bg-cyan-400' : 'bg-indigo-400')} />
            <span className={cn('w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]', isDark ? 'bg-cyan-400' : 'bg-indigo-400')} />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
