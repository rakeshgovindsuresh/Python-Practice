// src/utils/asyncWrapper.js

/**
 * Wraps async route handlers to eliminate try/catch boilerplate.
 * Any thrown error is forwarded to Express error middleware.
 */
const asyncWrapper = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncWrapper;
