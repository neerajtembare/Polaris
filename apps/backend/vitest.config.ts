/**
 * @file vitest.config.ts
 * @description Vitest configuration for backend unit and integration tests.
 * @module @polaris/backend/test
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/lib/**'],
      thresholds: {
        lines:     60,
        functions: 60,
        branches:  50,
        statements: 60,
      },
    },
  },
});
