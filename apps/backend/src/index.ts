/**
 * @file index.ts
 * @description Backend entry point — starts the Fastify server
 * @module @polaris/backend
 *
 * @dependencies
 * - fastify
 * - dotenv
 *
 * @relatedFiles
 * - src/app.ts
 * - src/config/index.ts
 */

import { buildApp } from './app.js';
import { config } from './config/index.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`Server running on http://localhost:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
