// src/middlewares/errorHandler.js
const logger = require('../config/logger');

const handlePrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      return { statusCode: 409, message: `Duplicate value for field: ${err.meta?.target?.join(', ')}`, code: 'DUPLICATE_ENTRY' };
    case 'P2025':
      return { statusCode: 404, message: 'Record not found', code: 'NOT_FOUND' };
    case 'P2003':
      return { statusCode: 400, message: 'Foreign key constraint failed', code: 'INVALID_REFERENCE' };
    default:
      return { statusCode: 500, message: 'Database error', code: 'DB_ERROR' };
  }
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // Handle Prisma errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = handlePrismaError(err);
    statusCode = prismaErr.statusCode;
    message = prismaErr.message;
    code = prismaErr.code;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
    });
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
