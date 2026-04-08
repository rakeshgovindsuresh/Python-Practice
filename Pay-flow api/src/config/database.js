// src/config/database.js
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 200) {
      logger.warn('Slow query detected', {
        query: e.query,
        duration: `${e.duration}ms`,
      });
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message });
});

module.exports = prisma;
