// src/middlewares/authenticate.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized('Token expired');
      }
      throw AppError.unauthorized('Invalid token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        kycStatus: true,
      },
    });

    if (!user) throw AppError.unauthorized('User no longer exists');
    if (user.status === 'SUSPENDED') throw AppError.forbidden('Account suspended');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
