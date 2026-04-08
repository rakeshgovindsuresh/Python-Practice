// src/modules/transactions/transactions.routes.js
const { Router } = require('express');
const controller = require('./transactions.controller');
const authenticate = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const { transferSchema, historyQuerySchema } = require('./transactions.schema');

const router = Router();

router.use(authenticate);

router.post('/transfer', validate(transferSchema), controller.transfer);
router.get('/history', validate(historyQuerySchema, 'query'), controller.getHistory);
router.get('/:id', controller.getTransaction);

module.exports = router;
