// src/modules/wallets/wallets.controller.js
const walletsService = require('./wallets.service');
const asyncWrapper = require('../../utils/asyncWrapper');
const { sendSuccess, sendCreated } = require('../../utils/response');

/**
 * @swagger
 * tags:
 *   name: Wallets
 *   description: Multi-currency wallet management
 */

/**
 * @swagger
 * /api/v1/wallets:
 *   post:
 *     summary: Create a new wallet for a currency
 *     tags: [Wallets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currency]
 *             properties:
 *               currency:
 *                 type: string
 *                 enum: [USD, EUR, GBP, NGN]
 *     responses:
 *       201:
 *         description: Wallet created
 *       409:
 *         description: Wallet for this currency already exists
 */
const createWallet = asyncWrapper(async (req, res) => {
  const wallet = await walletsService.createWallet(req.user.id, req.body.currency);
  sendCreated(res, { wallet }, 'Wallet created');
});

/**
 * @swagger
 * /api/v1/wallets:
 *   get:
 *     summary: Get all wallets for the current user
 *     tags: [Wallets]
 *     responses:
 *       200:
 *         description: List of wallets
 */
const getWallets = asyncWrapper(async (req, res) => {
  const wallets = await walletsService.getUserWallets(req.user.id);
  sendSuccess(res, { wallets, count: wallets.length });
});

/**
 * @swagger
 * /api/v1/wallets/{id}:
 *   get:
 *     summary: Get a specific wallet by ID
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Wallet details
 *       404:
 *         description: Wallet not found
 */
const getWallet = asyncWrapper(async (req, res) => {
  const wallet = await walletsService.getWallet(req.params.id, req.user.id);
  sendSuccess(res, { wallet });
});

/**
 * @swagger
 * /api/v1/wallets/{id}/fund:
 *   post:
 *     summary: Fund a wallet (simulate deposit)
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 500.00 }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Wallet funded successfully
 */
const fundWallet = asyncWrapper(async (req, res) => {
  const result = await walletsService.fundWallet(
    req.params.id,
    req.user.id,
    req.body.amount,
    req.body.description
  );
  sendSuccess(res, result, 200, 'Wallet funded successfully');
});

module.exports = { createWallet, getWallets, getWallet, fundWallet };
