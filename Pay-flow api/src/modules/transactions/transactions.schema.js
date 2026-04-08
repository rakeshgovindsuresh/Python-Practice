// src/modules/transactions/transactions.schema.js
const { z } = require('zod');

const transferSchema = z.object({
  senderWalletId: z.string().uuid('Invalid sender wallet ID'),
  receiverWalletId: z.string().uuid('Invalid receiver wallet ID'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be positive')
    .max(1000000, 'Maximum transfer amount is 1,000,000')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  description: z.string().max(255).optional(),
});

const historyQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REVERSED']).optional(),
  type: z.enum(['CREDIT', 'DEBIT', 'TRANSFER']).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN']).optional(),
  walletId: z.string().uuid().optional(),
});

module.exports = { transferSchema, historyQuerySchema };
