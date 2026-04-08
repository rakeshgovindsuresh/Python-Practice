// src/server.js
require('dotenv').config();
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const prisma = require('./config/database');
const { startWorker, stopWorker } = require('./queues/transaction.queue');

let server;

const start = async () => {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start BullMQ worker
    startWorker();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`PayFlow API running`, {
        port: config.port,
        env: config.env,
        docs: `http://localhost:${config.port}/api-docs`,
        health: `http://localhost:${config.port}/health`,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

// ─── Graceful Shutdown ─────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await stopWorker();
      await prisma.$disconnect();
      logger.info('Cleanup complete. Exiting.');
      process.exit(0);
    });
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});

start();
