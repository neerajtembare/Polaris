/**
 * @file src/services/__tests__/focus-session.service.test.ts
 * @description Unit tests for FocusSessionService — mocks Prisma so no real DB is needed.
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock Prisma BEFORE importing the service
vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    focusSession: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    goal: {
      findFirst: vi.fn(),
    },
  };
  return { default: prisma };
});

import prisma from '../../lib/prisma.js';
import * as FocusSessionService from '../focus-session.service.js';
import { AppError } from '../../lib/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date('2026-04-13T10:00:00.000Z');

const mockSession = (overrides = {}) => ({
  id:          'sess-1',
  goalId:      'goal-1',
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
// listFocusSessions
// ---------------------------------------------------------------------------

describe('listFocusSessions()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('queries with isDeleted: false by default', async () => {
    (prisma.focusSession.findMany as Mock).mockResolvedValue([]);
    await FocusSessionService.listFocusSessions();
    expect(prisma.focusSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isDeleted: false }) })
    );
  });

  it('filters by status when provided', async () => {
    (prisma.focusSession.findMany as Mock).mockResolvedValue([]);
    await FocusSessionService.listFocusSessions({ status: 'active' });
    const calledWith = (prisma.focusSession.findMany as Mock).mock.calls[0]?.[0];
    expect(calledWith?.where?.status).toBe('active');
  });

  it('returns serialised sessions with ISO date strings', async () => {
    (prisma.focusSession.findMany as Mock).mockResolvedValue([mockSession()]);
    const result = await FocusSessionService.listFocusSessions();
    expect(result).toHaveLength(1);
    expect(typeof result[0]?.startedAt).toBe('string');
    expect(result[0]?.endedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getFocusSession
// ---------------------------------------------------------------------------

describe('getFocusSession()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns serialised session when found', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession());
    const result = await FocusSessionService.getFocusSession('sess-1');
    expect(result.id).toBe('sess-1');
    expect(result.status).toBe('active');
  });

  it('throws 404 when session not found', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(null);
    await expect(FocusSessionService.getFocusSession('missing')).rejects.toThrow(AppError);
  });
});

// ---------------------------------------------------------------------------
// createFocusSession
// ---------------------------------------------------------------------------

describe('createFocusSession()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates session with status active', async () => {
    const session = mockSession();
    (prisma.focusSession.create as Mock).mockResolvedValue(session);

    const result = await FocusSessionService.createFocusSession({
      plannedMins: 25,
      goalId:      'goal-1',
    });

    expect(prisma.focusSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'active', plannedMins: 25 }),
      })
    );
    expect(result.status).toBe('active');
  });

  it('sets goalId to null when not provided', async () => {
    (prisma.focusSession.create as Mock).mockResolvedValue(mockSession({ goalId: null }));
    await FocusSessionService.createFocusSession({ plannedMins: 25 });
    const args = (prisma.focusSession.create as Mock).mock.calls[0]?.[0];
    expect(args?.data?.goalId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// completeFocusSession — auto-creates activity
// ---------------------------------------------------------------------------

describe('completeFocusSession()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks session as completed with actualMins', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession());
    (prisma.goal.findFirst as Mock).mockResolvedValue({ title: 'Read 24 books' });
    const completedSession = mockSession({ status: 'completed', actualMins: 25 });
    (prisma.activity.create as Mock).mockResolvedValue({ id: 'act-new' });
    (prisma.focusSession.update as Mock).mockResolvedValue(completedSession);

    const result = await FocusSessionService.completeFocusSession('sess-1', {
      actualMins:      25,
      autoLogActivity: true,
    });

    expect(result.status).toBe('completed');
    expect(result.actualMins).toBe(25);
  });

  it('auto-creates activity with duration type when autoLogActivity is true', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession({ activityId: null }));
    (prisma.goal.findFirst as Mock).mockResolvedValue({ title: 'Run 500km' });
    (prisma.activity.create as Mock).mockResolvedValue({ id: 'act-new' });
    (prisma.focusSession.update as Mock).mockResolvedValue(mockSession({ status: 'completed' }));

    await FocusSessionService.completeFocusSession('sess-1', {
      actualMins:      22,
      autoLogActivity: true,
    });

    expect(prisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityType: 'duration',
          unit:         'min',
          status:       'completed',
          value:        22,
        }),
      })
    );
  });

  it('skips activity creation when autoLogActivity is false', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession({ activityId: null }));
    (prisma.focusSession.update as Mock).mockResolvedValue(mockSession({ status: 'completed' }));

    await FocusSessionService.completeFocusSession('sess-1', {
      actualMins:      25,
      autoLogActivity: false,
    });

    expect(prisma.activity.create).not.toHaveBeenCalled();
  });

  it('throws 404 when session does not exist', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(null);
    await expect(
      FocusSessionService.completeFocusSession('missing', { actualMins: 10, autoLogActivity: false })
    ).rejects.toThrow(AppError);
  });
});

// ---------------------------------------------------------------------------
// abandonFocusSession
// ---------------------------------------------------------------------------

describe('abandonFocusSession()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marks session as abandoned', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession({ activityId: null }));
    (prisma.focusSession.update as Mock).mockResolvedValue(mockSession({ status: 'abandoned' }));

    const result = await FocusSessionService.abandonFocusSession('sess-1', { actualMins: 1 });
    expect(result.status).toBe('abandoned');
  });

  it('logs partial activity when actualMins > 2', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession({ activityId: null }));
    (prisma.goal.findFirst as Mock).mockResolvedValue({ title: 'Read' });
    (prisma.activity.create as Mock).mockResolvedValue({ id: 'partial-act' });
    (prisma.focusSession.update as Mock).mockResolvedValue(mockSession({ status: 'abandoned' }));

    await FocusSessionService.abandonFocusSession('sess-1', { actualMins: 12 });

    expect(prisma.activity.create).toHaveBeenCalled();
  });

  it('skips activity when actualMins <= 2', async () => {
    (prisma.focusSession.findFirst as Mock).mockResolvedValue(mockSession({ activityId: null }));
    (prisma.focusSession.update as Mock).mockResolvedValue(mockSession({ status: 'abandoned' }));

    await FocusSessionService.abandonFocusSession('sess-1', { actualMins: 1 });

    expect(prisma.activity.create).not.toHaveBeenCalled();
  });
});
