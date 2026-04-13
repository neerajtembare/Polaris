/**
 * @file utils/aiLogger.ts
 * @description Append-only logger for AI requests and responses.
 *   Writes TWO files per day so you can review Ollama exchanges easily:
 *
 *   1. <AI_LOG_DIR>/YYYY-MM-DD.jsonl  — machine-readable, one JSON line per call
 *   2. <AI_LOG_DIR>/YYYY-MM-DD.txt    — human-readable, formatted for prompt review
 *
 *   The .txt file is what to read when fine-tuning prompts.
 *   It shows the exact system prompt, user prompt, and raw Ollama response
 *   for every call, separated by dividers.
 *
 *   Set AI_LOG_DIR env var to override the directory (default: <cwd>/ai-logs).
 *   The directory is created automatically if it does not exist.
 *
 * @module @polaris/ai/utils
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface AiLogEntry {
  ts:           string;
  provider:     string;
  operation:    string;
  input:        string;
  systemPrompt: string;
  userPrompt:   string;
  rawResponse:  string;
  parsed:       unknown;
  elapsedMs:    number;
  error?:       string;
}

function getLogDir(): string {
  return process.env['AI_LOG_DIR'] ?? join(process.cwd(), 'ai-logs');
}

function todayBase(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Human-readable pretty-printer
// ---------------------------------------------------------------------------

const DIVIDER = '═'.repeat(80);
const THIN    = '─'.repeat(80);

function formatPretty(entry: AiLogEntry): string {
  const status = entry.error
    ? `❌  FAILED — ${entry.error}`
    : '✅  SUCCESS';

  const parsedBlock = entry.parsed
    ? JSON.stringify(entry.parsed, null, 2)
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n')
    : '    (null — parse failed or mock provider)';

  const lines: string[] = [
    '',
    DIVIDER,
    `  ${entry.ts.replace('T', ' ').slice(0, 19)}  |  ${entry.provider.toUpperCase()}  |  ${entry.operation}  |  ${entry.elapsedMs}ms`,
    DIVIDER,
    '',
    '── USER INPUT ──────────────────────────────────────────────────────────────────',
    `  "${entry.input}"`,
    '',
    '── SYSTEM PROMPT SENT ──────────────────────────────────────────────────────────',
    entry.systemPrompt
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n'),
    '',
    '── USER PROMPT SENT ────────────────────────────────────────────────────────────',
    entry.userPrompt
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n'),
    '',
    '── RAW RESPONSE FROM OLLAMA ────────────────────────────────────────────────────',
    entry.rawResponse
      ? `  ${entry.rawResponse}`
      : '  (empty)',
    '',
    '── PARSED RESULT ───────────────────────────────────────────────────────────────',
    parsedBlock,
    '',
    `── STATUS: ${status}`,
    '',
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Log one AI exchange to both JSONL (machine) and TXT (human-readable) files.
 * Silently swallows write errors so logging never crashes the AI pipeline.
 */
export function logAiExchange(entry: AiLogEntry): void {
  try {
    const dir  = getLogDir();
    mkdirSync(dir, { recursive: true });
    const base = todayBase();

    // 1. Machine-readable JSONL (one line per entry — good for grep/jq)
    appendFileSync(join(dir, `${base}.jsonl`), JSON.stringify(entry) + '\n', 'utf8');

    // 2. Human-readable TXT (easy to read when reviewing / fine-tuning prompts)
    appendFileSync(join(dir, `${base}.txt`), formatPretty(entry), 'utf8');
  } catch {
    // Intentionally silent — logging must never break the AI pipeline
  }
}
