/**
 * @file src/routes/__tests__/ai.integration.test.ts
 * @description Integration tests for the AI API routes using Fastify inject().
 *   PolarisAI is mocked so no real LLM calls are made.
 * @module @polaris/backend/routes/test
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Mock @polaris/ai before app boots
vi.mock('@polaris/ai', () => ({
  polarisAI: {
    parseActivity: vi.fn(),
    dailyCoach:    vi.fn(),
    analyzeWeek:   vi.fn(),
    breakdownGoal: vi.fn(),
  },
}));

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    goal: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
    },
    activity: {
      findMany:  vi.fn(),
      groupBy:   vi.fn().mockResolvedValue([]),
      count:     vi.fn().mockResolvedValue(0),
    },
    focusSession: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    event: {
      create: vi.fn().mockResolvedValue({}),
    },
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import { polarisAI } from '@polaris/ai';
import { buildApp } from '../../app.js';

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
  (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (prisma.activity.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// POST /api/ai/parse-activity
// ---------------------------------------------------------------------------

describe('POST /api/ai/parse-activity', () => {
  it('returns 200 with parsed activity fields', async () => {
    (polarisAI.parseActivity as ReturnType<typeof vi.fn>).mockResolvedValue({
      title:      'Read chapter',
      activityType: 'quantity',
      value:      1,
      unit:       'chapters',
      category:   'growth',
      confidence: 0.9,
      goalId:     null,
      goalTitle:  null,
    });

    const res = await app.inject({
      method:  'POST',
      url:     '/api/ai/parse-activity',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ rawInput: 'read one chapter' }),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { title: string; confidence: number } }>();
    expect(body.success).toBe(true);
    expect(body.data.title).toBe('Read chapter');
    expect(body.data.confidence).toBeGreaterThan(0);
  });

  it('returns 400 when rawInput is missing', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/api/ai/parse-activity',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({}),
    });

    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/ai/daily-coach
// ---------------------------------------------------------------------------

describe('GET /api/ai/daily-coach', () => {
  it('returns 200 with daily coaching message', async () => {
    (polarisAI.dailyCoach as ReturnType<typeof vi.fn>).mockResolvedValue({
      message:    'Great start! Keep going.',
      suggestion: null,
    });

    const res = await app.inject({ method: 'GET', url: '/api/ai/daily-coach' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { message: string } }>();
    expect(body.success).toBe(true);
    expect(typeof body.data.message).toBe('string');
    expect(body.data.message.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/ai/config
// ---------------------------------------------------------------------------

describe('GET /api/ai/config', () => {
  it('returns 200 with provider info', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ai/config' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ success: boolean; data: { provider: string } }>();
    expect(body.success).toBe(true);
    expect(typeof body.data.provider).toBe('string');
  });
});
