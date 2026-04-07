// src/middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');
const config = require('../config');

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP. Please try again later.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  skip: (req) => process.env.NODE_ENV === 'test',
});

module.exports = { rateLimiter, authLimiter };
