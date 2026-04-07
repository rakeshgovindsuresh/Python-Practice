// src/middlewares/validate.js
const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Zod schema validation middleware factory.
 * Usage: validate(schema) or validate(schema, 'params')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    const parsed = schema.parse(data);

    if (source === 'body') req.body = parsed;
    else if (source === 'params') req.params = parsed;
    else req.query = parsed;

    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(
        new AppError(
          `Validation failed: ${errors.map((e) => `${e.field} - ${e.message}`).join(', ')}`,
          422,
          'VALIDATION_ERROR'
        )
      );
    }
    next(err);
  }
};

module.exports = validate;
