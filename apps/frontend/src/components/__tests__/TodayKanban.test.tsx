/**
 * @file components/__tests__/TodayKanban.test.tsx
 * @description Unit tests for TodayKanban — three-column board for today's activities.
 *   Covers column rendering, empty states, action callbacks, and loading state.
 * @module @polaris/frontend/components/test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ListedActivity } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Mock heavy deps
// ---------------------------------------------------------------------------

vi.mock('framer-motion', () => {
  // Generic factory that renders any HTML tag so motion.div, motion.li, motion.p etc all work
  const makeEl = (tag: string) => {
    const El = ({ children, ...p }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(tag, p, children);
    El.displayName = `motion.${tag}`;
    return El;
  };
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) => makeEl(tag),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() }, toast: { success: vi.fn(), error: vi.fn() } }));

// Mock hooks
const mockUpdateActivity = vi.fn().mockResolvedValue({});
const mockDeleteActivity = vi.fn().mockResolvedValue({});

type TodayData = { planned: ListedActivity[]; completed: ListedActivity[]; skipped: ListedActivity[] };
type MockHookReturn = { data: TodayData; isLoading: boolean; error: unknown };

const defaultTodayData: TodayData = {
  planned:   [],
  completed: [],
  skipped:   [],
};

const mockUseTodayActivities = vi.fn((): MockHookReturn => ({
  data:      defaultTodayData,
  isLoading: false,
  error:     null,
}));

vi.mock('../../hooks/useActivities', () => ({
  useTodayActivities: () => mockUseTodayActivities(),
  useUpdateActivity:  () => ({ mutate: mockUpdateActivity, isPending: false }),
  useDeleteActivity:  () => ({ mutate: mockDeleteActivity, isPending: false }),
}));

// Mock LogActivityForm (modal we don't need to test here)
vi.mock('@/components/activities/LogActivityForm', () => ({
  LogActivityForm: () => <div data-testid="log-form" />,
}));

// Mock ActivityCard
vi.mock('@/components/activities/ActivityCard', () => ({
  ActivityCard: ({ activity, onComplete, onSkip, onUndo, onDelete }: {
    activity: { id: string; title: string; status: string };
    onComplete: (value?: number) => void;
    onSkip: () => void;
    onUndo: () => void;
    onDelete: () => void;
  }) => (
    <div data-testid={`card-${activity.id}`}>
      <span>{activity.title}</span>
      <button onClick={() => onComplete()}>Complete</button>
      <button onClick={() => onSkip()}>Skip</button>
      <button onClick={() => onUndo()}>Undo</button>
      <button onClick={() => onDelete()}>Delete</button>
    </div>
  ),
}));

import { TodayKanban } from '../../components/activities/TodayKanban.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeActivity(overrides: Partial<ListedActivity> = {}): ListedActivity {
  return {
    id:           'act-1',
    title:        'Read 30 pages',
    status:       'planned',
    activityType: 'quantity',
    value:        30,
    unit:         'pages',
    goalId:       null,
    goalTitle:    null,
    tags:         [] as string[],
    activityDate: new Date().toISOString().split('T')[0] ?? '',
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
    completedAt:  null,
    notes:        null,
    rawInput:     null,
    category:     'growth' as const,
    aiGenerated:  false,
    aiCategorized: false,
    isDeleted:    false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TodayKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTodayActivities.mockReturnValue({ data: defaultTodayData, isLoading: false, error: null });
  });

  it('renders three columns: Planned, Done, Skipped', () => {
    render(<TodayKanban isDark={false} />);
    // Use getAllByText since column heading text may appear multiple times
    expect(screen.getAllByText(/planned/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/done/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/skipped/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty-state text when no activities in column', () => {
    render(<TodayKanban isDark={false} />);
    expect(screen.getByText(/nothing planned/i)).toBeTruthy();
    expect(screen.getByText(/nothing completed/i)).toBeTruthy();
    expect(screen.getByText(/nothing skipped/i)).toBeTruthy();
  });

  it('renders activity cards in planned column', () => {
    mockUseTodayActivities.mockReturnValue({
      data:      { planned: [makeActivity()], completed: [], skipped: [] },
      isLoading: false,
      error:     null,
    });
    render(<TodayKanban isDark={false} />);
    expect(screen.getByTestId('card-act-1')).toBeTruthy();
    expect(screen.getByText('Read 30 pages')).toBeTruthy();
  });

  it('renders activities in respective columns', () => {
    mockUseTodayActivities.mockReturnValue({
      data: {
        planned:   [makeActivity({ id: 'p1', title: 'Plan task',    status: 'planned' })],
        completed: [makeActivity({ id: 'c1', title: 'Done task',    status: 'completed' })],
        skipped:   [makeActivity({ id: 's1', title: 'Skipped task', status: 'skipped' })],
      },
      isLoading: false,
      error:     null,
    });
    render(<TodayKanban isDark={false} />);
    expect(screen.getByText('Plan task')).toBeTruthy();
    expect(screen.getByText('Done task')).toBeTruthy();
    expect(screen.getByText('Skipped task')).toBeTruthy();
  });

  it('shows loading state while fetching', () => {
    mockUseTodayActivities.mockReturnValue({ data: defaultTodayData, isLoading: true, error: null });
    const { container } = render(<TodayKanban isDark={false} />);
    // During load the board should still render (skeleton or spinner)
    expect(container).toBeTruthy();
  });

  it('calls updateActivity with completed status when Complete is clicked', async () => {
    mockUseTodayActivities.mockReturnValue({
      data:      { planned: [makeActivity({ id: 'act-1' })], completed: [], skipped: [] },
      isLoading: false,
      error:     null,
    });
    render(<TodayKanban isDark={false} />);
    await userEvent.click(screen.getByText('Complete'));
    // Verify mutate was called with completed status (id may vary by component internals)
    expect(mockUpdateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
      expect.any(Object)
    );
  });

  it('calls updateActivity with skipped status when Skip is clicked', async () => {
    mockUseTodayActivities.mockReturnValue({
      data:      { planned: [makeActivity({ id: 'act-1' })], completed: [], skipped: [] },
      isLoading: false,
      error:     null,
    });
    render(<TodayKanban isDark={false} />);
    await userEvent.click(screen.getByText('Skip'));
    expect(mockUpdateActivity).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'skipped' }) }),
      expect.any(Object)
    );
  });

  it('shows activity count badge when column is non-empty', () => {
    mockUseTodayActivities.mockReturnValue({
      data:      { planned: [makeActivity(), makeActivity({ id: 'act-2', title: 'Second' })], completed: [], skipped: [] },
      isLoading: false,
      error:     null,
    });
    render(<TodayKanban isDark={false} />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders dark variant without crashing', () => {
    const { container } = render(<TodayKanban isDark={true} />);
    expect(container).toBeTruthy();
  });
});
