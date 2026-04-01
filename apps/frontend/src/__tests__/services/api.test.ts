/**
 * @file src/__tests__/services/api.test.ts
 * @description Unit tests for the API client service — mocks fetch().
 * @module @polaris/frontend/test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiRequestError } from '../../services/api.js';

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('api.get()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('makes a GET request to the correct URL', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: [] }));

    await api.get('/goals');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/goals');
    expect(opts?.method).toBe('GET');
  });

  it('appends query params to the URL', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: [] }));

    await api.get('/activities', { status: 'completed', limit: 20 });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('status=completed');
    expect(url).toContain('limit=20');
  });

  it('returns the data field from a success response', async () => {
    const goals = [{ id: 'g-1', title: 'Read 24 books' }];
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: goals }));

    const result = await api.get<{ success: true; data: typeof goals }>('/goals');

    expect(result.data).toEqual(goals);
  });

  it('throws ApiRequestError on { success: false } response', async () => {
    mockFetch.mockResolvedValue(
      makeResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        404
      )
    );

    await expect(api.get('/goals/missing')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiRequestError &&
        err.status === 404 &&
        err.code === 'NOT_FOUND' &&
        err.message === 'Goal not found'
    );
  });
});

describe('api.post()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a POST with JSON body', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: { id: 'g-1' } }, 201));

    await api.post('/goals', { title: 'New goal', timeframe: 'short' });

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/goals');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opts.body as string)).toMatchObject({ title: 'New goal' });
  });
});

describe('api.patch()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a PATCH with JSON body', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: { id: 'g-1', title: 'Updated' } }));

    await api.patch('/goals/g-1', { title: 'Updated' });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('PATCH');
  });
});

describe('api.del()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a DELETE request', async () => {
    mockFetch.mockResolvedValue(makeResponse({ success: true, data: { id: 'g-1', deleted: true } }));

    await api.del('/goals/g-1');

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe('DELETE');
  });
});

describe('ApiRequestError', () => {
  it('has correct properties', () => {
    const err = new ApiRequestError(422, 'UNPROCESSABLE', 'Invalid input', { field: 'title' });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.status).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE');
    expect(err.message).toBe('Invalid input');
    expect(err.details).toEqual({ field: 'title' });
    expect(err.name).toBe('ApiRequestError');
  });
});
