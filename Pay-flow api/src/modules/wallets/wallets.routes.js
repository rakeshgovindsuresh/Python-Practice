// src/modules/wallets/wallets.routes.js
const { Router } = require('express');
const controller = require('./wallets.controller');
const authenticate = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const { createWalletSchema, fundWalletSchema } = require('./wallets.schema');

const router = Router();

router.use(authenticate);

router.post('/', validate(createWalletSchema), controller.createWallet);
router.get('/', controller.getWallets);
router.get('/:id', controller.getWallet);
router.post('/:id/fund', validate(fundWalletSchema), controller.fundWallet);

module.exports = router;
