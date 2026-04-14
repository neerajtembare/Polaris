/**
 * @file components/assistant/AssistantPanel.tsx
 * @description TARS assistant sliding panel. Right-side drawer, ~400px on desktop,
 *   full-screen on mobile. Renders conversation thread + input bar.
 *   Wired to useAssistant hook for live API responses.
 * @module @polaris/frontend/components/assistant
 *
 * @dependencies
 * - framer-motion (AnimatePresence, motion)
 * - stores/assistant.store.ts
 * - hooks/useAssistant.ts
 * - components/assistant/ConversationThread.tsx
 * - components/assistant/AssistantInput.tsx
 *
 * @relatedFiles
 * - App.tsx (renders this panel)
 */

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAssistantStore } from '@/stores/assistant.store';
import type { ScreenId } from '@/stores/assistant.store';
import { useAssistant } from '@/hooks/useAssistant';
import { useAssistantActions } from '@/hooks/useAssistantActions';
import { ConversationThread } from './ConversationThread';
import { AssistantInput } from './AssistantInput';
import { ToolConfirmCard } from './ToolConfirmCard';

interface AssistantPanelProps {
  isDark:     boolean;
  onNavigate: (screen: ScreenId) => void;
}

export function AssistantPanel({ isDark, onNavigate }: AssistantPanelProps) {
  const { isOpen, close, messages, tarsState, pendingAction } = useAssistantStore();
  const { sendMessage } = useAssistant({ onNavigate });
  const { executeConfirmedAction, dismissAction } = useAssistantActions({ onNavigate });

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  return (
    <>
      {/* Backdrop — tap outside to close on mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 sm:hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0,      opacity: 1 }}
            exit={{ x: '100%',    opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              // Layout: fixed right side, full height, above content
              'fixed top-0 right-0 h-full z-50',
              // Width: 400px on desktop, full width on mobile
              'w-full sm:w-[400px]',
              // Visual
              'flex flex-col',
              isDark
                ? 'bg-[#0a0f1e]/95 border-l border-white/8 backdrop-blur-xl'
                : 'bg-white/95 border-l border-slate-200 backdrop-blur-xl shadow-2xl'
            )}
            role="dialog"
            aria-label="TARS assistant panel"
            aria-modal="true"
          >
            {/* Header */}
            <header
              className={cn(
                'flex items-center justify-between px-4 py-3 flex-shrink-0',
                isDark ? 'border-b border-white/8' : 'border-b border-slate-200'
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* TARS monolith icon */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold',
                    isDark
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                  )}
                >
                  T
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold tracking-wide',
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  )}
                >
                  TARS
                </span>
                {/* Processing indicator */}
                {tarsState === 'processing' && (
                  <span className="flex gap-0.5 items-center ml-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close TARS panel"
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-white/8'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {/* Conversation thread */}
            <ConversationThread messages={messages} isDark={isDark} />

            {/* Pending action confirmation card */}
            {pendingAction && (
              <div className={cn(
                'px-4 pb-3 flex-shrink-0',
                isDark ? 'border-t border-white/8 pt-3' : 'border-t border-slate-200 pt-3'
              )}>
                <ToolConfirmCard
                  action={pendingAction}
                  isDark={isDark}
                  onAccept={executeConfirmedAction}
                  onDismiss={dismissAction}
                  {...(pendingAction.type === 'log_activity' ? { autoAcceptMs: 5000 } : {})}
                  onNavigate={onNavigate}
                />
              </div>
            )}

            {/* Input */}
            <AssistantInput
              onSend={sendMessage}
              disabled={tarsState === 'processing'}
              isDark={isDark}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toggle button — floating bottom-right trigger
// ---------------------------------------------------------------------------

interface AssistantToggleProps {
  isDark: boolean;
}

export function AssistantToggle({ isDark }: AssistantToggleProps) {
  const { toggle, isOpen, messages } = useAssistantStore();
  const unread = messages.filter((m) => m.role === 'assistant' && m.isNew).length;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? 'Close TARS' : 'Open TARS assistant'}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-12 h-12 rounded-xl flex items-center justify-center',
        'transition-all duration-200 active:scale-95',
        'shadow-lg',
        isDark
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200'
      )}
    >
      {isOpen ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      )}
      {/* Unread badge */}
      {!isOpen && unread > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}
