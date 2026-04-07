// src/modules/users/users.service.js
const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      kycStatus: true,
      createdAt: true,
      updatedAt: true,
      wallets: {
        select: { id: true, currency: true, balance: true, status: true },
      },
    },
  });
  if (!user) throw AppError.notFound('User');
  return user;
};

const updateProfile = async (userId, data) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      kycStatus: true,
      updatedAt: true,
    },
  });
  return user;
};

module.exports = { getProfile, updateProfile };
