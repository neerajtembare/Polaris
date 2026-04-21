/**
 * @file ai/providers/mock.ts
 * @description Keyword-based mock AI provider. No API key, no network.
 *   Simulates activity parsing for development and zero-config usage.
 * @module @polaris/backend/ai
 */

import type { ActivityType, AIActivityParse, UserIntent } from '@polaris/shared';
import type { AIProvider, GoalContext, ChatMessage, ChatOptions, ChatResult } from '../types.js';

// ---------------------------------------------------------------------------
// Word-to-number normalization
// Converts English word-form numbers and fractional phrases into digits
// so that downstream regex patterns like /(\d+)\s*hours?/ match correctly.
// Handles: "two hours", "an hour", "half an hour", "one and a half hours", etc.
// ---------------------------------------------------------------------------

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};

/**
 * Normalizes written-form numbers in a string to their digit equivalents.
 * Examples:
 *   "two hours"           → "2 hours"
 *   "an hour"             → "1 hour"
 *   "half an hour"        → "0.5 hours"
 *   "one and a half hours"→ "1.5 hours"
 *   "twenty pages"        → "20 pages"
 */
function normalizeWrittenNumbers(input: string): string {
  let s = input.toLowerCase();

  // "half an hour" / "half an hour" → 0.5 hours (must come before other replacements)
  s = s.replace(/\bhalf\s+(?:an?\s+)?hour/g, '0.5 hours');

  // "a/an" before a unit → 1
  s = s.replace(/\ba\b(?=\s+(?:hour|minute|min|km|mile|page|book|chapter|rep|set|session|lesson))/g, '1');
  s = s.replace(/\ban\b(?=\s+(?:hour|minute))/g, '1');

  // "X and a half" → X.5 (e.g. "one and a half" → "1.5")
  s = s.replace(/\b(\w+)\s+and\s+a\s+half\b/g, (_match, word) => {
    const n = WORD_NUMBERS[word];
    return n !== undefined ? String(n + 0.5) : _match;
  });

  // Simple word numbers: "two", "three", etc.
  s = s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/g, (word) => {
    return String(WORD_NUMBERS[word] ?? word);
  });

  return s;
}

/**
 * Simulates AI parsing by matching common keywords.
 * Confidence is set to 0.7 for partial matches and 0.9 for strong matches.
 * This is the default provider and always available.
 */
export class MockProvider implements AIProvider {
  readonly name = 'mock';

  async parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse> {
    // Normalize word-form numbers before pattern matching
    const lower = normalizeWrittenNumbers(rawInput.toLowerCase());

    // ── Intent detection first ───────────────────────────────────────────────
    const intent = this.detectIntent(lower);

    type _ParsedFields = { activityType: ActivityType; value: number | null; unit: string | null };
    const fields = this.extractFields(lower);

    // Use original (non-normalized) input for goal matching so word-form terms like "sleep" still match
    const lowerOriginal = rawInput.toLowerCase();
    const { goalId, goalTitle, confidence } = this.matchGoal(lowerOriginal, goals, fields.unit);

    const title = this.buildTitle(rawInput);

    return {
      intent,
      title,
      activityType:       fields.activityType,
      value:              fields.value,
      unit:               fields.unit,
      suggestedGoalId:    goalId,
      suggestedGoalTitle: goalTitle,
      confidence:         intent === 'create_goal' ? 0.88 : confidence,
      provider:           this.name,
    };
  }

  /**
   * Detect user intent: are they logging something they did, creating a goal,
   * or asking a question?
   */
  private detectIntent(lower: string): UserIntent {
    const goalCreationPhrases = [
      'want to', 'want a goal', 'set a goal', 'create a goal', 'make a goal',
      'i plan to', 'my goal is', "i'm trying to", 'i am trying to',
      'i want to start', 'help me track', 'track my', 'i should',
      'i need to', 'long term goal', 'short term goal', 'goal to',
      'set a target', 'commit to', 'starting to',
    ];
    if (goalCreationPhrases.some((p) => lower.includes(p))) return 'create_goal';

    const queryPhrases = [
      'how am i', 'how did i', 'what is my', "what's my", 'show me',
      'how much', 'am i on track', 'my progress', 'my streak',
    ];
    if (queryPhrases.some((p) => lower.includes(p))) return 'query';

    return 'log_activity';
  }

  private extractFields(lower: string): { activityType: ActivityType; value: number | null; unit: string | null } {
    // ── Multi-segment time ranges: sum ALL "Xam → Yam" pairs in the input ────
    // "went to bed at 5pm woke at 8pm then slept again at 11pm woke at 5am" → 3+6=9h
    const toMinutes = (h: string, m: string | undefined, period: string): number => {
      let hours = parseInt(h, 10) % 12;
      if (period.toLowerCase() === 'pm') hours += 12;
      return hours * 60 + (m ? parseInt(m, 10) : 0);
    };
    const timeRangeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm).*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi;
    let totalMinutes = 0;
    let segmentCount = 0;
    for (const tr of [...lower.matchAll(timeRangeRegex)]) {
      const startMin = toMinutes(tr[1] ?? '0', tr[2], tr[3] ?? 'am');
      const endMin   = toMinutes(tr[4] ?? '0', tr[5], tr[6] ?? 'am');
      const diffMin  = endMin >= startMin ? endMin - startMin : endMin + 24 * 60 - startMin;
      if (diffMin > 0 && diffMin <= 16 * 60) { totalMinutes += diffMin; segmentCount++; }
    }
    if (segmentCount > 0) {
      return { activityType: 'duration', value: parseFloat((totalMinutes / 60).toFixed(2)), unit: 'hours' };
    }

    const patterns: Array<{ regex: RegExp; unit: string; activityType: ActivityType; multiplier?: number }> = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:pages?|pg)/,              unit: 'pages',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:books?)/,                unit: 'books',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:chapters?)/,             unit: 'chapters', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*km/,                        unit: 'km',      activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*miles?/,                    unit: 'miles',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:steps?)/,                unit: 'steps',   activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/,           unit: 'hours',   activityType: 'duration' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)/,        unit: 'min',     activityType: 'duration', multiplier: 1 / 60 },
      { regex: /[₹$](\d+(?:,\d+)*(?:\.\d+)?)/,                unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees?|inr)/,  unit: '₹',       activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:reps?)/,                 unit: 'reps',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sets?)/,                 unit: 'sets',    activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:sessions?)/,              unit: 'sessions', activityType: 'quantity' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:lessons?)/,              unit: 'lessons', activityType: 'quantity' },
    ];

    for (const { regex, unit, activityType, multiplier } of patterns) {
      const m = lower.match(regex);
      if (m) {
        const raw = parseFloat((m[1] as string).replace(/,/g, ''));
        const value = multiplier ? parseFloat((raw * multiplier).toFixed(2)) : raw;
        return { activityType, value, unit };
      }
    }

    const completionWords = ['meditat', 'yoga', 'completed', 'finished', 'done', 'journal'];
    if (completionWords.some((w) => lower.includes(w))) {
      return { activityType: 'completion', value: null, unit: null };
    }

    return { activityType: 'quantity', value: null, unit: null };
  }

  private matchGoal(
    lower: string,
    goals: GoalContext[],
    detectedUnit: string | null
  ): { goalId: string | null; goalTitle: string | null; confidence: number } {
    if (goals.length === 0) return { goalId: null, goalTitle: null, confidence: 0.6 };

    type ScoredGoal = { goal: GoalContext; score: number };
    const scored: ScoredGoal[] = goals.map((goal) => {
      let score = 0;
      const titleWords = goal.title.toLowerCase().split(/\W+/);

      if (detectedUnit && goal.targetUnit) {
        if (goal.targetUnit.toLowerCase() === detectedUnit.toLowerCase()) score += 40;
      }

      for (const word of titleWords) {
        if (word.length >= 4 && lower.includes(word)) score += 15;
      }

      const domainMap: Array<{ keywords: string[]; goalKeywords: string[] }> = [
        { keywords: ['read', 'book', 'page', 'chapter'],                              goalKeywords: ['read', 'book'] },
        { keywords: ['run', 'jog', 'walk', 'km', 'mile', 'step'],                     goalKeywords: ['run', 'km', 'walk'] },
        { keywords: ['save', 'rupee', '₹', '$', 'money', 'invest'],                   goalKeywords: ['save', 'money', '₹'] },
        { keywords: ['study', 'python', 'code', 'learn', 'lesson'],                   goalKeywords: ['study', 'python', 'learn', 'code'] },
        { keywords: ['gym', 'workout', 'train', 'lift', 'exercise'],                  goalKeywords: ['gym', 'workout', 'fit'] },
        { keywords: ['sleep', 'slept', 'nap', 'napped', 'rest', 'rested', 'hours'],   goalKeywords: ['sleep', 'nap', 'rest'] },
        { keywords: ['meditat', 'mindful', 'breath'],                                  goalKeywords: ['meditat', 'mindful'] },
      ];
      const goalLower = goal.title.toLowerCase();
      for (const { keywords, goalKeywords } of domainMap) {
        const inputMatch = keywords.some((k) => lower.includes(k));
        const goalMatch  = goalKeywords.some((k) => goalLower.includes(k));
        if (inputMatch && goalMatch) score += 25;
      }

      return { goal, score };
    });

    const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

    if (best.score === 0) return { goalId: null, goalTitle: null, confidence: 0.55 };

    const confidence = best.score >= 40 ? 0.9 : best.score >= 20 ? 0.75 : 0.6;
    return { goalId: best.goal.id, goalTitle: best.goal.title, confidence };
  }

  private buildTitle(rawInput: string): string {
    const trimmed = rawInput.trim();
    if (!trimmed) return 'Activity';
    return (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)).slice(0, 200);
  }

  // ---------------------------------------------------------------------------
  // chat() / chatStream() — canned responses for testing and zero-config usage
  // ---------------------------------------------------------------------------

  async chat(messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResult> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const input    = lastUser?.content ?? '';
    const lower    = input.toLowerCase();

    let text: string;
    if (/streak|progress|doing|goals|activities/i.test(lower)) {
      text = "You're making progress. Keep logging your activities consistently.";
    } else if (/coach|advice|suggest/i.test(lower)) {
      text = "Set a small daily target. Consistency beats intensity every time.";
    } else if (/briefing|today|plan/i.test(lower)) {
      text = "Good day. Your active goals are on track. Focus on what matters most today.";
    } else {
      text = "Understood. Stay consistent and keep tracking your progress.";
    }

    return { text, toolCall: null, provider: this.name, latencyMs: 0 };
  }

  async *chatStream(
    messages: ChatMessage[],
    _options?: Omit<ChatOptions, 'tools' | 'responseFormat'>
  ): AsyncIterable<string> {
    const result = await this.chat(messages);
    if (result.text) yield result.text;
  }
}
