/**
 * @file src/routes/__tests__/focus-sessions.integration.test.ts
 * @description Integration tests for the Focus Sessions API using Fastify inject().
 * @module @polaris/backend/routes/test
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    focusSession: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    activity: {
      findMany:    vi.fn(),
      create:      vi.fn(),
      groupBy:     vi.fn().mockResolvedValue([]),
      count:       vi.fn().mockResolvedValue(0),
    },
    goal: {
      findFirst: vi.fn(),
      findMany:  vi.fn().mockResolvedValue([]),
    },
    event: {
      create: vi.fn().mockResolvedValue({}),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import { buildApp } from '../../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date('2026-04-13T10:00:00.000Z');

const mockSession = (overrides = {}) => ({
  id:          'sess-1',
  goalId:      null,
  activityId:  null,
  plannedMins: 25,
  actualMins:  null,
  breaks:      0,
  status:      'active',
  startedAt:   now,
  endedAt:     null,
  notes:       null,
  userId:      null,
  isDeleted:   false,
  createdAt:   now,
  updatedAt:   now,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.event.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// GET /api/focus-sessions
// ---------------------------------------------------------------------------

describe('GET /api/focus-sessions', () => {
  it('returns 200 with sessions array', async () => {
    (prisma.focusSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockSession()]);

    const res = await app.inject({ method: 'GET', url: '/api/focus-sessions' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: unknown[] }>();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('accepts status filter query param', async () => {
    (prisma.focusSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/focus-sessions?status=active' });

    expect(res.statusCode).toBe(200);
    const calledArg = (prisma.focusSession.findMany as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(calledArg?.where?.status).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// POST /api/focus-sessions
// ---------------------------------------------------------------------------

describe('POST /api/focus-sessions', () => {
  it('returns 201 with created session when valid input', async () => {
    (prisma.focusSession.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession());

    const res = await app.inject({
      method:  'POST',
      url:     '/api/focus-sessions',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ plannedMins: 25 }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ success: boolean; data: { status: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('active');
  });

  it('returns 400 when plannedMins is missing', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/focus-sessions',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({}),
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/focus-sessions/:id/complete
// ---------------------------------------------------------------------------

describe('POST /api/focus-sessions/:id/complete', () => {
  it('returns 200 with completed session', async () => {
    (prisma.focusSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession());
    (prisma.activity.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'act-new' });
    (prisma.focusSession.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSession({ status: 'completed', actualMins: 25 })
    );

    const res = await app.inject({
      method:  'POST',
      url:     '/api/focus-sessions/sess-1/complete',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ actualMins: 25, autoLogActivity: false }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string } }>();
    expect(body.data.status).toBe('completed');
  });

  it('returns 404 when session does not exist', async () => {
    (prisma.focusSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await app.inject({
      method:  'POST',
      url:     '/api/focus-sessions/missing/complete',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ actualMins: 25, autoLogActivity: false }),
    });

    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/focus-sessions/:id/abandon
// ---------------------------------------------------------------------------

describe('POST /api/focus-sessions/:id/abandon', () => {
  it('returns 200 with abandoned session', async () => {
    (prisma.focusSession.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession());
    (prisma.focusSession.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSession({ status: 'abandoned' })
    );

    const res = await app.inject({
      method:  'POST',
      url:     '/api/focus-sessions/sess-1/abandon',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ actualMins: 5 }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string } }>();
    expect(body.data.status).toBe('abandoned');
  });
});
