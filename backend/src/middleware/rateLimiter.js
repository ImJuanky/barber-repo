const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { message: 'Demasiadas peticiones. Inténtalo de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { loginLimiter, bookingLimiter, apiLimiter };
