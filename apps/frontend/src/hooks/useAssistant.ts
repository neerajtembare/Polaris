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
import type { TARSAction, ScreenId } from '@/stores/assistant.store';
import { useCommandMatcher } from './useCommandMatcher';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '/api';

// ---------------------------------------------------------------------------
// API response shape from POST /api/ai/chat
// ---------------------------------------------------------------------------

interface ChatApiResponse {
  success: true;
  data: {
    response:             string | null;
    action:               TARSAction | null;
    requiresConfirmation: boolean;
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
}

/**
 * Primary hook for the TARS assistant panel.
 * Returns `sendMessage` and `cancelRequest` — call sendMessage with the user's raw input.
 * All state lives in useAssistantStore.
 */
export function useAssistant({ onNavigate }: UseAssistantOptions = {}) {
  const { addMessage, setTarsState, setPendingAction, messages, pendingAction } = useAssistantStore();
  const matchCommand  = useCommandMatcher();
  const abortRef      = useRef<AbortController | null>(null);

  const executeAction = useCallback((action: TARSAction, requiresConfirmation: boolean) => {
    if (!requiresConfirmation) {
      if (action.type === 'navigate' && onNavigate) {
        onNavigate(action.screen as ScreenId);
      }
    }
    if (requiresConfirmation || action.type === 'log_activity' || action.type === 'plan_activity' || action.type === 'create_goal') {
      setPendingAction(action);
    }
  }, [onNavigate, setPendingAction]);

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

    // Include pending action type so the backend can route confirmations correctly
    const pendingActionType = pendingAction?.type;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_URL}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, history, pendingActionType }),
        signal:  controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as ChatApiResponse;

      if (!json.success) {
        throw new Error('API returned success: false');
      }

      const { response, action, requiresConfirmation } = json.data;
      const content = response ?? (action ? describeAction(action) : 'Done.');

      addMessage({ role: 'assistant', content, isNew: true });

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
      });
    } finally {
      abortRef.current = null;
      setTarsState('idle');
    }
  }, [addMessage, matchCommand, setTarsState, executeAction, messages, pendingAction]);

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
