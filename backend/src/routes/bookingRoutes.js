const express = require('express');
const { body, param } = require('express-validator');
const { createBooking, listMyBookings, cancelMyBooking } = require('../controllers/bookingController');
const { validate } = require('../middleware/validate');
const { requireCustomerAuth } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Reservar un hueco. Requiere sesión de cliente; el nombre y el teléfono se
// toman del cliente autenticado, no del body (evita suplantaciones).
router.post('/',
  requireCustomerAuth,
  bookingLimiter,
  [
    body('slotId').isInt({ min: 1 }).withMessage('Hueco inválido.'),
    body('service').isIn(['corte', 'corte_barba']).withMessage('Servicio inválido.')
  ],
  validate,
  createBooking
);

// Mis reservas futuras confirmadas (requiere sesión de cliente).
router.get('/mine',
  requireCustomerAuth,
  bookingLimiter,
  listMyBookings
);

// Cancelar una cita propia (requiere sesión de cliente y que la reserva le pertenezca).
router.post('/:id/cancel',
  requireCustomerAuth,
  bookingLimiter,
  [param('id').isInt({ min: 1 })],
  validate,
  cancelMyBooking
);

module.exports = router;
