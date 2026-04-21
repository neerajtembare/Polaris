/**
 * @file hooks/useAssistant.ts
 * @description Main TARS assistant hook.
 *   Handles the full send → receive → action flow for the assistant panel.
 *   - Fixed commands are matched client-side (no API call)
 *   - All other messages go to POST /api/ai/chat
 *   - Conversation history (last 20 turns) is sent with each request for multi-turn context
 *   - AbortController allows cancelling in-flight requests
 * @module @polaris/frontend/hooks
 *
 * @dependencies
 * - stores/assistant.store.ts
 * - hooks/useCommandMatcher.ts
 * - services/api.ts
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - components/assistant/AssistantInput.tsx
 */

import { useCallback, useRef } from 'react';
import { useAssistantStore } from '@/stores/assistant.store';
import type { TARSAction, ScreenId, QuickReplyChip } from '@/stores/assistant.store';
import { useCommandMatcher } from './useCommandMatcher';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '/api';

// ---------------------------------------------------------------------------
// Help chips — rendered when user types "help" (no API call)
// ---------------------------------------------------------------------------

const HELP_CHIPS: QuickReplyChip[] = [
  { label: 'Hub',           action: { type: 'navigate', screen: 'Hub' } },
  { label: 'Goals',         action: { type: 'navigate', screen: 'Goals' } },
  { label: 'Insights',      action: { type: 'navigate', screen: 'Insights' } },
  { label: 'History',       action: { type: 'navigate', screen: 'History' } },
  { label: 'Play music',    action: { type: 'audio.play' } },
  { label: 'Stop music',    action: { type: 'audio.stop' } },
  { label: 'Start focus',   action: { type: 'focus.start' } },
  { label: 'Weekly review', action: { type: 'navigate', screen: 'WeeklyReview' } },
  { label: 'Toggle theme',  action: { type: 'toggle_theme' } },
];

// ---------------------------------------------------------------------------
// API response shape from POST /api/ai/chat
// ---------------------------------------------------------------------------

interface ChatApiResponse {
  success: true;
  data: {
    response:             string | null;
    action:               TARSAction | null;
    requiresConfirmation: boolean;
    chips?:               QuickReplyChip[];
    intent:               string;
    confidence:           string;
    provider:             string;
    latencyMs:            number;
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseAssistantOptions {
  /** Called when TARS proposes a navigation action */
  onNavigate?: (screen: ScreenId) => void;
  /** Current screen — sent to backend for disambiguation */
  currentScreen?: ScreenId;
  /** Called for immediate actions (audio, focus, show_*) matched client-side */
  onImmediateAction?: (action: TARSAction) => void;
  /** Called when user says dark mode / light mode / toggle theme */
  onToggleTheme?: () => void;
}

/**
 * Primary hook for the TARS assistant panel.
 * Returns `sendMessage` and `cancelRequest` — call sendMessage with the user's raw input.
 * All state lives in useAssistantStore.
 */
export function useAssistant({ onNavigate, currentScreen, onImmediateAction, onToggleTheme }: UseAssistantOptions = {}) {
  const { addMessage, setTarsState, setPendingAction, messages, pendingAction, clearHistory } = useAssistantStore();
  const matchCommand  = useCommandMatcher();
  const abortRef      = useRef<AbortController | null>(null);

  const executeAction = useCallback((action: TARSAction, requiresConfirmation: boolean) => {
    if (!requiresConfirmation) {
      if (action.type === 'navigate' && onNavigate) {
        onNavigate(action.screen as ScreenId);
      } else if (action.type === 'toggle_theme') {
        onToggleTheme?.();
      } else if (
        action.type === 'audio.play' ||
        action.type === 'audio.stop' ||
        action.type === 'audio.next' ||
        action.type === 'focus.start' ||
        action.type === 'focus.stop' ||
        action.type === 'show_goals' ||
        action.type === 'show_streak'
      ) {
        onImmediateAction?.(action);
      }
    }
    if (requiresConfirmation || action.type === 'log_activity' || action.type === 'plan_activity' || action.type === 'create_goal') {
      setPendingAction(action);
    }
  }, [onNavigate, onImmediateAction, onToggleTheme, setPendingAction]);

  /** Cancel the in-flight LLM request (shows stop button while processing). */
  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setTarsState('idle');
    addMessage({ role: 'assistant', content: 'Cancelled.', isNew: false });
  }, [setTarsState, addMessage]);

  const sendMessage = useCallback(async (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    // 1. Record user message in store
    addMessage({ role: 'user', content: trimmed, isNew: false });

    // 2. Check for fixed command (client-side, no API call)
    const command = matchCommand(trimmed);
    if (command) {
      // Special case: clear_chat is not a TARSAction — handle inline
      if ((command as { type: string }).type === 'clear_chat') {
        clearHistory();
        addMessage({ role: 'assistant', content: 'Chat cleared.', isNew: true });
        return;
      }
      // Special case: toggle_theme
      if (command.type === 'toggle_theme') {
        onToggleTheme?.();
        addMessage({ role: 'assistant', content: 'Theme switched.', isNew: true });
        return;
      }
      // Special case: help — handled separately with category chips
      if (command.type === 'help') {
        addMessage({
          role:  'assistant',
          content: "Here's what I can do:",
          isNew:  true,
          chips: HELP_CHIPS,
        });
        return;
      }
      const responseText = describeAction(command);
      addMessage({ role: 'assistant', content: responseText, isNew: true });
      executeAction(command, false);
      return;
    }

    // 3. Send to /api/ai/chat
    setTarsState('processing');

    // Build conversation history from store (strip internal fields, cap at 20 turns)
    const history = messages
      .slice(-20)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Include pending action type so the backend can route confirmations correctly.
    // Also include the full draft so the backend can short-circuit the LLM on confirmation.
    const pendingActionType = pendingAction?.type;
    // Only send the full draft for write actions (the ones that require confirmation)
    const WRITE_TYPES = ['log_activity', 'plan_activity', 'create_goal'] as const;
    const pendingActionArgs =
      pendingAction &&
      WRITE_TYPES.includes(pendingAction.type as typeof WRITE_TYPES[number])
        ? pendingAction
        : undefined;

    const controller = new AbortController();
    abortRef.current?.abort(); // Cancel any in-flight request before starting a new one
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_URL}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: trimmed,
          history,
          pendingActionType,
          ...(pendingActionArgs ? { pendingActionArgs } : {}),
          ...(currentScreen    ? { currentScreen }    : {}),
        }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as ChatApiResponse;

      if (!json.success) {
        throw new Error('API returned success: false');
      }

      const { response, action, requiresConfirmation, chips } = json.data;
      const content = response ?? (action ? describeAction(action) : 'Done.');

      addMessage({ role: 'assistant', content, isNew: true, ...(chips ? { chips } : {}) });

      if (action) {
        executeAction(action, requiresConfirmation);
      }
    } catch (err) {
      // Ignore abort errors — cancelRequest already added the 'Cancelled.' message
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addMessage({
        role:    'assistant',
        content: `Something went wrong: ${msg}. Try again.`,
        isNew:   true,
        chips: [
          { label: 'Open Manual Form', action: { type: 'navigate', screen: 'Hub' } },
        ],
      });
    } finally {
      abortRef.current = null;
      setTarsState('idle');
    }
  }, [addMessage, clearHistory, matchCommand, setTarsState, executeAction, messages, pendingAction, onToggleTheme]);

  return { sendMessage, cancelRequest };
}

// ---------------------------------------------------------------------------
// Human-readable description for immediate actions
// ---------------------------------------------------------------------------

function describeAction(action: TARSAction): string {
  switch (action.type) {
    case 'navigate':     return `Navigating to ${action.screen}.`;
    case 'audio.play':   return 'Starting audio.';
    case 'audio.stop':   return 'Audio stopped.';
    case 'audio.next':   return 'Skipping to next track.';
    case 'focus.start':  return 'Starting focus session.';
    case 'focus.stop':   return 'Focus session ended.';
    case 'show_goals':   return 'Here are your goals.';
    case 'show_streak':  return 'Showing your streak.';
    case 'log_activity': return `Log "${action.draft.title}" — is this right?`;
    case 'plan_activity':return `Plan "${action.draft.title}" — is this right?`;
    case 'create_goal':  return `Create goal "${action.draft.title}" — confirm?`;
    default:             return 'Done.';
  }
}
