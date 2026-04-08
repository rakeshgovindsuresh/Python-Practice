// tests/unit/transactions.service.test.js

jest.mock('../../src/config/database', () => ({
  transaction: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  wallet: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
}));

jest.mock('../../src/queues/transaction.queue', () => ({
  transactionQueue: { add: jest.fn().mockResolvedValue({ id: 'job-1' }) },
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), http: jest.fn(),
}));

const prisma = require('../../src/config/database');
const { transactionQueue } = require('../../src/queues/transaction.queue');
const transactionsService = require('../../src/modules/transactions/transactions.service');

const mockSenderWallet = {
  id: 'wallet-sender', userId: 'user-1', currency: 'USD', balance: 500, status: 'ACTIVE',
};
const mockReceiverWallet = {
  id: 'wallet-receiver', userId: 'user-2', currency: 'USD', balance: 100, status: 'ACTIVE',
};

describe('TransactionsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('transfer()', () => {
    const basePayload = {
      senderWalletId: 'wallet-sender',
      receiverWalletId: 'wallet-receiver',
      amount: 100,
      idempotencyKey: 'key-123',
      userId: 'user-1',
    };

    it('creates a PENDING transaction and enqueues a job', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(mockSenderWallet);
      prisma.wallet.findUnique.mockResolvedValue(mockReceiverWallet);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx-1', status: 'PENDING', amount: 100,
      });

      const result = await transactionsService.transfer(basePayload);

      expect(result.duplicate).toBe(false);
      expect(result.transaction.status).toBe('PENDING');
      expect(transactionQueue.add).toHaveBeenCalledWith('process-transfer', expect.objectContaining({
        transactionId: 'tx-1',
        amount: 100,
      }));
    });

    it('returns existing transaction on duplicate idempotency key', async () => {
      prisma.transaction.findUnique.mockResolvedValue({ id: 'tx-existing', status: 'COMPLETED' });

      const result = await transactionsService.transfer(basePayload);

      expect(result.duplicate).toBe(true);
      expect(result.transaction.id).toBe('tx-existing');
      expect(transactionQueue.add).not.toHaveBeenCalled();
    });

    it('throws 422 for insufficient balance', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue({ ...mockSenderWallet, balance: 50 });

      await expect(transactionsService.transfer({ ...basePayload, amount: 100 })).rejects.toMatchObject({
        statusCode: 422,
        code: 'INSUFFICIENT_BALANCE',
      });
    });

    it('throws 422 for currency mismatch between wallets', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(mockSenderWallet); // USD
      prisma.wallet.findUnique.mockResolvedValue({ ...mockReceiverWallet, currency: 'EUR' });

      await expect(transactionsService.transfer(basePayload)).rejects.toMatchObject({
        statusCode: 422,
        code: 'CURRENCY_MISMATCH',
      });
    });

    it('throws 400 for same-wallet transfer', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(mockSenderWallet);
      prisma.wallet.findUnique.mockResolvedValue(mockSenderWallet);

      await expect(
        transactionsService.transfer({ ...basePayload, receiverWalletId: 'wallet-sender' })
      ).rejects.toMatchObject({ statusCode: 400, code: 'SAME_WALLET' });
    });

    it('throws 404 if sender wallet not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(transactionsService.transfer(basePayload)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('getHistory()', () => {
    it('returns paginated transaction list', async () => {
      prisma.transaction.findMany.mockResolvedValue([{ id: 'tx-1' }, { id: 'tx-2' }]);
      prisma.transaction.count.mockResolvedValue(2);

      const result = await transactionsService.getHistory('user-1', { page: '1', limit: '10' });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });
  });
});
