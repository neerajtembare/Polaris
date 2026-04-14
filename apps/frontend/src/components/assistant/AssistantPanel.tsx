/**
 * @file components/assistant/AssistantPanel.tsx
 * @description TARS assistant floating window. Draggable on desktop, full-screen on mobile.
 *   Dark theme: sci-fi aesthetic with cyan accents.
 *   Light theme: clean professional with indigo palette.
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

import { useEffect, useRef, useState } from 'react';
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

const PANEL_W = 380;
const PANEL_H = 520;

function getDefaultPos(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: Math.max(0, window.innerWidth  - PANEL_W - 24),
    y: Math.max(0, window.innerHeight - PANEL_H - 24),
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function AssistantPanel({ isDark, onNavigate }: AssistantPanelProps) {
  const { isOpen, close, toggle, messages, tarsState, pendingAction, clearHistory } =
    useAssistantStore();
  const { sendMessage, cancelRequest }          = useAssistant({ onNavigate });
  const { executeConfirmedAction, dismissAction } = useAssistantActions({ onNavigate });

  // ── Responsive: floating on desktop, full-screen on mobile ──────────────
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Drag state ───────────────────────────────────────────────────────────
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging  = useRef(false);
  const dragOrigin  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  function onHeaderPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (isMobile) return;
    // Don't initiate drag when clicking header buttons
    if ((e.target as HTMLElement).closest('button')) return;
    const p = panelPos ?? getDefaultPos();
    isDragging.current = true;
    dragOrigin.current = { mx: e.clientX, my: e.clientY, px: p.x, py: p.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHeaderPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!isDragging.current) return;
    setPanelPos({
      x: clamp(dragOrigin.current.px + e.clientX - dragOrigin.current.mx, 0, window.innerWidth  - PANEL_W),
      y: clamp(dragOrigin.current.py + e.clientY - dragOrigin.current.my, 0, window.innerHeight - 60),
    });
  }

  function onHeaderPointerUp() {
    isDragging.current = false;
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl+T (or Cmd+T on mac) — toggle TARS
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggle();
        return;
      }
      // Escape — close panel
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close, toggle]);

  const pos = panelPos ?? getDefaultPos();

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="panel"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{ scale: 0.95,    opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={isMobile ? {} : {
              left:   pos.x,
              top:    pos.y,
              width:  PANEL_W,
              height: PANEL_H,
            }}
            className={cn(
              'fixed z-50 flex flex-col overflow-hidden',
              // Mobile: full-screen overlay
              isMobile
                ? 'inset-0 w-full h-full rounded-none'
                : 'rounded-xl shadow-2xl',
              // Light theme: clean professional
              // Dark theme: deep space with subtle cyan border
              isDark
                ? 'bg-[#07091a]/97 border border-cyan-500/[0.12] backdrop-blur-2xl'
                : 'bg-white/97 border border-slate-200 backdrop-blur-xl shadow-slate-200/50'
            )}
            role="dialog"
            aria-label="TARS assistant panel"
            aria-modal="true"
          >
            {/* Header — drag handle on desktop */}
            <header
              onPointerDown={onHeaderPointerDown}
              onPointerMove={onHeaderPointerMove}
              onPointerUp={onHeaderPointerUp}
              className={cn(
                'flex items-center justify-between px-4 py-3 flex-shrink-0 select-none',
                !isMobile && 'cursor-grab active:cursor-grabbing',
                isDark ? 'border-b border-white/[0.07]' : 'border-b border-slate-200'
              )}
            >
              <div className="flex items-center gap-2.5">
                {/* TARS monolith icon — cyan tint in dark mode */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-sm flex items-center justify-center text-xs font-bold mt-0.5',
                    isDark
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                      : 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                  )}
                >
                  T
                </div>
                <span
                  className={cn(
                    'text-sm font-semibold tracking-wide',
                    isDark ? 'text-slate-100' : 'text-slate-800'
                  )}
                >
                  TARS
                </span>
                {/* Processing dots — cyan in dark mode */}
                {tarsState === 'processing' && (
                  <span className="flex gap-0.5 items-center ml-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'w-1 h-1 rounded-full animate-bounce',
                          isDark ? 'bg-cyan-400' : 'bg-indigo-400'
                        )}
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Clear conversation */}
                <button
                  type="button"
                  onClick={clearHistory}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                    isDark
                      ? 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.07]'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  )}
                >
                  {/* Eraser icon */}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close TARS panel"
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                    isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.07]'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Conversation thread */}
            <ConversationThread messages={messages} isDark={isDark} onRetry={sendMessage} />

            {/* Pending action confirmation card */}
            {pendingAction && (
              <div className={cn(
                'px-4 pb-3 flex-shrink-0',
                isDark ? 'border-t border-white/[0.07] pt-3' : 'border-t border-slate-200 pt-3'
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
              onCancel={cancelRequest}
              disabled={tarsState === 'processing'}
              isProcessing={tarsState === 'processing'}
              isDark={isDark}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Toggle button — floating bottom-right FAB
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
      aria-label={isOpen ? 'Close TARS' : 'Open TARS assistant (Ctrl+T)'}
      title={isOpen ? 'Close TARS' : 'Open TARS (Ctrl+T)'}
      className={cn(
        'fixed bottom-6 right-6 z-40',
        'w-12 h-12 rounded-xl flex items-center justify-center',
        'transition-all duration-200 active:scale-95',
        'shadow-lg',
        isDark
          ? 'bg-[#0d1130] hover:bg-[#111840] text-cyan-300 border border-cyan-500/25 shadow-cyan-900/30'
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


