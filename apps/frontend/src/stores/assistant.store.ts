/**
 * @file stores/assistant.store.ts
 * @description Zustand store for the TARS assistant panel.
 *   Manages panel open/close state, conversation history, and TARS processing state.
 *   Last 10 messages and panel open/close state are persisted to localStorage (key: polaris:tars).
 *   pendingAction, tarsState, and lastAction are intentionally session-only.
 * @module @polaris/frontend/stores
 *
 * @dependencies
 * - zustand
 *
 * @relatedFiles
 * - components/assistant/AssistantPanel.tsx
 * - hooks/useAssistant.ts
 */

import { create }   from 'zustand';
import { persist }  from 'zustand/middleware';

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

export interface GoalStatusDraft {
  goalId:     string;
  goalTitle?: string;
  status:     'active' | 'paused' | 'completed' | 'archived';
}

export type TARSAction =
  | { type: 'navigate';            screen: ScreenId }
  | { type: 'audio.play';          streamId?: string }
  | { type: 'audio.stop' }
  | { type: 'audio.next' }
  | { type: 'focus.start';         goalId?: string; durationMins?: number }
  | { type: 'focus.stop' }
  | { type: 'log_activity';        draft: ActivityDraft }
  | { type: 'plan_activity';       draft: ActivityDraft }
  | { type: 'create_goal';         draft: GoalDraft }
  | { type: 'update_goal_status';  draft: GoalStatusDraft }
  | { type: 'show_goals' }
  | { type: 'show_streak' }
  | { type: 'toggle_theme' }
  | { type: 'help' };

// ---------------------------------------------------------------------------
// Quick Reply Chips — deterministic action shortcuts shown after specific responses
// ---------------------------------------------------------------------------

export interface QuickReplyChip {
  label:  string;
  action: TARSAction;
  icon?:  string;
}

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
  /** Quick reply chips to render below this message (one-shot, disappear after tap) */
  chips?:      QuickReplyChip[];
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
  /** Last confirmed write action — used for 30-second undo toast */
  lastAction:    { type: string; id: string; timestamp: number } | null;
  /** Humor setting (0 to 100) */
  humor:         number;
  /** Honesty / directness setting (0 to 100) */
  honesty:       number;
  /** Retro CRT overlay toggle */
  isCrtEnabled:  boolean;

  // Actions
  open:             () => void;
  close:            () => void;
  toggle:           () => void;
  addMessage:       (msg: Omit<ConversationMessage, 'id' | 'timestamp'>) => ConversationMessage;
  markMessageRead:  (id: string) => void;
  /** Remove chips from a message after user taps one */
  dismissChips:     (id: string) => void;
  setTarsState:     (state: TarsState) => void;
  setPendingAction: (action: TARSAction | null) => void;
  setLastAction:    (action: { type: string; id: string; timestamp: number } | null) => void;
  setHumor:         (humor: number) => void;
  setHonesty:       (honesty: number) => void;
  toggleCrt:        () => void;
  clearHistory:     () => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

let _msgCounter = 0;
function nextId(): string {
  return `msg-${Date.now()}-${++_msgCounter}`;
}

export const useAssistantStore = create<AssistantStore>()(
  persist(
    (set) => ({
  isOpen:        false,
  tarsState:     'idle',
  messages:      [],
  pendingAction: null,
  lastAction:    null,
  humor:         75,
  honesty:       90,
  isCrtEnabled:  true,

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

  dismissChips: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== id) return m;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { chips: _chips, ...rest } = m;
        return rest as ConversationMessage;
      }),
    })),

  setTarsState:     (tarsState)     => set({ tarsState }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
  setLastAction:    (lastAction)    => set({ lastAction }),
  setHumor:         (humor)         => set({ humor }),
  setHonesty:       (honesty)       => set({ honesty }),
  toggleCrt:        ()              => set((s) => ({ isCrtEnabled: !s.isCrtEnabled })),

  clearHistory: () => set({ messages: [], pendingAction: null }),
  }),
  {
    name: 'polaris:tars',
    version: 1,
    // Persist panel visibility, humor, honesty, CRT setting + last 20 messages.
    partialize: (s) => ({
      isOpen:       s.isOpen,
      humor:        s.humor,
      honesty:      s.honesty,
      isCrtEnabled: s.isCrtEnabled,
      messages:     s.messages
        .filter((m) => !m.isNew)   // don't persist messages still typing
        .slice(-20)
        .map(({ chips: _c, action: _a, ...rest }) => rest), // strip transient fields
    }),
  },
),
);
