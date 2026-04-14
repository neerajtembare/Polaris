/**
 * @file components/assistant/UserMessage.tsx
 * @description User message bubble in the TARS conversation thread.
 *   Right-aligned, distinct background colour from assistant messages.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/ConversationThread.tsx
 */

import { cn } from '@/lib/utils';

interface UserMessageProps {
  content: string;
  isDark:  boolean;
}

export function UserMessage({ content, isDark }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          'max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm leading-relaxed',
          isDark
            ? 'bg-indigo-600/30 text-slate-100 border border-indigo-500/20'
            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
        )}
      >
        {content}
      </div>
    </div>
  );
}
