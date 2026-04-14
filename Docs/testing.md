# Polaris — Testing Strategy & Standards

**Last Updated:** April 13, 2026

---

## Overview

| Area | Runner | Coverage Target | Status |
|------|--------|----------------|--------|
| Backend services | Vitest (Node) | 60% lines/functions | ✅ 94 tests passing |
| Frontend components + hooks | Vitest (jsdom) | 50% lines/functions | ✅ 97 tests passing |
| E2E | None yet | — | ❌ Not set up |
| CI/CD | None yet | — | ❌ Not set up |

---

## Running Tests

```bash
# All tests (backend + frontend)
npm test

# One workspace
npm run test --workspace=apps/backend
npm run test --workspace=apps/frontend

# Watch mode (during development)
npm run test:watch --workspace=apps/backend

# Coverage report (HTML at coverage/)
npm run test:coverage --workspace=apps/backend
npm run test:coverage --workspace=apps/frontend
```

---

## Backend Test Structure

```
apps/backend/src/
  lib/__tests__/
    errors.test.ts              — AppError class, notFound(), badRequest() helpers

  services/__tests__/
    goal.service.test.ts        — Goal CRUD, computeProgress, cascade delete
    activity.service.test.ts    — Activity CRUD, getActivityTags, today grouping
    focus-session.service.test.ts — State machine transitions (idle→running→done), elapsed calc
    metrics.service.test.ts     — Streak edge cases, period variants, heatmap
    dormancy.service.test.ts    — 7-day threshold logic, active goal filtering
    ai.service.test.ts          — PolarisAI facade, provider mock, fallback, providerName

  routes/__tests__/
    goals.integration.test.ts        — Full HTTP lifecycle for /api/goals
    activities.integration.test.ts   — Full HTTP lifecycle for /api/activities + /tags
    focus-sessions.integration.test.ts — /api/focus-sessions complete/abandon lifecycle
    ai.integration.test.ts           — /api/ai parse-activity, daily-coach, config
```

### Backend Mock Pattern

All Prisma calls are mocked using `vi.mock`:

```typescript
vi.mock('../../lib/prisma.js', () => ({
  default: {
    goal: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
    },
  },
}));
```

Route integration tests use Fastify's `app.inject()` — no HTTP server needed:

```typescript
const res = await app.inject({ method: 'GET', url: '/api/goals' });
expect(res.statusCode).toBe(200);
expect(JSON.parse(res.body).success).toBe(true);
```

---

## Frontend Test Structure

```
apps/frontend/src/
  __tests__/
    setup.ts                          — Global jest-dom matchers
    services/api.test.ts              — HTTP client, error normalization
    components/ui/
      Badge.test.tsx                  — TimeframeBadge, StatusBadge variants
      ui.test.tsx                     — ProgressBar, ErrorBoundary, EmptyState

  hooks/__tests__/
    useGoals.test.ts                  — Filter variants, cache invalidation
    useActivityInput.test.ts          — Local NLP → AI upgrade → confirm → save pipeline
    useFocusTimer.test.ts             — Countdown, pause/resume, break tracking, onComplete

  components/__tests__/
    ParsedActivityCard.test.tsx       — Field display, confidence, source emoji, save/dismiss
    TodayKanban.test.tsx              — Column render, empty states, status mutations
    AudioPlayer.test.tsx              — Stream selection, volume, playback toggle, error toast
    Settings.test.tsx                 — Provider list, Test AI button, success/error result
```

### Frontend Mock Patterns

**TanStack Query / API:**
```typescript
vi.mock('../services/api.js', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));
```

**Framer Motion** (jsdom doesn't handle animations):
```typescript
vi.mock('framer-motion', () => {
  const makeEl = (tag: string) =>
    ({ children, ...p }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(tag, p, children);
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_t, tag: string) => makeEl(tag),
    }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});
```

**Zustand store:**
```typescript
vi.mock('@/stores/audioPlayer.store', () => ({
  useAudioPlayer: () => ({
    isPlaying: false,
    togglePlay: vi.fn(),
    // ...other store state
  }),
  PRESET_STREAMS: [...],
}));
```

**Path aliases:** The `@/` alias is configured in `vitest.config.ts`:
```typescript
resolve: { alias: { '@': resolve(__dirname, './src') } }
```

---

## What's NOT Tested

| Item | Reason |
|------|--------|
| 3D components (ConstellationBackground, FocusCore, GoalConstellation) | Three.js/WebGL — not supported in jsdom |
| Audio hardware (HTMLAudioElement play/load) | Mocked at `Audio` global level |
| Whisper service transcription | External service — integration only |
| Ollama/OpenAI providers | Network dependent — mocked in all tests |
| E2E user flows | No Playwright/Cypress yet |
| CI/CD pipeline | No GitHub Actions yet |

---

## Audio Streams — TODO

Zeno.fm streams (currently configured in `audioPlayer.store.ts`) are paid/broken. Replacement streams needed:
- **BBC Sounds Radio** (public HTTP streams)
- **Laut.fm** (free community radio)
- **Self-hosted** ambient audio files via CDN

Until replaced, AudioPlayer tests mock the `Audio` class constructor and assert on store interactions only.

---

## Known Gaps (future test files to add)

| Priority | File | What to test |
|----------|------|-------------|
| High | `hooks/__tests__/useFocusSessions.test.ts` | Active session polling, state queries |
| High | `hooks/__tests__/useDormantGoals.test.ts` | 5-min cache, 7-day threshold |
| Medium | `components/__tests__/WeeklyReview.test.tsx` | SSE stream UI, dormant goal list |
| Medium | `components/__tests__/GoalCard.test.tsx` | Progress %, status badge colors |
| Medium | `routes/__tests__/metrics.integration.test.ts` | Dashboard period param |
| Low | `packages/ai/src/__tests__/` | Would need vitest added to AI package |
| Low | E2E | Playwright setup for full user flows |
