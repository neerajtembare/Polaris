/**
 * @file src/lib/__tests__/errors.test.ts
 * @description Unit tests for AppError, notFound, and badRequest helpers.
 * @module @polaris/backend/lib/test
 */

import { describe, it, expect } from 'vitest';
import { AppError, notFound, badRequest } from '../errors.js';

describe('AppError', () => {
  it('should set statusCode, code, and message', () => {
    const err = new AppError(422, 'UNPROCESSABLE', 'Invalid value', { field: 'title' });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE');
    expect(err.message).toBe('Invalid value');
    expect(err.details).toEqual({ field: 'title' });
    expect(err.name).toBe('AppError');
  });

  it('should work without details', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'missing field');
    expect(err.details).toBeUndefined();
  });
});

describe('notFound()', () => {
  it('returns a 404 AppError with NOT_FOUND code', () => {
    const err = notFound('Goal', 'abc-123');

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('Goal');
    expect(err.message).toContain('abc-123');
  });
});

describe('badRequest()', () => {
  it('returns a 400 AppError with BAD_REQUEST code', () => {
    const err = badRequest('Value is required for quantity activities');

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Value is required for quantity activities');
  });

  it('accepts optional details', () => {
    const err = badRequest('Validation failed', { field: 'targetValue' });
    expect(err.details).toEqual({ field: 'targetValue' });
  });
});
