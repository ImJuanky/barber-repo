const express = require('express');
const { body } = require('express-validator');
const { login, me } = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAdminAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('Email inválido.'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
  ],
  validate,
  login
);

router.get('/me', requireAdminAuth, me);

module.exports = router;
