/// <reference types="vite/client" />

/**
 * @file services/api.ts
 * @description Typed HTTP client for the Polaris API.
 *   All API calls in the app go through these helpers — never call fetch directly.
 *   Base URL is read from VITE_API_URL env var, falling back to relative '/api'
 *   (the Vite dev proxy handles forwarding to localhost:3001 in development).
 * @module @polaris/frontend/services
 *
 * @dependencies
 * - @polaris/shared (ApiSuccess, ApiError types)
 *
 * @relatedFiles
 * - src/hooks/useGoals.ts
 * - src/hooks/useActivities.ts
 * - vite.config.ts (proxy config)
 */

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Thrown when the API returns { success: false } or when the network fails.
 * Components and hooks can catch this to show meaningful messages.
 */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** Standard single-item success response */
interface SuccessResponse<T> {
  success: true;
  data: T;
}

/** Paginated list success response (matches backend meta shape) */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/** Standard error response */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

type AnyResponse<T> = SuccessResponse<T> | PaginatedResponse<T> | ErrorResponse;

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '/api';

/**
 * Low-level fetch wrapper. Handles JSON serialization, auth headers (future),
 * and normalizing API errors into ApiRequestError instances.
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: { body?: unknown; params?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  const { body, params } = options;

  // Build URL with optional query string
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  // Parse JSON — even error responses have a JSON body
  const json = (await response.json()) as AnyResponse<T>;

  if (!json.success) {
    const err = json.error;
    throw new ApiRequestError(response.status, err.code, err.message, err.details);
  }

  // Return the full response so callers can access both `data` and `meta`
  return json as unknown as T;
}

// ---------------------------------------------------------------------------
// Public HTTP helpers
// ---------------------------------------------------------------------------

/**
 * GET request. Returns the parsed response body.
 * @example
 *   const res = await api.get<ApiSuccess<Goal[]>>('/goals', { status: 'active' });
 */
export const api = {
  /** Typed GET — returns full response (data + optional meta) */
  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return request<T>('GET', path, {
      ...(params !== undefined && { params }),
    });
  },

  /** Typed POST — sends body, returns full response */
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, { body });
  },

  /** Typed PATCH — sends partial body, returns full response */
  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PATCH', path, { body });
  },

  /** Typed DELETE — no body, returns full response */
  del<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
