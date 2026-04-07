/**
 * @file vitest.config.ts
 * @description Vitest configuration for frontend component and hook tests.
 * @module @polaris/frontend/test
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**', 'src/hooks/**', 'src/services/**'],
      thresholds: {
        lines:     50,
        functions: 50,
        branches:  40,
        statements: 50,
      },
    },
  },
});
