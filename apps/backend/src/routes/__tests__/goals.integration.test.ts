/**
 * @file src/routes/__tests__/goals.integration.test.ts
 * @description Integration tests for the Goals API routes using Fastify inject().
 *   No HTTP server is started — requests are injected directly into the app.
 *   Prisma is mocked so no real database is needed.
 * @module @polaris/backend/routes/test
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Mock Prisma before building the app
vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    goal: {
      findMany:   vi.fn(),
      findFirst:  vi.fn(),
      findUnique: vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      updateMany: vi.fn(),
    },
    activity: {
      findMany:  vi.fn(),
      count:     vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(),
      groupBy:   vi.fn().mockResolvedValue([]),
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

const mockGoal = (overrides = {}) => ({
  id: 'goal-1',
  title: 'Read 24 books',
  description: null,
  timeframe: 'long',
  targetValue: 24,
  targetUnit: 'books',
  targetDate: null,
  parentId: null,
  status: 'active',
  isDeleted: false,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test setup
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
  // Default: event log always succeeds
  (prisma.event.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns 200 with healthy status when DB is up', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { status: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
  });
});

// ---------------------------------------------------------------------------
// GET /api/goals
// ---------------------------------------------------------------------------

describe('GET /api/goals', () => {
  it('returns 200 with goals array in data envelope', async () => {
    const goals = [mockGoal()];
    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(goals);

    const res = await app.inject({ method: 'GET', url: '/api/goals' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: unknown[] }>();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('returns empty array when no goals exist', async () => {
    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await app.inject({ method: 'GET', url: '/api/goals' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: unknown[] }>();
    expect(body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/goals/:id
// ---------------------------------------------------------------------------

describe('GET /api/goals/:id', () => {
  it('returns 200 with goal data', async () => {
    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockGoal());

    const res = await app.inject({ method: 'GET', url: '/api/goals/goal-1' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { id: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('goal-1');
  });

  it('returns 404 when goal does not exist', async () => {
    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await app.inject({ method: 'GET', url: '/api/goals/nonexistent' });

    expect(res.statusCode).toBe(404);
    const body = res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/goals
// ---------------------------------------------------------------------------

describe('POST /api/goals', () => {
  it('returns 201 when valid goal is created', async () => {
    const goal = mockGoal({ title: 'New goal' });
    (prisma.goal.create as ReturnType<typeof vi.fn>).mockResolvedValue(goal);

    const res = await app.inject({
      method: 'POST',
      url: '/api/goals',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'New goal', timeframe: 'short' }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ success: boolean; data: { title: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('New goal');
  });

  it('returns 400 when required title is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/goals',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ timeframe: 'short' }), // no title
    });

    expect(res.statusCode).toBe(400);
    const body = res.json<{ success: boolean; error: { code: string } }>();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('strips extra unknown fields and still succeeds (Fastify ajv removes additionalProperties)', async () => {
    // Fastify's default ajv config uses removeAdditional:true — extra fields are silently stripped,
    // not rejected. This is by design and matches Fastify docs.
    const goal = mockGoal({ title: 'Goal' });
    (prisma.goal.create as ReturnType<typeof vi.fn>).mockResolvedValue(goal);

    const res = await app.inject({
      method: 'POST',
      url: '/api/goals',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'Goal', unknownField: 'hack' }),
    });

    // Extra field is stripped, request succeeds
    expect(res.statusCode).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/goals/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/goals/:id', () => {
  it('returns 400 when body is empty (minProperties=1)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({}),
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 200 when patch is valid', async () => {
    const existing = mockGoal();
    const updated  = mockGoal({ title: 'Updated goal' });

    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (prisma.goal.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated);

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/goals/goal-1',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ title: 'Updated goal' }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { title: string } }>();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Updated goal');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/goals/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/goals/:id', () => {
  it('returns 200 with deleted confirmation', async () => {
    const existing = mockGoal();
    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(existing);
    (prisma.goal.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...existing, isDeleted: true });

    const res = await app.inject({ method: 'DELETE', url: '/api/goals/goal-1' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { deleted: boolean } }>();
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 when goal does not exist', async () => {
    (prisma.goal.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await app.inject({ method: 'DELETE', url: '/api/goals/missing' });

    expect(res.statusCode).toBe(404);
  });
});
