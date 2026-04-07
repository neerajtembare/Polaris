/**
 * @file config/index.ts
 * @description Application configuration loaded from environment variables
 * @module @polaris/backend/config
 *
 * @dependencies
 * - dotenv
 *
 * @relatedFiles
 * - src/index.ts
 */

import 'dotenv/config';

export const config = {
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: process.env['DATABASE_URL'] ?? 'file:./data/polaris.db',
  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',
  /** Comma-separated allowed origins for CORS in production, e.g. "https://app.example.com" */
  corsOrigin: process.env['CORS_ORIGIN'] ?? '',
} as const;
