/**
 * @file lib/prisma.ts
 * @description Singleton Prisma client instance
 * @module @polaris/backend/lib
 *
 * @dependencies
 * - @prisma/client
 *
 * @relatedFiles
 * - prisma/schema.prisma
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // 'query' omitted intentionally — full SQL logs flood the console without adding signal.
  // Set DEBUG_SQL=true to re-enable when diagnosing slow/incorrect queries.
  log: process.env['DEBUG_SQL'] === 'true'
    ? ['query', 'warn', 'error']
    : ['warn', 'error'],
});

export default prisma;
