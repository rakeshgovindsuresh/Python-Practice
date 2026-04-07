// src/modules/transactions/transactions.service.js
const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { transactionQueue } = require('../../queues/transaction.queue');
const { parsePagination, paginatedResponse } = require('../../utils/pagination');
const logger = require('../../config/logger');

const transfer = async ({ senderWalletId, receiverWalletId, amount, description, idempotencyKey, userId }) => {
  // ── Idempotency check ────────────────────────────────────
  const existing = await prisma.transaction.findUnique({ where: { idempotencyKey } });
  if (existing) {
    logger.info('Duplicate request — returning cached transaction', { idempotencyKey });
    return { transaction: existing, duplicate: true };
  }

  // ── Validate sender wallet belongs to user ───────────────
  const senderWallet = await prisma.wallet.findFirst({
    where: { id: senderWalletId, userId },
  });
  if (!senderWallet) throw AppError.notFound('Sender wallet');
  if (senderWallet.status !== 'ACTIVE') throw AppError.badRequest('Sender wallet is not active', 'WALLET_INACTIVE');
  if (senderWallet.balance < amount) throw AppError.unprocessable('Insufficient balance', 'INSUFFICIENT_BALANCE');

  // ── Validate receiver wallet exists ──────────────────────
  const receiverWallet = await prisma.wallet.findUnique({ where: { id: receiverWalletId } });
  if (!receiverWallet) throw AppError.notFound('Receiver wallet');
  if (receiverWallet.status !== 'ACTIVE') throw AppError.badRequest('Receiver wallet is not active', 'WALLET_INACTIVE');
  if (senderWallet.currency !== receiverWallet.currency) {
    throw AppError.unprocessable('Currency mismatch. Both wallets must use the same currency.', 'CURRENCY_MISMATCH');
  }
  if (senderWalletId === receiverWalletId) {
    throw AppError.badRequest('Cannot transfer to the same wallet', 'SAME_WALLET');
  }

  // ── Create transaction record (PENDING) ──────────────────
  const transaction = await prisma.transaction.create({
    data: {
      idempotencyKey,
      senderWalletId,
      receiverWalletId,
      amount,
      currency: senderWallet.currency,
      type: 'TRANSFER',
      status: 'PENDING',
      description: description || 'Wallet transfer',
    },
  });

  // ── Enqueue async processing ─────────────────────────────
  await transactionQueue.add('process-transfer', {
    transactionId: transaction.id,
    senderWalletId,
    receiverWalletId,
    amount,
  });

  logger.info('Transfer queued', { transactionId: transaction.id, amount, currency: senderWallet.currency });
  return { transaction, duplicate: false };
};

const getTransaction = async (id, userId) => {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      OR: [
        { senderWallet: { userId } },
        { receiverWallet: { userId } },
      ],
    },
    include: {
      senderWallet: { select: { id: true, currency: true, userId: true } },
      receiverWallet: { select: { id: true, currency: true, userId: true } },
    },
  });
  if (!transaction) throw AppError.notFound('Transaction');
  return transaction;
};

const getHistory = async (userId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const { status, type, currency, walletId } = query;

  const where = {
    OR: [
      { senderWallet: { userId } },
      { receiverWallet: { userId } },
    ],
    ...(status && { status }),
    ...(type && { type }),
    ...(currency && { currency }),
    ...(walletId && {
      OR: [{ senderWalletId: walletId }, { receiverWalletId: walletId }],
    }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, idempotencyKey: true, senderWalletId: true, receiverWalletId: true,
        amount: true, currency: true, type: true, status: true, description: true,
        processedAt: true, createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return paginatedResponse(transactions, total, page, limit);
};

module.exports = { transfer, getTransaction, getHistory };
