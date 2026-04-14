/**
 * @file tars/briefing.ts
 * @description Startup briefing — assembles prompt from PolarisContext and
 *   streams the response via provider.chatStream().
 *   Called by GET /api/ai/briefing in the backend controller.
 * @module @polaris/ai/tars
 *
 * @dependencies
 * - packages/ai/src/providers/index.ts
 * - packages/ai/src/prompts/briefing.prompt.ts
 *
 * @relatedFiles
 * - apps/backend/src/controllers/ai.controller.ts (briefingHandler)
 * - packages/shared/src/types/ai.ts (PolarisContext)
 */

import type { PolarisContext } from '@polaris/shared';
import { getProvider } from '../providers/index.js';
import { BRIEFING_SYSTEM_PROMPT, buildBriefingPrompt } from '../prompts/briefing.prompt.js';

/**
 * Stream a personalised startup briefing from PolarisContext.
 * Yields text chunks — intended for Server-Sent Events.
 *
 * Usage (in SSE handler):
 *   for await (const chunk of streamBriefing(ctx)) {
 *     sendEvent(JSON.stringify({ type: 'token', token: chunk }));
 *   }
 */
export async function* streamBriefing(ctx: PolarisContext): AsyncIterable<string> {
  const provider = getProvider();
  const userPrompt = buildBriefingPrompt(ctx);

  if (provider.name === 'mock') {
    // Mock: synthesize a simple briefing from context
    yield* mockBriefing(ctx);
    return;
  }

  yield* provider.chatStream(
    [
      { role: 'system', content: BRIEFING_SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    { temperature: 0.6, maxTokens: 300 }
  );
}

// ---------------------------------------------------------------------------
// Mock briefing (no LLM call)
// ---------------------------------------------------------------------------

async function* mockBriefing(ctx: PolarisContext): AsyncIterable<string> {
  const parts: string[] = [];

  if (ctx.currentStreak > 1) {
    parts.push(`${ctx.currentStreak}-day streak. `);
  }

  if (ctx.activeGoals.length > 0) {
    const top = ctx.activeGoals[0]!;
    parts.push(`Top goal: "${top.title}" at ${top.progress}%. `);
  }

  if (ctx.recentActivities.length > 0) {
    parts.push(`Last logged: "${ctx.recentActivities[0]!.title}". `);
  }

  parts.push(`Log something today to keep your momentum.`);

  for (const chunk of parts) {
    yield chunk;
    // Small delay to simulate streaming
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
}
