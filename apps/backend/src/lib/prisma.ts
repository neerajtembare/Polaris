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
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
