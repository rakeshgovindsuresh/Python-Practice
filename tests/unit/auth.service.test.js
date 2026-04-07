// tests/unit/auth.service.test.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies before imports
jest.mock('../../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
}));

const prisma = require('../../src/config/database');
const authService = require('../../src/modules/auth/auth.service');

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── register ──────────────────────────────────────────────
  describe('register()', () => {
    const payload = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('creates a new user and returns sanitized data', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        status: 'ACTIVE',
        kycStatus: 'UNVERIFIED',
        createdAt: new Date(),
      });

      const user = await authService.register(payload);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: payload.email } });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(user.email).toBe(payload.email);
      expect(user.passwordHash).toBeUndefined(); // never expose hash
    });

    it('throws 409 if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(authService.register(payload)).rejects.toMatchObject({
        statusCode: 409,
        code: 'EMAIL_TAKEN',
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ─── login ─────────────────────────────────────────────────
  describe('login()', () => {
    it('returns tokens and user on valid credentials', async () => {
      const hash = await bcrypt.hash('Password123!', 1);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hash,
        status: 'ACTIVE',
        firstName: 'Jane',
        lastName: 'Doe',
        kycStatus: 'UNVERIFIED',
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({ email: 'test@example.com', password: 'Password123!' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws 401 for invalid password', async () => {
      const hash = await bcrypt.hash('CorrectPassword1!', 1);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hash,
        status: 'ACTIVE',
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword1!' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'Password123!' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 403 for suspended accounts', async () => {
      const hash = await bcrypt.hash('Password123!', 1);
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hash,
        status: 'SUSPENDED',
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'Password123!' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ─── refresh ───────────────────────────────────────────────
  describe('refresh()', () => {
    it('issues new token pair and revokes old refresh token', async () => {
      const secret = 'dev_refresh_secret_payflow_2024';
      process.env.JWT_REFRESH_SECRET = secret;

      const token = jwt.sign({ userId: 'uuid-1', jti: 'abc' }, secret, { expiresIn: '7d' });

      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        revoked: false,
        expiresAt: new Date(Date.now() + 1000000),
      });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await authService.refresh(token);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws 401 for a revoked refresh token', async () => {
      const secret = 'dev_refresh_secret_payflow_2024';
      process.env.JWT_REFRESH_SECRET = secret;

      const token = jwt.sign({ userId: 'uuid-1', jti: 'abc' }, secret, { expiresIn: '7d' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        token,
        revoked: true,
        expiresAt: new Date(Date.now() + 1000000),
      });

      await expect(authService.refresh(token)).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 for a completely invalid token string', async () => {
      await expect(authService.refresh('not.a.valid.token')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // ─── logout ────────────────────────────────────────────────
  describe('logout()', () => {
    it('revokes an active refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ token: 'tok', revoked: false });
      prisma.refreshToken.update.mockResolvedValue({});

      await authService.logout('tok');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'tok' },
        data: { revoked: true },
      });
    });

    it('does nothing if token is already revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ token: 'tok', revoked: true });

      await authService.logout('tok');

      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });
});
