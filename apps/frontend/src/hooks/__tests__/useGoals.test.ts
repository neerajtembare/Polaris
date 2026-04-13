/**
 * @file src/hooks/__tests__/useGoals.test.ts
 * @description Unit tests for useGoals TanStack Query hooks.
 *   Uses @testing-library/react's renderHook + msw to mock the API.
 * @module @polaris/frontend/hooks/test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock the api service — avoid real fetch calls
// ---------------------------------------------------------------------------
vi.mock('../../services/api.js', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../../services/api.js';
import { useGoals, useGoal } from '../useGoals.js';

// ---------------------------------------------------------------------------
// Helper — fresh QueryClient per test
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockGoal = (overrides = {}) => ({
  id:          'goal-1',
  title:       'Read 24 books',
  timeframe:   'long',
  targetValue: 24,
  targetUnit:  'books',
  status:      'active',
  isDeleted:   false,
  parentId:    null,
  targetDate:  null,
  description: null,
  createdAt:   '2026-01-01T00:00:00.000Z',
  updatedAt:   '2026-01-01T00:00:00.000Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// useGoals
// ---------------------------------------------------------------------------

describe('useGoals()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns goals when API succeeds', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data:    [mockGoal()],
    });

    const { result } = renderHook(() => useGoals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('goal-1');
  });

  it('is loading initially', () => {
    (api.get as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const { result } = renderHook(() => useGoals(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('enters error state when API fails', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGoals(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('passes status filter to API', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: [] });

    const { result } = renderHook(
      () => useGoals({ status: 'active' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/goals', expect.objectContaining({ status: 'active' }));
  });
});

// ---------------------------------------------------------------------------
// useGoal (single)
// ---------------------------------------------------------------------------

describe('useGoal()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a single goal by id', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data:    mockGoal({ id: 'goal-42' }),
    });

    const { result } = renderHook(() => useGoal('goal-42'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('goal-42');
  });

  it('is disabled when id is empty string', () => {
    const { result } = renderHook(() => useGoal(''), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });
});
