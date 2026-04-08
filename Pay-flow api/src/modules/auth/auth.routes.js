// src/modules/auth/auth.routes.js
const { Router } = require('express');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validate');
const authenticate = require('../../middlewares/authenticate');
const { authLimiter } = require('../../middlewares/rateLimiter');
const { registerSchema, loginSchema, refreshSchema } = require('./auth.schema');

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', authenticate, validate(refreshSchema), controller.logout);

module.exports = router;
