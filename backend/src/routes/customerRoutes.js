const express = require('express');
const { body } = require('express-validator');
const { register, login, me } = require('../controllers/customerController');
const { validate } = require('../middleware/validate');
const { requireCustomerAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { isValidSpanishMobile } = require('../utils/phone');

const router = express.Router();

const phoneValidator = body('phone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido.')
  .custom((value) => {
    if (!isValidSpanishMobile(value)) {
      throw new Error('Introduce un número de móvil español válido (ej. 612345678).');
    }
    return true;
  });

router.post('/register',
  loginLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    phoneValidator,
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
  ],
  validate,
  register
);

router.post('/login',
  loginLimiter,
  [
    phoneValidator,
    body('password').notEmpty().withMessage('Introduce tu contraseña.')
  ],
  validate,
  login
);

router.get('/me', requireCustomerAuth, me);

module.exports = router;
