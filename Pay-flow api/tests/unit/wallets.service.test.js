// tests/unit/wallets.service.test.js

jest.mock('../../src/config/database', () => ({
  wallet: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), http: jest.fn(),
}));

const prisma = require('../../src/config/database');
const walletsService = require('../../src/modules/wallets/wallets.service');

describe('WalletsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWallet()', () => {
    it('creates a wallet for a new currency', async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);
      prisma.wallet.create.mockResolvedValue({
        id: 'wallet-1', userId: 'user-1', currency: 'EUR',
        balance: 0, status: 'ACTIVE', createdAt: new Date(),
      });

      const wallet = await walletsService.createWallet('user-1', 'EUR');

      expect(wallet.currency).toBe('EUR');
      expect(prisma.wallet.create).toHaveBeenCalledTimes(1);
    });

    it('throws 409 if wallet for currency already exists', async () => {
      prisma.wallet.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(walletsService.createWallet('user-1', 'USD')).rejects.toMatchObject({
        statusCode: 409,
        code: 'WALLET_EXISTS',
      });
    });
  });

  describe('fundWallet()', () => {
    it('funds wallet and creates a CREDIT transaction atomically', async () => {
      const mockWallet = { id: 'wallet-1', userId: 'user-1', currency: 'USD', status: 'ACTIVE', balance: 100 };
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.$transaction.mockResolvedValue([
        { id: 'tx-1', amount: 500, status: 'COMPLETED' },
        { id: 'wallet-1', balance: 600 },
      ]);

      const result = await walletsService.fundWallet('wallet-1', 'user-1', 500, 'Test deposit');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.transaction).toBeDefined();
      expect(result.wallet).toBeDefined();
    });

    it('throws 404 if wallet not found', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(walletsService.fundWallet('bad-id', 'user-1', 100)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws 400 if wallet is frozen', async () => {
      prisma.wallet.findFirst.mockResolvedValue({
        id: 'wallet-1', userId: 'user-1', currency: 'USD', status: 'FROZEN', balance: 0,
      });

      await expect(walletsService.fundWallet('wallet-1', 'user-1', 100)).rejects.toMatchObject({
        statusCode: 400,
        code: 'WALLET_INACTIVE',
      });
    });
  });

  describe('getWallet()', () => {
    it('returns wallet when found for user', async () => {
      prisma.wallet.findFirst.mockResolvedValue({ id: 'wallet-1', userId: 'user-1', currency: 'USD' });

      const wallet = await walletsService.getWallet('wallet-1', 'user-1');
      expect(wallet.id).toBe('wallet-1');
    });

    it('throws 404 when wallet not found or belongs to another user', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(walletsService.getWallet('wallet-1', 'user-2')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
