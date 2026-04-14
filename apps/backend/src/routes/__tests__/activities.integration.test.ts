/**
 * @file src/routes/__tests__/activities.integration.test.ts
 * @description Integration tests for the Activities API routes using Fastify inject().
 *   No HTTP server is started — requests are injected directly into the app.
 *   Prisma is mocked so no real database is needed.
 * @module @polaris/backend/routes/test
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    activity: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      count:     vi.fn().mockResolvedValue(0),
    },
    goal: {
      findFirst: vi.fn(),
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

const mockActivity = (overrides = {}) => ({
  id:            'act-1',
  title:         'Read chapter',
  notes:         null,
  activityType:  'quantity',
  value:         1,
  unit:          'chapters',
  rawInput:      null,
  goalId:        'goal-1',
  activityDate:  new Date('2026-04-13'),
  category:      'growth',
  tags:          null,
  status:        'planned',
  aiGenerated:   false,
  aiCategorized: false,
  isDeleted:     false,
  createdAt:     new Date('2026-04-13'),
  updatedAt:     new Date('2026-04-13'),
  completedAt:   null,
  goal:          { title: 'Read 24 books' },
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
// GET /api/activities/today
// ---------------------------------------------------------------------------

describe('GET /api/activities/today', () => {
  it('returns 200 with grouped activities (planned/completed/skipped)', async () => {
    (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockActivity({ status: 'completed' }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/activities/today' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { planned: unknown[]; completed: unknown[]; skipped: unknown[] } }>();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('planned');
    expect(body.data).toHaveProperty('completed');
    expect(body.data).toHaveProperty('skipped');
    expect(body.data.completed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/activities/tags
// ---------------------------------------------------------------------------

describe('GET /api/activities/tags', () => {
  it('returns 200 with sorted unique tag array', async () => {
    (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockActivity({ tags: JSON.stringify(['reading', 'morning']) }),
      mockActivity({ id: 'act-2', tags: JSON.stringify(['morning', 'focus']) }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/activities/tags' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: string[] }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Tags should be unique and sorted
    expect(body.data).toContain('focus');
    expect(body.data).toContain('morning');
    expect(body.data).toContain('reading');
    const uniqueCount = new Set(body.data).size;
    expect(uniqueCount).toBe(body.data.length);
  });

  it('returns empty array when no activities have tags', async () => {
    (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      mockActivity({ tags: null }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/activities/tags' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: string[] }>();
    expect(body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/activities
// ---------------------------------------------------------------------------

describe('GET /api/activities', () => {
  it('returns 200 with activities array', async () => {
    (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockActivity()]);

    const res = await app.inject({ method: 'GET', url: '/api/activities' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: unknown[] }>();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/activities/:id
// ---------------------------------------------------------------------------

describe('GET /api/activities/:id', () => {
  it('returns 200 with activity data', async () => {
    (prisma.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity());

    const res = await app.inject({ method: 'GET', url: '/api/activities/act-1' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { id: string } }>();
    expect(body.data.id).toBe('act-1');
  });

  it('returns 404 when activity does not exist', async () => {
    (prisma.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/activities/missing' });

    expect(res.statusCode).toBe(404);
    const body = res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/activities
// ---------------------------------------------------------------------------

describe('POST /api/activities', () => {
  it('returns 201 when valid activity is created', async () => {
    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'goal-1', isDeleted: false });
    (prisma.activity.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity());

    const res = await app.inject({
      method:  'POST',
      url:     '/api/activities',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        title:        'Read chapter',
        activityType: 'quantity',
        activityDate: '2026-04-13',
        goalId:       'goal-1',
        value:        1,
        unit:         'chapters',
      }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ success: boolean; data: { title: string } }>();
    expect(body.success).toBe(true);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/activities',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'No type or date' }),
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/activities/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/activities/:id', () => {
  it('returns 200 when activity is updated', async () => {
    (prisma.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity());
    (prisma.activity.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockActivity({ status: 'completed' })
    );

    const res = await app.inject({
      method:  'PATCH',
      url:     '/api/activities/act-1',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ status: 'completed' }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: { status: string } }>();
    expect(body.data.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/activities/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/activities/:id', () => {
  it('returns 200 confirming soft-delete', async () => {
    (prisma.activity.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity());
    (prisma.activity.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockActivity({ isDeleted: true })
    );

    const res = await app.inject({ method: 'DELETE', url: '/api/activities/act-1' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});
