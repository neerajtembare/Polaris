/**
 * @file hooks/__tests__/useActivityInput.test.ts
 * @description Unit tests for useActivityInput hook.
 *   Mocks all external dependencies so only the hook's state logic is tested.
 * @module @polaris/frontend/hooks/test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock all dependencies BEFORE importing the hook
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn();

vi.mock('../useActivities.js', () => ({
  useCreateActivity: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockGoals = [
  { id: 'g1', title: 'Read 24 books', targetUnit: 'books' },
  { id: 'g2', title: 'Run 500km',     targetUnit: 'km' },
];

vi.mock('../useGoals.js', () => ({
  useGoals: () => ({ data: mockGoals }),
}));

vi.mock('../useVoiceActivity.js', () => ({
  useVoiceActivity: () => ({
    transcribeAndParse: vi.fn(),
    isProcessing: false,
  }),
}));

const mockAiParse = vi.fn();
vi.mock('../useAiParse.js', () => ({
  useAiParse: () => ({ aiParse: mockAiParse }),
}));

// Local NLP: vi.fn() so we can override per-test with mockReturnValueOnce
const defaultLocalParse = {
  intent:       'log_activity' as const,
  title:        '',
  activityType: 'completion' as const,
  value:        null,
  unit:         null,
  confidence:   0.6,
};
vi.mock('../../lib/parse-input.js', () => ({
  parseInput: vi.fn((text: string) => ({ ...defaultLocalParse, title: text })),
  matchGoal:  vi.fn(() => null),
}));

import { useActivityInput } from '../use-activity-input.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useActivityInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'act-new' });
    // Default: AI returns no upgrade (returns null means skip)
    mockAiParse.mockResolvedValue(null);
  });

  it('starts with parsedResult null', () => {
    const { result } = renderHook(() => useActivityInput());
    expect(result.current.parsedResult).toBeNull();
  });

  it('sets parsedResult immediately from local parse on handleSubmitInput', async () => {
    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('studied for 30 minutes');
    });

    expect(result.current.parsedResult).not.toBeNull();
    expect(result.current.parsedResult?.title).toBe('studied for 30 minutes');
    expect(result.current.parsedResult?.source).toBe('local');
  });

  it('upgrades parsedResult when AI returns higher confidence', async () => {
    mockAiParse.mockResolvedValue({
      intent:       'log_activity',
      title:        'Studied for 30 minutes',
      activityType: 'duration',
      value:        30,
      unit:         'minutes',
      confidence:   0.95,
      provider:     'ollama',
      source:       'ai',
    });

    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('studied for 30 minutes');
    });

    await waitFor(() => {
      expect(result.current.parsedResult?.source).toBe('ai');
      expect(result.current.parsedResult?.confidence).toBe(0.95);
    });
  });

  it('does not downgrade if AI returns lower confidence than local', async () => {
    mockAiParse.mockResolvedValue({
      intent:       'log_activity',
      title:        'Something',
      activityType: 'completion',
      value:        null,
      unit:         null,
      confidence:   0.3, // lower than local 0.6
      provider:     'ollama',
      source:       'ai',
    });

    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('studied for 30 minutes');
    });

    await waitFor(() => {
      // source stays 'local' since AI confidence is lower
      expect(result.current.parsedResult?.source).toBe('local');
    });
  });

  it('handleDismiss clears parsedResult', async () => {
    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('read a book');
    });
    expect(result.current.parsedResult).not.toBeNull();

    act(() => {
      result.current.handleDismiss();
    });
    expect(result.current.parsedResult).toBeNull();
  });

  it('handleSave calls createActivity.mutateAsync and clears parsedResult', async () => {
    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('read 30 pages');
    });

    const fields = result.current.parsedResult!;

    await act(async () => {
      await result.current.handleSave(fields);
    });

    expect(mockMutateAsync).toHaveBeenCalledOnce();
    expect(result.current.parsedResult).toBeNull();
  });

  it('handleSave includes tags when present', async () => {
    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('read 30 pages');
    });

    const fields = { ...result.current.parsedResult!, tags: ['reading', 'growth'] };

    await act(async () => {
      await result.current.handleSave(fields);
    });

    const callArg = mockMutateAsync.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).toMatchObject({ tags: ['reading', 'growth'] });
  });

  it('ignores empty text input', async () => {
    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('   ');
    });

    expect(result.current.parsedResult).toBeNull();
    expect(mockAiParse).not.toHaveBeenCalled();
  });

  it('handleLogAsActivity flips create_goal intent to log_activity', async () => {
    // Override local parse to return create_goal intent
    const { parseInput } = await import('../../lib/parse-input.js');
    vi.mocked(parseInput).mockReturnValueOnce({
      intent: 'create_goal',
      title: 'New goal',
      activityType: 'completion',
      value: null,
      unit: null,
      confidence: 0.7,
    });

    const { result } = renderHook(() => useActivityInput());

    await act(async () => {
      await result.current.handleSubmitInput('create a new goal');
    });

    act(() => {
      result.current.handleLogAsActivity();
    });

    expect(result.current.parsedResult?.intent).toBe('log_activity');
  });

  it('exposes goals list from useGoals', () => {
    const { result } = renderHook(() => useActivityInput());
    expect(result.current.goals).toHaveLength(2);
    expect(result.current.goals[0]).toMatchObject({ id: 'g1', title: 'Read 24 books' });
  });
});
