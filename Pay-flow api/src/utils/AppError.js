// src/utils/AppError.js

class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factories
AppError.badRequest = (message, code) => new AppError(message, 400, code);
AppError.unauthorized = (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED');
AppError.forbidden = (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN');
AppError.notFound = (resource = 'Resource') => new AppError(`${resource} not found`, 404, 'NOT_FOUND');
AppError.conflict = (message, code) => new AppError(message, 409, code);
AppError.unprocessable = (message, code) => new AppError(message, 422, code);
AppError.tooManyRequests = () => new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
AppError.internal = (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR');

module.exports = AppError;
