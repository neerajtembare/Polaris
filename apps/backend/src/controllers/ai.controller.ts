/**
 * @file controllers/ai.controller.ts
 * @description HTTP handlers for AI endpoints.
 *   All AI calls route through aiService (PolarisAI singleton from @polaris/ai).
 *   Controllers never mutate the database — suggestions only.
 *
 * @module @polaris/backend/controllers
 *
 * @relatedFiles
 *   - src/routes/ai.ts
 *   - src/services/ai.service.ts
 *   - packages/ai/src/PolarisAI.ts
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { aiService }           from '../services/ai.service.js';
import { listGoals }           from '../services/goal.service.js';
import { getGoalById }         from '../services/goal.service.js';
import { getDashboardMetrics } from '../services/metrics.service.js';
import { assemblePolarisContext } from '../services/polaris-context.service.js';
import { handleError }         from '../lib/handleError.js';
import {
  getProvider,
  classifyIntent,
  getToolsForIntent,
  validateToolCall,
  streamBriefing,
  buildTarsSystemMessage,
  requiresConfirmation,
} from '@polaris/ai';
import type { TARSAction, QuickReplyChip, IntentType } from '@polaris/ai';
import type { PolarisContext } from '@polaris/shared';

// ---------------------------------------------------------------------------
// Chip sets — hardcoded per action type / intent (never AI-generated)
// ---------------------------------------------------------------------------

function chipsForAction(action: TARSAction | null, intent: IntentType): QuickReplyChip[] | undefined {
  if (action) {
    switch (action.type) {
      case 'log_activity':
      case 'plan_activity':
        // Shown AFTER the confirmation card is submitted — returned here so frontend
        // can attach them to the success message added post-confirm.
        return [
          { label: 'Start Focus',  action: { type: 'focus.start' } },
          { label: 'Log Another',  action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
          { label: 'View Today',   action: { type: 'navigate', screen: 'Hub' } },
        ];
      case 'create_goal':
        return [
          { label: 'View Goals',   action: { type: 'navigate', screen: 'Goals' } },
          { label: 'Log Activity', action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
        ];
      case 'show_goals':
        return [
          { label: 'Add New Goal',    action: { type: 'create_goal', draft: { title: '', timeframe: 'medium' } } },
          { label: 'View Progress',   action: { type: 'navigate', screen: 'Goals' } },
        ];
      case 'audio.play':
        return [
          { label: 'Lo-fi',     action: { type: 'audio.play' } },
          { label: 'Jazz',      action: { type: 'audio.play' } },
          { label: 'Classical', action: { type: 'audio.play' } },
          { label: 'Stop',      action: { type: 'audio.stop' } },
        ];
    }
  }
  // Intent-based chips (no action returned — text-only responses)
  if (intent === 'query') {
    return [
      { label: 'Weekly Review',    action: { type: 'navigate', screen: 'WeeklyReview' } },
      { label: 'View Goals',       action: { type: 'navigate', screen: 'Goals' } },
      { label: 'View Insights',    action: { type: 'navigate', screen: 'Insights' } },
    ];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Direct query resolution — Tier 2 data-read responses (no LLM needed)
// Returns a short formatted response + chips directly from PolarisContext.
// Returns null if no specific pattern matched (caller falls through to LLM).
// ---------------------------------------------------------------------------

interface DirectQueryResult {
  text:   string;
  chips?: QuickReplyChip[];
}

function tryDirectQuery(message: string, ctx: PolarisContext): DirectQueryResult | null {
  const lower = message.toLowerCase().trim();

  // ── Today's planned activities [2.1] ──────────────────────────────────────
  if (/what('s|\s+is|\s+are)?\s+(planned|do\s+i\s+have)\s+(today|for\s+today)|(today'?s?\s+(plan|list|schedule|task|todo))|\bwhat\s+(do\s+i\s+have\s+today|have\s+i\s+planned)/.test(lower)) {
    if (ctx.todayPlanned.length === 0) {
      return {
        text: "Nothing planned for today yet.",
        chips: [
          { label: 'Plan Activity', action: { type: 'plan_activity', draft: { title: '', activityType: 'completion' } } },
          { label: 'View Goals',    action: { type: 'navigate', screen: 'Goals' } },
        ],
      };
    }
    const list = ctx.todayPlanned
      .map((a) => `• ${a.title}${a.goalTitle ? ` (${a.goalTitle})` : ''}`)
      .join('\n');
    return {
      text: `Today's plan:\n${list}`,
      chips: [
        { label: 'Log Completed', action: { type: 'log_activity',  draft: { title: '', activityType: 'completion' } } },
        { label: 'View Today',    action: { type: 'navigate',      screen: 'Hub' } },
      ],
    };
  }

  // ── Today's completed activities [2.2] ────────────────────────────────────
  if (/what\s+did\s+i\s+(do|complete|finish|accomplish)\s+(today|this\s+(morning|afternoon|evening))|(today'?s?\s+(progress|completed|done|accomplishments?|activities?))|how\s+much\s+(did\s+i\s+do|have\s+i\s+done)\s+today/.test(lower)) {
    if (ctx.todayCompleted.length === 0) {
      return {
        text: "Nothing logged for today yet — still early!",
        chips: [
          { label: 'Log Activity', action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
          { label: 'View Goals',   action: { type: 'navigate', screen: 'Goals' } },
        ],
      };
    }
    const list = ctx.todayCompleted
      .map((a) => `• ${a.title}${a.value != null ? ` — ${a.value}${a.unit ? ` ${a.unit}` : ''}` : ''}`)
      .join('\n');
    return {
      text: `Completed today:\n${list}`,
      chips: [
        { label: 'Log Another', action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
        { label: 'Start Focus',  action: { type: 'focus.start' } },
        { label: 'View Today',   action: { type: 'navigate', screen: 'Hub' } },
      ],
    };
  }

  // ── Streak [2.3] ──────────────────────────────────────────────────────────
  if (/\b(my\s+)?streak\b|\bcurrent\s+streak\b|\blongest\s+streak\b|\bhow\s+(long|many\s+days).*(streak|going|active)\b|streak\s+(count|is\b)/.test(lower)) {
    const curr = ctx.currentStreak;
    const best = ctx.longestStreak;
    let text: string;
    if (curr === 0) {
      text = "No active streak right now — log an activity today to start one!";
    } else if (curr === 1) {
      text = `1-day streak — keep it going!${best > 1 ? ` Your longest is ${best} days.` : ''}`;
    } else {
      const bestNote = best > curr ? ` Your longest ever is ${best} days.` : curr === best ? ' This ties your longest streak!' : '';
      text = `${curr}-day streak!${bestNote}`;
    }
    return {
      text,
      chips: [
        { label: 'Log Activity',  action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
        { label: 'Weekly Review', action: { type: 'navigate', screen: 'WeeklyReview' } },
        { label: 'View Insights', action: { type: 'navigate', screen: 'Insights' } },
      ],
    };
  }

  // ── Goals list with progress [2.4] ────────────────────────────────────────
  if (/\b(list|show|see|view)\s+(all\s+|my\s+)?goals?\b|(what\s+goals?\s+do\s+i|(all|my\s+active)\s+goals?)/.test(lower)) {
    if (ctx.activeGoals.length === 0) {
      return {
        text: "No active goals yet.",
        chips: [
          { label: 'Create Goal', action: { type: 'create_goal', draft: { title: '', timeframe: 'medium' } } },
        ],
      };
    }
    const list = ctx.activeGoals
      .map((g) => {
        const ageNote =
          g.lastActivityDaysAgo === -1 ? '(never started)' :
          g.lastActivityDaysAgo === 0  ? '(active today)'  :
          `(last: ${g.lastActivityDaysAgo}d ago)`;
        return `• ${g.title} — ${g.progress}% ${ageNote}`;
      })
      .join('\n');
    return {
      text: `Active goals:\n${list}`,
      chips: [
        { label: 'View Goals',  action: { type: 'navigate', screen: 'Goals' } },
        { label: 'Add Goal',    action: { type: 'create_goal', draft: { title: '', timeframe: 'medium' } } },
        { label: 'Log Activity', action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
      ],
    };
  }

  // ── Weekly activity stats [2.7–2.9] ─────────────────────────────────────
  if (/\b(my\s+stats?|statistics|weekly\s+(stats?|metrics?|performance|count)|how\s+(active|many\s+activities?)|activity\s+count|activities?\s+(this\s+week|this\s+month)|this\s+week'?s?\s+(stats?|summary|count))/.test(lower)) {
    const weekCount = ctx.recentActivities.length;
    const goalsTouched = ctx.activeGoals.filter(
      (g) => g.lastActivityDaysAgo >= 0 && g.lastActivityDaysAgo <= 7
    ).length;
    const streakNote = ctx.currentStreak > 0
      ? ` Current streak: ${ctx.currentStreak} day${ctx.currentStreak !== 1 ? 's' : ''}.`
      : '';
    return {
      text: `This week: ${weekCount} activit${weekCount !== 1 ? 'ies' : 'y'} logged, ${goalsTouched} goal${goalsTouched !== 1 ? 's' : ''} touched.${streakNote}`,
      chips: [
        { label: 'Weekly Review', action: { type: 'navigate', screen: 'WeeklyReview' } },
        { label: 'View Insights', action: { type: 'navigate', screen: 'Insights' } },
        { label: 'View Goals',    action: { type: 'navigate', screen: 'Goals' } },
      ],
    };
  }

  // ── Specific goal progress [2.5] ──────────────────────────────────────────
  // Matches: "how's my reading goal", "reading progress", "progress on gym goal"
  const goalCandidates = [
    lower.match(/how'?s?\s+(?:my\s+)?(.+?)\s+goal\b/),
    lower.match(/\b(.+?)\s+(?:goal\s+)?progress\b/),
    lower.match(/\bprogress\s+(?:on|for|of)\s+(?:my\s+)?(.+?)\s+(?:goal)?\s*$/),
    lower.match(/\b(.+?)\s+goal\s+(?:status|percentage|%)\b/),
  ];
  for (const m of goalCandidates) {
    const query = m?.[1]?.trim();
    if (query && query.length >= 2) {
      const match = ctx.activeGoals.find((g) => {
        const t = g.title.toLowerCase();
        return t.includes(query) || query.includes(t.split(' ')[0] ?? '');
      });
      if (match) {
        const daysNote =
          match.lastActivityDaysAgo === -1 ? 'Never started yet.' :
          match.lastActivityDaysAgo === 0  ? 'You logged something today!' :
          `Last activity: ${match.lastActivityDaysAgo} day${match.lastActivityDaysAgo !== 1 ? 's' : ''} ago.`;
        return {
          text: `${match.title}: ${match.progress}% complete. ${daysNote}`,
          chips: [
            { label: 'Log Activity', action: { type: 'log_activity', draft: { title: '', activityType: 'completion', goalId: match.id, goalTitle: match.title } } },
            { label: 'View Goals',   action: { type: 'navigate', screen: 'Goals' } },
          ],
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Request body shapes
// ---------------------------------------------------------------------------

interface ParseActivityBody {
  rawInput: string;
}

interface BreakdownBody {
  goalId: string;
}

interface SetAiConfigBody {
  model?: string;
  provider?: string;
}

interface SetApiKeyBody {
  provider: string;
  apiKey: string;
}

interface ChatBody {
  message:            string;
  /** Up to 20 prior turns from the session — kept in-memory client-side, never persisted */
  history?:           Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Type of the action TARS last proposed (e.g. 'log_activity') — routes confirmation words */
  pendingActionType?: string;
  /**
   * Full TARSAction draft from the last proposal (sent when pendingActionType is set).
   * When the user confirms (says "yes"), we use this draft directly instead of re-calling
   * the LLM — which prevents the LLM from generating a different activity from history.
   */
  pendingActionArgs?: TARSAction;
  /** Current screen the user is on — used for disambiguation (e.g. "add one" on Goals) */
  currentScreen?:     string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/ai/parse-activity
 */
export async function parseActivityHandler(
  request: FastifyRequest<{ Body: ParseActivityBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { rawInput } = request.body;

    const goals = await listGoals({ status: 'active' });
    type GoalRow = { id: string; title: string; targetUnit: string | null };
    const goalContext = (goals as GoalRow[]).slice(0, 10).map((g: GoalRow) => ({
      id:         g.id,
      title:      g.title,
      targetUnit: g.targetUnit,
    }));

    const result = await aiService.parseActivity(rawInput.trim(), goalContext);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * POST /api/ai/breakdown
 */
export async function breakdownHandler(
  request: FastifyRequest<{ Body: BreakdownBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { goalId } = request.body;

    const goal = await getGoalById(goalId, { includeProgress: false, includeChildren: false });
    if (!goal) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Goal not found' },
      });
    }

    const targetDate: string | null =
      goal.targetDate != null
        ? ((goal.targetDate as Date).toISOString().split('T')[0] ?? null)
        : null;

    const result = await aiService.breakdownGoal({
      title:       goal.title,
      description: goal.description ?? null,
      timeframe:   goal.timeframe,
      targetValue: goal.targetValue ?? null,
      targetUnit:  goal.targetUnit ?? null,
      targetDate:  targetDate ?? null,
    });

    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * POST /api/ai/analyze-week
 */
export async function analyzeWeekHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const metrics = await getDashboardMetrics('week');
    const result = await aiService.analyzeWeek(metrics);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController', err, reply);
  }
}

/**
 * GET /api/ai/analyze-week/stream
 * Streams the weekly analysis as Server-Sent Events.
 * Each event is `data: <chunk>\n\n`. A final `data: [DONE]\n\n` marks completion.
 * Uses the active provider's chatStream() — works for Gemini, Ollama, OpenAI, and mock.
 */
export async function analyzeWeekStreamHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  // Fetch data BEFORE committing headers so errors can still be returned as HTTP errors
  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  try {
    metrics = await getDashboardMetrics('week');
  } catch (err) {
    return handleError('AIController', err, reply);
  }

  // Headers committed — from this point on we must stream, not throw HTTP errors
  void reply.raw.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data: string) => {
    reply.raw.write(`data: ${data}\n\n`);
  };

  const completionRate =
    metrics.totalActivities > 0
      ? Math.round((metrics.completedActivities / metrics.totalActivities) * 100)
      : 0;

  const userPrompt = `Weekly metrics:
- Activities completed: ${metrics.completedActivities} / ${metrics.totalActivities} (${completionRate}%)
- Goals touched: ${metrics.goalsTouched}
- Current streak: ${metrics.currentStreak} days
- Period: last 7 days

Return JSON with: { "summary": "string", "insights": ["string"], "suggestions": ["string"] }`;

  const systemPrompt = `You are a productivity coach analyzing a week of user data.
Return only valid JSON. Be specific, actionable, and encouraging.`;

  try {
    const provider = getProvider();

    // Mock provider: send a single non-streamed result
    if (provider.name === 'mock') {
      const result = await aiService.analyzeWeek(metrics);
      sendEvent(JSON.stringify({ type: 'result', data: result }));
      sendEvent('[DONE]');
      reply.raw.end();
      return;
    }

    let buffer = '';
    for await (const chunk of provider.chatStream(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      { temperature: 0.4, maxTokens: 700 }
    )) {
      buffer += chunk;
      sendEvent(JSON.stringify({ type: 'token', token: chunk }));
    }

    // Parse accumulated buffer into structured result
    try {
      const parsed = JSON.parse(buffer) as {
        summary?:     string;
        insights?:    string[];
        suggestions?: string[];
      };
      sendEvent(JSON.stringify({
        type: 'result',
        data: {
          summary:     parsed.summary     ?? '',
          insights:    parsed.insights    ?? [],
          suggestions: parsed.suggestions ?? [],
          provider:    provider.name,
        },
      }));
    } catch {
      // Buffer wasn't valid JSON — send raw as summary
      sendEvent(JSON.stringify({
        type: 'result',
        data: { summary: buffer, insights: [], suggestions: [], provider: provider.name },
      }));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendEvent(JSON.stringify({ type: 'error', message: msg }));
  }

  sendEvent('[DONE]');
  reply.raw.end();
}

/**
 * GET /api/ai/daily-coach
 * Returns a personalised daily coaching message + suggested activity.
 * Safe to call repeatedly — the frontend caches the result for the day.
 */
export async function dailyCoachHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  try {
    const ctx    = await assemblePolarisContext();
    const result = await aiService.dailyCoach(ctx);
    return reply.send({ success: true, data: result });
  } catch (err) {
    return handleError('AIController.dailyCoach', err, reply);
  }
}

/**
 * GET /api/ai/config
 * Returns the active provider, model, and live connection status.
 * Status is checked via a lightweight health ping (cached 30s on the client via staleTime).
 */
export async function getAiConfigHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const providerName = process.env['AI_PROVIDER'] ?? 'mock';

  const model =
    providerName === 'gemini' ? (process.env['GEMINI_MODEL'] ?? 'gemma-4-26b-a4b-it') :
    providerName === 'ollama' ? (process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b') :
    providerName === 'openai' ? (process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini') :
    'mock';

  let status: 'connected' | 'error' | 'unknown' | 'slow' = 'unknown';
  let statusMessage: string | undefined;
  let latencyMs: number | undefined;

  try {
    if (providerName === 'gemini') {
      const apiKey = process.env['GEMINI_API_KEY'];
      if (!apiKey) {
        status = 'error';
        statusMessage = 'GEMINI_API_KEY is not set';
      } else {
        const startMs = Date.now();
        const pingRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
            signal:  AbortSignal.timeout(5_000),
          }
        );
        latencyMs = Date.now() - startMs;
        if (pingRes.ok) {
          status = latencyMs > 10_000 ? 'slow' : 'connected';
          statusMessage = `Gemini API responding (${latencyMs}ms)`;
        } else {
          const body = await pingRes.text().catch(() => '');
          status = 'error';
          statusMessage = `HTTP ${pingRes.status}: ${body.slice(0, 120)}`;
        }
      }
    } else if (providerName === 'ollama') {
      const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
      const startMs   = Date.now();
      const pingRes   = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5_000) });
      latencyMs = Date.now() - startMs;
      if (pingRes.ok) {
        status = latencyMs > 10_000 ? 'slow' : 'connected';
        statusMessage = `Ollama responding (${latencyMs}ms)`;
      } else {
        status = 'error';
        statusMessage = `Ollama unreachable: HTTP ${pingRes.status}`;
      }
    } else if (providerName === 'openai') {
      // Don't ping OpenAI — wastes quota. Return unknown.
      status = 'unknown';
      statusMessage = 'OpenAI status not checked (API credits)';
    } else {
      // mock
      status = 'connected';
      statusMessage = 'Mock provider always available';
    }
  } catch (err) {
    status = 'error';
    statusMessage = err instanceof Error ? err.message : 'Health check failed';
  }

  return reply.send({
    success: true,
    data: { provider: providerName, model, status, statusMessage, latencyMs },
  });
}

/**
 * POST /api/ai/config
 * Switch the active provider and/or model at runtime. Takes effect immediately.
 * Body: { provider?: string, model?: string }
 */
export async function setAiConfigHandler(
  request: FastifyRequest<{ Body: SetAiConfigBody }>,
  reply:   FastifyReply
): Promise<void> {
  const { model, provider: newProvider } = request.body;

  // Switch provider if requested
  if (newProvider) {
    const valid = ['mock', 'openai', 'ollama', 'gemini'];
    if (!valid.includes(newProvider)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PROVIDER', message: `Provider must be one of: ${valid.join(', ')}` },
      });
    }
    process.env['AI_PROVIDER'] = newProvider;
  }

  const providerName = process.env['AI_PROVIDER'] ?? 'mock';

  // Switch model if requested
  if (model) {
    if (providerName === 'gemini') {
      process.env['GEMINI_MODEL'] = model;
    } else if (providerName === 'ollama') {
      process.env['OLLAMA_MODEL'] = model;
    } else if (providerName === 'openai') {
      process.env['OPENAI_MODEL'] = model;
    }
  }

  const activeModel =
    providerName === 'gemini' ? (process.env['GEMINI_MODEL'] ?? 'gemma-4-26b-a4b-it') :
    providerName === 'ollama' ? (process.env['OLLAMA_MODEL'] ?? 'gemma4:e4b') :
    providerName === 'openai' ? (process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini') :
    'mock';

  return reply.send({ success: true, data: { provider: providerName, model: activeModel } });
}

/**
 * POST /api/ai/config/key
 * Set an API key for the given provider at runtime (stored in process.env only — not persisted).
 * This is a local-dev convenience; keys are lost on server restart.
 * Body: { provider: string, apiKey: string }
 */
export async function setApiKeyHandler(
  request: FastifyRequest<{ Body: SetApiKeyBody }>,
  reply:   FastifyReply
): Promise<void> {
  const { provider, apiKey } = request.body;

  if (!apiKey || apiKey.trim().length === 0) {
    return reply.status(400).send({
      success: false,
      error: { code: 'INVALID_KEY', message: 'apiKey must not be empty' },
    });
  }

  if (provider === 'gemini') {
    process.env['GEMINI_API_KEY'] = apiKey.trim();
  } else if (provider === 'openai') {
    process.env['OPENAI_API_KEY'] = apiKey.trim();
  } else {
    return reply.status(400).send({
      success: false,
      error: { code: 'UNSUPPORTED_PROVIDER', message: 'Key configuration is only supported for: gemini, openai' },
    });
  }

  return reply.send({ success: true, data: { provider, keySet: true } });
}

/**
 * GET /api/ai/ollama-models
 */
export async function getOllamaModelsHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';

  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return reply.status(503).send({
        success: false,
        error: { code: 'AI_UNAVAILABLE', message: `Ollama responded with ${res.status} — service may be down` },
      });
    }

    type OllamaTagsResponse = { models: Array<{ name: string; modified_at: string; size: number }> };
    const json = (await res.json()) as OllamaTagsResponse;
    const models = (json.models ?? []).map((m) => m.name);

    return reply.send({ success: true, data: { models } });
  } catch {
    return reply.send({ success: true, data: { models: [] } });
  }
}

/**
 * POST /api/ai/chat
 * Conversational TARS endpoint.
 * - Classifies intent heuristically (no extra LLM call for 80% of inputs)
 * - Injects PolarisContext into the system prompt
 * - Calls provider.chat() with function-calling tools when write intent is detected
 * - Validates tool call output via Zod and returns a typed TARSAction
 */
export async function chatHandler(
  request: FastifyRequest<{ Body: ChatBody }>,
  reply:   FastifyReply
): Promise<void> {
  try {
    const { message, history, pendingActionType, pendingActionArgs, currentScreen } = request.body;
    const startMs = Date.now();

    const { intent, confidence } = classifyIntent(
      message,
      pendingActionType ? { pendingActionType, currentScreen } : { currentScreen }
    );

    // ── Confirmation short-circuit ───────────────────────────────────────────
    // If the user is confirming a pending action AND we have the original draft,
    // skip the LLM entirely — return the same draft for the ToolConfirmCard to show again.
    // This prevents the LLM from regenerating a different activity from history.
    const isConfirmationIntent = ['log_activity', 'plan_activity', 'create_goal'].includes(intent);
    if (isConfirmationIntent && pendingActionArgs && pendingActionArgs.type === intent) {
      const latencyMs = Date.now() - startMs;
      request.log.info(
        { intent, confidence, provider: 'short-circuit', latencyMs },
        '[TARS] confirmation short-circuit — reusing pending draft'
      );
      return reply.send({
        success: true,
        data: {
          response:             null,
          action:               pendingActionArgs,
          requiresConfirmation: true,
          chips:                chipsForAction(pendingActionArgs, intent),
          intent,
          confidence,
          provider:             'short-circuit',
          latencyMs,
        },
      });
    }
    // ── End short-circuit ────────────────────────────────────────────────────

    const [ctx] = await Promise.all([assemblePolarisContext()]);
    // NOTE: Promise.all kept intentionally — reserved for adding parallel pre-fetches (e.g. getDashboardMetrics).

    // ── Direct query short-circuit (Tier 2 — no LLM needed) ────────────────
    // For well-known read queries, format a response directly from PolarisContext.
    if (intent === 'query') {
      const direct = tryDirectQuery(message, ctx);
      if (direct) {
        const latencyMs = Date.now() - startMs;
        request.log.info(
          { intent, confidence, provider: 'direct', latencyMs },
          '[TARS] direct query resolved from context'
        );
        return reply.send({
          success: true,
          data: {
            response:             direct.text,
            action:               null,
            requiresConfirmation: false,
            chips:                (direct.chips && direct.chips.length > 0) ? direct.chips : chipsForAction(null, intent),
            intent,
            confidence,
            provider:             'direct',
            latencyMs,
          },
        });
      }
    }
    // ── End direct query short-circuit ──────────────────────────────────────

    // ── Sprint E: Intelligent feature intents (Tier 4 — existing AI backends) ─
    if (intent === 'daily_coach') {
      try {
        const coach = await aiService.dailyCoach(ctx);
        const suggestionLine = coach.suggestion
          ? `\nSuggested today: ${coach.suggestion.title}${coach.suggestion.value ? ` — ${coach.suggestion.value} ${coach.suggestion.unit}` : ''}.`
          : '';
        const latencyMs = Date.now() - startMs;
        request.log.info({ intent, provider: 'daily-coach', latencyMs }, '[TARS] daily coach');
        return reply.send({
          success: true,
          data: {
            response:             `${coach.message}${suggestionLine}\n${coach.streakMessage}`,
            action:               coach.suggestion
              ? { type: 'log_activity', draft: {
                  title:        coach.suggestion.title,
                  activityType: coach.suggestion.activityType,
                  value:        coach.suggestion.value,
                  unit:         coach.suggestion.unit,
                  goalId:       coach.suggestion.goalId,
                } }
              : null,
            requiresConfirmation: !!coach.suggestion,
            chips: [
              { label: 'Weekly Review', action: { type: 'navigate', screen: 'WeeklyReview' } },
              { label: 'View Goals',    action: { type: 'navigate', screen: 'Goals' } },
              { label: 'Log Activity',  action: { type: 'log_activity', draft: { title: '', activityType: 'completion' } } },
            ],
            intent,
            confidence,
            provider: 'daily-coach',
            latencyMs,
          },
        });
      } catch (coachErr) {
        request.log.warn({ err: coachErr }, '[TARS] daily coach failed — falling through to LLM');
      }
    }

    if (intent === 'analyze_week') {
      try {
        const metrics = await getDashboardMetrics('week');
        const analysis = await aiService.analyzeWeek(metrics);
        const insightLines = analysis.insights.length > 0
          ? '\n\n' + analysis.insights.slice(0, 3).map((i) => `• ${i}`).join('\n')
          : '';
        const suggestionLines = analysis.suggestions.length > 0
          ? '\n\nSuggestions:\n' + analysis.suggestions.slice(0, 2).map((s) => `→ ${s}`).join('\n')
          : '';
        const latencyMs = Date.now() - startMs;
        request.log.info({ intent, provider: analysis.provider, latencyMs }, '[TARS] weekly analysis');
        return reply.send({
          success: true,
          data: {
            response:             `${analysis.summary}${insightLines}${suggestionLines}`,
            action:               null,
            requiresConfirmation: false,
            chips: [
              { label: 'Full Review',   action: { type: 'navigate', screen: 'WeeklyReview' } },
              { label: 'View Insights', action: { type: 'navigate', screen: 'Insights' } },
              { label: 'View Goals',    action: { type: 'navigate', screen: 'Goals' } },
            ],
            intent,
            confidence,
            provider: analysis.provider,
            latencyMs,
          },
        });
      } catch (weekErr) {
        request.log.warn({ err: weekErr }, '[TARS] weekly analysis failed — falling through to LLM');
      }
    }

    if (intent === 'goal_breakdown') {
      // Extract goal name from message and match against activeGoals in context
      const lower = message.toLowerCase();
      const matchPhrases = [
        lower.match(/break\s+down\s+(?:my\s+)?(.+?)\s+goal\b/),
        lower.match(/break\s+(?:my\s+)?(.+?)\s+goal\s+down\b/),
        lower.match(/(?:decompose|deconstruct)\s+(?:my\s+)?(.+?)\s+goal\b/),
        lower.match(/sub.?goals?\s+for\s+(?:my\s+)?(.+?)(?:\s+goal)?\s*$/),
        lower.match(/how\s+(?:do|can)\s+i\s+achieve\s+(?:my\s+)?(.+?)(?:\s+goal)?\s*$/),
      ];
      let goalInput: { id: string; title: string } | null = null;
      for (const m of matchPhrases) {
        const q = m?.[1]?.trim();
        if (q && q.length >= 2) {
          const found = ctx.activeGoals.find((g) => {
            const t = g.title.toLowerCase();
            return t.includes(q) || q.includes(t.split(' ')[0] ?? '');
          });
          if (found) { goalInput = { id: found.id, title: found.title }; break; }
        }
      }
      // If no specific goal matched, use the first active goal (most recently added)
      if (!goalInput && ctx.activeGoals.length > 0) {
        goalInput = { id: ctx.activeGoals[0]!.id, title: ctx.activeGoals[0]!.title };
      }
      // No active goals at all — return early with a helpful message
      if (!goalInput) {
        const latencyMs = Date.now() - startMs;
        return reply.send({
          success: true,
          data: {
            response: "You don't have any active goals to break down yet. Create a goal first and I'll help you plan it out!",
            action: null,
            requiresConfirmation: false,
            chips: [
              { label: 'Create a Goal', action: { type: 'navigate', screen: 'Goals' } },
            ],
            intent,
            confidence,
            provider: 'direct',
            latencyMs,
          },
        });
      }
      if (goalInput) {
        try {
          const goal = await getGoalById(goalInput.id, { includeProgress: false, includeChildren: false });
          if (goal) {
            const breakdown = await aiService.breakdownGoal({
              title:       goal.title,
              description: goal.description ?? null,
              timeframe:   goal.timeframe,
              targetValue: goal.targetValue ?? null,
              targetUnit:  goal.targetUnit ?? null,
              targetDate:  goal.targetDate != null
                ? (goal.targetDate as Date).toISOString().split('T')[0] ?? null
                : null,
            });
            const subGoalLines = breakdown.subGoals.slice(0, 3)
              .map((sg) => `• ${sg.title}${sg.targetValue ? ` (target: ${sg.targetValue} ${sg.targetUnit ?? ''})` : ''}`)
              .join('\n');
            const activityLines = breakdown.suggestedActivities.slice(0, 3)
              .map((a) => `→ ${a.title}${a.value ? ` — ${a.value} ${a.unit ?? ''}` : ''}${a.frequency ? ` (${a.frequency})` : ''}`)
              .join('\n');
            const responseText = [
              `Here's how to break down **${goal.title}**:`,
              subGoalLines ? `\nSub-goals:\n${subGoalLines}` : '',
              activityLines ? `\nSuggested activities:\n${activityLines}` : '',
            ].filter(Boolean).join('');
            const latencyMs = Date.now() - startMs;
            request.log.info({ intent, goalId: goalInput.id, provider: breakdown.provider, latencyMs }, '[TARS] goal breakdown');
            return reply.send({
              success: true,
              data: {
                response:             responseText,
                action:               null,
                requiresConfirmation: false,
                chips: [
                  { label: 'View Goals',   action: { type: 'navigate', screen: 'Goals' } },
                  { label: 'Log Activity', action: { type: 'navigate', screen: 'Hub' } },
                ],
                intent,
                confidence,
                provider: breakdown.provider,
                latencyMs,
              },
            });
          }
        } catch (bdErr) {
          request.log.warn({ err: bdErr }, '[TARS] goal breakdown failed — falling through to LLM');
        }
      }
    }
    // ── End Sprint E intents ──────────────────────────────────────────────────

    const tools   = getToolsForIntent(intent);
    const system  = buildTarsSystemMessage(JSON.stringify(ctx, null, 2));
    const provider = getProvider();

    // Build multi-turn message array: system + history (capped) + current user message
    type Turn = { role: 'system' | 'user' | 'assistant'; content: string };
    const historyTurns: Turn[] = (history ?? []).slice(-20).map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const result = await provider.chat(
      [
        { role: 'system', content: system },
        ...historyTurns,
        { role: 'user',   content: message },
      ],
      {
        temperature: 0.5,
        // Tool calls need more room for JSON args — bump budget when tools are present
        maxTokens:   tools.length > 0 ? 600 : 400,
        ...(tools.length > 0 ? { tools } : {}),
      }
    );

    const latencyMs = Date.now() - startMs;

    // If the LLM called a tool, validate and return a TARSAction
    if (result.toolCall) {
      const validated = validateToolCall(result.toolCall.name, result.toolCall.args);
      if (validated.ok) {
        request.log.info(
          { intent, confidence, provider: provider.name, latencyMs, tool: result.toolCall.name },
          '[TARS] chat'
        );
        return reply.send({
          success: true,
          data: {
            response:             result.text,
            action:               validated.action,
            requiresConfirmation: requiresConfirmation(validated.action),
            chips:                chipsForAction(validated.action, intent),
            intent,
            confidence,
            provider:             provider.name,
            latencyMs,
          },
        });
      }
      // Tool call present but validation failed — log and fall through with text
      request.log.warn(
        { toolName: result.toolCall.name, args: result.toolCall.args },
        '[TARS] tool call validation failed — returning text-only response'
      );
    }

    request.log.info(
      { intent, confidence, provider: provider.name, latencyMs },
      '[TARS] chat'
    );

    return reply.send({
      success: true,
      data: {
        response:             result.text,
        action:               null,
        requiresConfirmation: false,
        chips:                chipsForAction(null, intent),
        intent,
        confidence,
        provider:             provider.name,
        latencyMs,
      },
    });
  } catch (err) {
    return handleError('AIController.chat', err, reply);
  }
}

/**
 * GET /api/ai/briefing
 * Streams the daily briefing as Server-Sent Events.
 * Each event: `data: {"type":"token","token":"<chunk>"}\n\n`
 * Final event: `data: [DONE]\n\n`
 */
export async function briefingHandler(
  _request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {
  let ctx: Awaited<ReturnType<typeof assemblePolarisContext>>;
  try {
    ctx = await assemblePolarisContext();
  } catch (err) {
    return handleError('AIController.briefing', err, reply);
  }

  void reply.raw.writeHead(200, {
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (data: string) => {
    reply.raw.write(`data: ${data}\n\n`);
  };

  try {
    for await (const token of streamBriefing(ctx)) {
      sendEvent(JSON.stringify({ type: 'token', token }));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Briefing stream error';
    sendEvent(JSON.stringify({ type: 'error', message: msg }));
  }

  sendEvent('[DONE]');
  reply.raw.end();
}
