/**
 * @file components/assistant/UserMessage.tsx
 * @description User message bubble in the TARS conversation thread.
 *   Right-aligned, distinct background colour from assistant messages.
 *   Shows relative timestamp on hover.
 * @module @polaris/frontend/components/assistant
 *
 * @relatedFiles
 * - components/assistant/ConversationThread.tsx
 */

import { cn } from '@/lib/utils';

interface UserMessageProps {
  content:   string;
  isDark:    boolean;
  timestamp?: number;
}

function formatRelativeTime(ts: number): string {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24)   return `${diffH}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function UserMessage({ content, isDark, timestamp }: UserMessageProps) {
  return (
    <div className="group flex justify-end">
      <div className="flex flex-col items-end gap-0.5">
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
        {timestamp && (
          <span
            className={cn(
              'text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none',
              isDark ? 'text-slate-500' : 'text-slate-400'
            )}
          >
            {formatRelativeTime(timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
