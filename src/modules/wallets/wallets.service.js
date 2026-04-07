// src/modules/wallets/wallets.service.js
const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../config/logger');

const createWallet = async (userId, currency) => {
  const existing = await prisma.wallet.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  if (existing) throw AppError.conflict(`You already have a ${currency} wallet`, 'WALLET_EXISTS');

  const wallet = await prisma.wallet.create({
    data: { userId, currency },
    select: { id: true, userId: true, currency: true, balance: true, status: true, createdAt: true },
  });
  logger.info('Wallet created', { walletId: wallet.id, userId, currency });
  return wallet;
};

const getWallet = async (walletId, userId) => {
  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
    select: { id: true, userId: true, currency: true, balance: true, status: true, createdAt: true, updatedAt: true },
  });
  if (!wallet) throw AppError.notFound('Wallet');
  return wallet;
};

const getUserWallets = async (userId) => {
  return prisma.wallet.findMany({
    where: { userId },
    select: { id: true, currency: true, balance: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
};

const fundWallet = async (walletId, userId, amount, description) => {
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) throw AppError.notFound('Wallet');
  if (wallet.status !== 'ACTIVE') throw AppError.badRequest('Wallet is not active', 'WALLET_INACTIVE');

  const idempotencyKey = uuidv4();

  // Atomic: create transaction record + update balance
  const [transaction, updatedWallet] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        idempotencyKey,
        receiverWalletId: walletId,
        amount,
        currency: wallet.currency,
        type: 'CREDIT',
        status: 'COMPLETED',
        description: description || 'Wallet funded',
        processedAt: new Date(),
      },
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } },
      select: { id: true, currency: true, balance: true },
    }),
  ]);

  logger.info('Wallet funded', { walletId, amount, transactionId: transaction.id });
  return { transaction, wallet: updatedWallet };
};

module.exports = { createWallet, getWallet, getUserWallets, fundWallet };
