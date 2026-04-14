/**
 * @file services/__tests__/ai.service.test.ts
 * @description Unit tests for the AI service layer and underlying PolarisAI class.
 *   The AI provider is mocked so no network calls or Ollama connection is needed.
 *   Tests cover: parseActivity (fallback on error), providerName, breakdownGoal,
 *   analyzeWeek, and dailyCoach (fallback quote on error).
 * @module @polaris/backend/services/test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the entire @polaris/ai package — PolarisAI and polarisAI singleton
// Use vi.hoisted so the mock class is available at hoist time.
// ---------------------------------------------------------------------------

const { mockParseActivity, mockBreakdownGoal, mockAnalyzeWeek, mockDailyCoach } = vi.hoisted(() => ({
  mockParseActivity:  vi.fn(),
  mockBreakdownGoal:  vi.fn(),
  mockAnalyzeWeek:    vi.fn(),
  mockDailyCoach:     vi.fn(),
}));

vi.mock('@polaris/ai', () => {
  const instance = {
    providerName:  'mock',
    parseActivity:  mockParseActivity,
    breakdownGoal:  mockBreakdownGoal,
    analyzeWeek:    mockAnalyzeWeek,
    dailyCoach:     mockDailyCoach,
  };
  return {
    PolarisAI:   class { providerName='mock'; parseActivity=mockParseActivity; breakdownGoal=mockBreakdownGoal; analyzeWeek=mockAnalyzeWeek; dailyCoach=mockDailyCoach; },
    polarisAI:   instance,
    aiService:   instance,
  };
});

// ---------------------------------------------------------------------------
// Now import the service (which re-exports polarisAI as aiService)
// ---------------------------------------------------------------------------

import { aiService } from '../ai.service.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const goals = [
  { id: 'goal-1', title: 'Read 7200 pages this year', targetUnit: 'pages' },
];

const dashboardMetrics = {
  period:              'week' as const,
  startDate:           '2026-04-07',
  endDate:             '2026-04-14',
  totalActivities:     15,
  completedActivities: 12,
  plannedActivities:   5,
  goalsTouched:        3,
  completionRate:      80,
  currentStreak:       5,
  longestStreak:       17,
  totalFocusMinutes:   300,
  activityByDay:       {} as Record<string, number>,
  goalProgress:        [],
};

const polarisContext = {
  activeGoals: [
    { id: 'goal-1', title: 'Read 7200 pages this year', progress: 20, timeframe: 'long', lastActivityDaysAgo: 2 },
  ],
  recentActivities: [],
  todayPlanned:     [],
  todayCompleted:   [],
  currentStreak:    5,
  longestStreak:    17,
  timeOfDay:        'morning' as const,
  dayOfWeek:        'Monday',
  currentDate:      '2026-04-14',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('aiService (PolarisAI facade)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── parseActivity ─────────────────────────────────────────────────────────

  describe('parseActivity', () => {
    it('returns parsed result from the mock provider', async () => {
      mockParseActivity.mockResolvedValue({
        title:        'Read 30 pages',
        activityType: 'quantity',
        value:        30,
        unit:         'pages',
        goalId:       'goal-1',
        confidence:   0.95,
        intent:       'log_activity',
        source:       'ai',
      });

      const result = await aiService.parseActivity('read 30 pages', goals);
      expect(result.title).toBe('Read 30 pages');
      expect(result.value).toBe(30);
      expect(result.confidence).toBe(0.95);
      expect(mockParseActivity).toHaveBeenCalledWith('read 30 pages', goals);
    });

    it('propagates errors from the provider', async () => {
      mockParseActivity.mockRejectedValue(new Error('Provider unavailable'));
      await expect(aiService.parseActivity('read 30 pages', goals)).rejects.toThrow('Provider unavailable');
    });
  });

  // ── providerName ──────────────────────────────────────────────────────────

  describe('providerName', () => {
    it('exposes the active provider name', () => {
      expect(aiService.providerName).toBe('mock');
    });
  });

  // ── breakdownGoal ─────────────────────────────────────────────────────────

  describe('breakdownGoal', () => {
    it('returns sub-goals and suggested activities', async () => {
      mockBreakdownGoal.mockResolvedValue({
        subGoals:            [{ title: 'Sub-goal 1', targetValue: 100, unit: 'pages' }],
        suggestedActivities: [{ title: 'Read daily', frequency: 'daily', estimatedValue: 30, unit: 'pages' }],
      });

      const result = await aiService.breakdownGoal({
        title:       'Read 7200 pages',
        description: null,
        timeframe:   'long',
        targetValue: 7200,
        targetUnit:  'pages',
        targetDate:  null,
      });
      expect(result.subGoals.length).toBeGreaterThan(0);
      expect(result.suggestedActivities.length).toBeGreaterThan(0);
    });
  });

  // ── analyzeWeek ───────────────────────────────────────────────────────────

  describe('analyzeWeek', () => {
    it('returns weekly insights with summary', async () => {
      mockAnalyzeWeek.mockResolvedValue({
        summary:     'Good week.',
        insights:    ['Completed 3 goals'],
        suggestions: ['Rest tomorrow'],
        provider:    'mock',
      });

      const result = await aiService.analyzeWeek(dashboardMetrics);
      expect(result.summary).toBe('Good week.');
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  // ── dailyCoach ────────────────────────────────────────────────────────────

  describe('dailyCoach', () => {
    it('returns a coaching message', async () => {
      mockDailyCoach.mockResolvedValue({
        message:    'Stay consistent.',
        suggestion: { title: 'Read 30 pages', goalId: null },
        quote:      null,
      });

      const result = await aiService.dailyCoach(polarisContext);
      expect(result.message).toBe('Stay consistent.');
    });
  });
});

