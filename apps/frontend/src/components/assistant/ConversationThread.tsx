/**
 * @file components/assistant/ConversationThread.tsx
 * @description Scrollable message history for the TARS assistant panel.
 *   Renders AssistantMessage and UserMessage bubbles.
 *   Auto-scrolls to bottom when new messages arrive.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/AssistantMessage.tsx
 * - components/assistant/UserMessage.tsx
 * - stores/assistant.store.ts
 */

import { useEffect, useRef } from 'react';
import type { ConversationMessage } from '@/stores/assistant.store';
import { useAssistantStore } from '@/stores/assistant.store';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage } from './UserMessage';

interface ConversationThreadProps {
  messages:  ConversationMessage[];
  isDark:    boolean;
  /** Called with the last user message when the retry button on an error is clicked */
  onRetry?:  (lastUserMessage: string) => void;
}

export function ConversationThread({ messages, isDark, onRetry }: ConversationThreadProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const markRead     = useAssistantStore((s) => s.markMessageRead);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
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
          return <UserMessage key={msg.id} content={msg.content} isDark={isDark} />;
        }

        // Detect error messages from the assistant
        const isError = msg.content.startsWith('Something went wrong') || msg.content === 'Cancelled.';

        // Find the last user message before this assistant message for retry
        const lastUserMsg = isError && onRetry
          ? [...messages].slice(0, idx).reverse().find((m) => m.role === 'user')?.content
          : undefined;

        return (
          <AssistantMessage
            key={msg.id}
            content={msg.content}
            {...(msg.isNew ? { isNew: true } : {})}
            isDark={isDark}
            onDone={() => markRead(msg.id)}
            isError={isError}
            {...(lastUserMsg && onRetry ? { onRetry: () => onRetry(lastUserMsg) } : {})}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
