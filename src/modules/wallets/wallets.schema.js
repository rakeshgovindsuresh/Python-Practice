// src/modules/wallets/wallets.schema.js
const { z } = require('zod');

const createWalletSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN'], { errorMap: () => ({ message: 'Currency must be USD, EUR, GBP, or NGN' }) }),
});

const fundWalletSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(100000, 'Maximum single deposit is 100,000')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  description: z.string().max(255).optional(),
});

module.exports = { createWalletSchema, fundWalletSchema };
