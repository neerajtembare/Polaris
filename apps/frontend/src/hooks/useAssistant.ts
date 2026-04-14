/**
 * @file hooks/useAssistant.ts
 * @description Main TARS assistant hook.
 *   Handles the full send → receive → action flow for the assistant panel.
 *   - Fixed commands are matched client-side (no API call)
 *   - All other messages go to POST /api/ai/chat
 *   - Conversation history is managed in assistant.store.ts (Zustand)
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

import { useCallback } from 'react';
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
 * Returns a `sendMessage` function — call it with the user's raw input.
 * All state lives in useAssistantStore.
 */
export function useAssistant({ onNavigate }: UseAssistantOptions = {}) {
  const { addMessage, setTarsState, setPendingAction } = useAssistantStore();
  const matchCommand = useCommandMatcher();

  const executeAction = useCallback((action: TARSAction, requiresConfirmation: boolean) => {
    // Immediate actions — execute without confirmation
    if (!requiresConfirmation) {
      if (action.type === 'navigate' && onNavigate) {
        onNavigate(action.screen as ScreenId);
      }
      // audio.* / focus.* / show_* — Sprint 5 will wire these via useAssistantActions
      // For now, they're reflected in the store's pendingAction so the panel can show them
    }

    // Write actions always go to pendingAction for ToolConfirmCard (Sprint 3)
    if (requiresConfirmation || action.type === 'log_activity' || action.type === 'plan_activity' || action.type === 'create_goal') {
      setPendingAction(action);
    }
  }, [onNavigate, setPendingAction]);

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

    try {
      const res = await fetch(`${BASE_URL}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed }),
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
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addMessage({
        role:    'assistant',
        content: `Something went wrong: ${msg}. Try again.`,
        isNew:   true,
      });
    } finally {
      setTarsState('idle');
    }
  }, [addMessage, matchCommand, setTarsState, executeAction]);

  return { sendMessage };
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
