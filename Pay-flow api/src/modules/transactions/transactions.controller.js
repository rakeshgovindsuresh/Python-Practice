// src/modules/transactions/transactions.controller.js
const transactionsService = require('./transactions.service');
const asyncWrapper = require('../../utils/asyncWrapper');
const { sendSuccess, sendCreated } = require('../../utils/response');
const AppError = require('../../utils/AppError');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Payment transfers and transaction history
 */

/**
 * @swagger
 * /api/v1/transactions/transfer:
 *   post:
 *     summary: Initiate a wallet-to-wallet transfer (idempotent)
 *     tags: [Transactions]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema: { type: string }
 *         description: Unique key to prevent duplicate transfers (UUID recommended)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderWalletId, receiverWalletId, amount]
 *             properties:
 *               senderWalletId: { type: string, format: uuid }
 *               receiverWalletId: { type: string, format: uuid }
 *               amount: { type: number, example: 50.00 }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Transfer queued successfully
 *       200:
 *         description: Duplicate request — existing transaction returned
 *       422:
 *         description: Insufficient balance or currency mismatch
 */
const transfer = asyncWrapper(async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    throw AppError.badRequest('Idempotency-Key header is required', 'MISSING_IDEMPOTENCY_KEY');
  }

  const { transaction, duplicate } = await transactionsService.transfer({
    ...req.body,
    idempotencyKey,
    userId: req.user.id,
  });

  if (duplicate) {
    return sendSuccess(res, { transaction }, 200, 'Duplicate request — existing transaction returned');
  }
  sendCreated(res, { transaction }, 'Transfer queued for processing');
});

/**
 * @swagger
 * /api/v1/transactions/history:
 *   get:
 *     summary: Get paginated transaction history
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, PROCESSING, COMPLETED, FAILED, REVERSED] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [CREDIT, DEBIT, TRANSFER] }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [USD, EUR, GBP, NGN] }
 *       - in: query
 *         name: walletId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated transaction list
 */
const getHistory = asyncWrapper(async (req, res) => {
  const result = await transactionsService.getHistory(req.user.id, req.query);
  sendSuccess(res, result);
});

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get a single transaction by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
const getTransaction = asyncWrapper(async (req, res) => {
  const transaction = await transactionsService.getTransaction(req.params.id, req.user.id);
  sendSuccess(res, { transaction });
});

module.exports = { transfer, getHistory, getTransaction };
