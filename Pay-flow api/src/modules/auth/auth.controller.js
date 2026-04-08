// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const asyncWrapper = require('../../utils/asyncWrapper');
const { sendSuccess, sendCreated } = require('../../utils/response');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & token management
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, example: 'Password123!' }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string, example: '+447911123456' }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already taken
 *       422:
 *         description: Validation error
 */
const register = asyncWrapper(async (req, res) => {
  const user = await authService.register(req.body);
  sendCreated(res, { user }, 'Registration successful');
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login and receive tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns access + refresh tokens
 *       401:
 *         description: Invalid credentials
 */
const login = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 200, 'Login successful');
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate refresh token and get new access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
const refresh = asyncWrapper(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  sendSuccess(res, tokens, 200, 'Tokens refreshed');
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and revoke refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
const logout = asyncWrapper(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  sendSuccess(res, null, 200, 'Logged out successfully');
});

module.exports = { register, login, refresh, logout };
