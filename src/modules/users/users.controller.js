// src/modules/users/users.controller.js
const usersService = require('./users.service');
const asyncWrapper = require('../../utils/asyncWrapper');
const { sendSuccess } = require('../../utils/response');
const { z } = require('zod');
const validate = require('../../middlewares/validate');

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).trim().optional(),
  lastName: z.string().min(1).max(50).trim().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
});

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile with wallets
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
const getMe = asyncWrapper(async (req, res) => {
  const user = await usersService.getProfile(req.user.id);
  sendSuccess(res, { user });
});

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
const updateMe = asyncWrapper(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { user }, 200, 'Profile updated');
});

module.exports = { getMe, updateMe, updateProfileSchema };
