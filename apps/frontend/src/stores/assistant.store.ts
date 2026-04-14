/**
 * @file stores/assistant.store.ts
 * @description Zustand store for the TARS assistant panel.
 *   Manages panel open/close state, conversation history, and TARS processing state.
 *   Conversation history is session-only (not persisted) — intentional for privacy.
 * @module @polaris/frontend/stores
 *
 * @dependencies
 * - zustand
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistant.ts
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// TARSAction — frontend-local type mirroring packages/ai/src/tars/action-types.ts
// The backend sends this as JSON; we type it here for safe execution.
// ---------------------------------------------------------------------------

export type ScreenId = 'Hub' | 'Goals' | 'Insights' | 'History' | 'Settings' | 'WeeklyReview';

export interface ActivityDraft {
  title:        string;
  activityType: 'quantity' | 'duration' | 'completion';
  value?:       number;
  unit?:        string;
  goalId?:      string | null;
  goalTitle?:   string | null;
  date?:        string;
  status?:      'completed' | 'planned';
}

export interface GoalDraft {
  title:        string;
  timeframe:    'long' | 'medium' | 'short';
  targetValue?: number;
  targetUnit?:  string;
  description?: string;
}

export type TARSAction =
  | { type: 'navigate';      screen: ScreenId }
  | { type: 'audio.play';    streamId?: string }
  | { type: 'audio.stop' }
  | { type: 'audio.next' }
  | { type: 'focus.start';   goalId?: string }
  | { type: 'focus.stop' }
  | { type: 'log_activity';  draft: ActivityDraft }
  | { type: 'plan_activity'; draft: ActivityDraft }
  | { type: 'create_goal';   draft: GoalDraft }
  | { type: 'show_goals' }
  | { type: 'show_streak' };

// ---------------------------------------------------------------------------
// Conversation message
// ---------------------------------------------------------------------------

export interface ConversationMessage {
  /** Unique ID for React key */
  id:          string;
  role:        'user' | 'assistant';
  content:     string;
  timestamp:   number;
  /** Action proposed by TARS (sprint 3: write actions show ToolConfirmCard) */
  action?:     TARSAction | null;
  /** Whether this message is currently being typed (typewriter effect) */
  isNew?:      boolean;
}

// ---------------------------------------------------------------------------
// TARS processing state (drives avatar animation in Sprint 5)
// ---------------------------------------------------------------------------

export type TarsState = 'idle' | 'listening' | 'processing';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface AssistantStore {
  /** Whether the assistant panel is open */
  isOpen:        boolean;
  /** Current TARS state for avatar animation */
  tarsState:     TarsState;
  /** Conversation history for this session */
  messages:      ConversationMessage[];
  /** Pending write action awaiting user confirmation (Sprint 3) */
  pendingAction: TARSAction | null;

  // Actions
  open:             () => void;
  close:            () => void;
  toggle:           () => void;
  addMessage:       (msg: Omit<ConversationMessage, 'id' | 'timestamp'>) => ConversationMessage;
  markMessageRead:  (id: string) => void;
  setTarsState:     (state: TarsState) => void;
  setPendingAction: (action: TARSAction | null) => void;
  clearHistory:     () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

let _msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

export const useAssistantStore = create<AssistantStore>((set) => ({
  isOpen:        false,
  tarsState:     'idle',
  messages:      [],
  pendingAction: null,

  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  addMessage: (msg) => {
    const full: ConversationMessage = {
      ...msg,
      id:        nextId(),
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, full] }));
    return full;
  },

  markMessageRead: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => m.id === id ? { ...m, isNew: false } : m),
    })),

  setTarsState:     (tarsState)     => set({ tarsState }),
  setPendingAction: (pendingAction) => set({ pendingAction }),

  clearHistory: () => set({ messages: [], pendingAction: null }),
}));
