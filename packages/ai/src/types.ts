/**
 * @file ai/types.ts
 * @description Shared types for the AI module.
 * @module @polaris/backend/ai
 */

import type { AIActivityParse } from '@polaris/shared';

/** A single active goal sent as context to the AI */
export interface GoalContext {
  id:         string;
  title:     string;
  targetUnit: string | null;
}

/** A single message in a conversation */
export interface ChatMessage {
  role:    'system' | 'user' | 'assistant';
  content: string;
}

/** Tool/function schema for LLM function calling */
export interface ToolSchema {
  name:        string;
  description: string;
  parameters:  Record<string, unknown>;
}

/** A structured tool call returned by the LLM */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Options for chat() */
export interface ChatOptions {
  tools?:          ToolSchema[];
  temperature?:    number;
  maxTokens?:      number;
  /** Hint to provider to return valid JSON (used by Ollama format param, OpenAI response_format) */
  responseFormat?: 'json';
}

/** Result of a chat() call */
export interface ChatResult {
  text:      string | null;
  toolCall:  ToolCall | null;
  provider:  string;
  latencyMs: number;
}

/** Provider interface — all AI providers implement this */
export interface AIProvider {
  readonly name: string;

  /** Parse a natural-language activity description into structured fields */
  parse(rawInput: string, goals: GoalContext[]): Promise<AIActivityParse>;

  /**
   * Send a conversation to the LLM and get a response.
   * Optionally include tool schemas for function calling.
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;

  /**
   * Stream a response from the LLM as an async iterable of text chunks.
   * Used for SSE streaming in briefings and long responses.
   */
  chatStream(messages: ChatMessage[], options?: Omit<ChatOptions, 'tools' | 'responseFormat'>): AsyncIterable<string>;
}
