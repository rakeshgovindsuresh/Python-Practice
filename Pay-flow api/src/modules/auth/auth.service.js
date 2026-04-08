// src/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const config = require('../../config');
const AppError = require('../../utils/AppError');
const logger = require('../../config/logger');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ userId, jti: uuidv4() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

const register = async ({ email, password, firstName, lastName, phone }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('Email already registered', 'EMAIL_TAKEN');

  const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      wallets: {
        create: [{ currency: 'USD' }], // Default USD wallet on signup
      },
    },
    select: { id: true, email: true, firstName: true, lastName: true, status: true, kycStatus: true, createdAt: true },
  });

  logger.info('User registered', { userId: user.id, email: user.email });
  return user;
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized('Invalid email or password');

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) throw AppError.unauthorized('Invalid email or password');

  if (user.status === 'SUSPENDED') throw AppError.forbidden('Account suspended. Contact support.');

  const { accessToken, refreshToken } = generateTokens(user.id);

  // Persist refresh token (7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

  logger.info('User logged in', { userId: user.id });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      kycStatus: user.kycStatus,
    },
  };
};

const refresh = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token revoked or expired');
  }

  // Token rotation — revoke old, issue new pair
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { token }, data: { revoked: true } }),
    prisma.refreshToken.create({ data: { userId: decoded.userId, token: newRefreshToken, expiresAt } }),
  ]);

  logger.info('Tokens refreshed', { userId: decoded.userId });
  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (token) => {
  const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
  if (storedToken && !storedToken.revoked) {
    await prisma.refreshToken.update({ where: { token }, data: { revoked: true } });
  }
};

module.exports = { register, login, refresh, logout };
