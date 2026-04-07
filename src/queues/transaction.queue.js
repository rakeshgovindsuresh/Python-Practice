// src/queues/transaction.queue.js
const { Queue, Worker } = require('bullmq');
const redis = require('../config/redis');
const prisma = require('../config/database');
const logger = require('../config/logger');

const QUEUE_NAME = 'transactions';

// ─── Queue ──────────────────────────────────────────────────
const transactionQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// ─── Worker ─────────────────────────────────────────────────
const processTransfer = async (job) => {
  const { transactionId, senderWalletId, receiverWalletId, amount } = job.data;
  logger.info('Processing transaction', { transactionId, jobId: job.id });

  try {
    // Mark as PROCESSING
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'PROCESSING' },
    });

    // Fetch wallets
    const senderWallet = await prisma.wallet.findUnique({ where: { id: senderWalletId } });
    const receiverWallet = await prisma.wallet.findUnique({ where: { id: receiverWalletId } });

    if (!senderWallet || senderWallet.status !== 'ACTIVE') {
      throw new Error('Sender wallet not available');
    }
    if (!receiverWallet || receiverWallet.status !== 'ACTIVE') {
      throw new Error('Receiver wallet not available');
    }
    if (senderWallet.balance < amount) {
      throw new Error('Insufficient balance');
    }
    if (senderWallet.currency !== receiverWallet.currency) {
      throw new Error('Currency mismatch between wallets');
    }

    // Atomic debit/credit
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: senderWalletId },
        data: { balance: { decrement: amount } },
      }),
      prisma.wallet.update({
        where: { id: receiverWalletId },
        data: { balance: { increment: amount } },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      }),
    ]);

    logger.info('Transaction completed', { transactionId });
  } catch (err) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'FAILED', failureReason: err.message },
    });
    logger.error('Transaction failed', { transactionId, error: err.message });
    throw err; // Re-throw so BullMQ marks job as failed
  }
};

let worker;

const startWorker = () => {
  worker = new Worker(QUEUE_NAME, processTransfer, {
    connection: redis,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id, transactionId: job.data.transactionId });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', { jobId: job?.id, error: err.message });
  });

  logger.info('Transaction worker started');
  return worker;
};

const stopWorker = async () => {
  if (worker) await worker.close();
};

module.exports = { transactionQueue, startWorker, stopWorker };
