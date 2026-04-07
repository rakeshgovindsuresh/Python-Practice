// src/modules/users/users.routes.js
const { Router } = require('express');
const { getMe, updateMe, updateProfileSchema } = require('./users.controller');
const authenticate = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', validate(updateProfileSchema), updateMe);

module.exports = router;
