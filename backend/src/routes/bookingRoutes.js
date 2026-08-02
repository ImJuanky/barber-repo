const express = require('express');
const { body, query, param } = require('express-validator');
const { createBooking, findBookings, cancelBookingPublic } = require('../controllers/bookingController');
const { validate } = require('../middleware/validate');
const { bookingLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/',
  bookingLimiter,
  [
    body('slotId').isInt({ min: 1 }).withMessage('Hueco inválido.'),
    body('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    body('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido.')
      .matches(/^[0-9+\s()-]+$/).withMessage('El teléfono contiene caracteres no válidos.'),
    body('service').isIn(['corte', 'corte_barba']).withMessage('Servicio inválido.')
  ],
  validate,
  createBooking
);

// Buscar mis reservas para poder cancelarlas (público, nombre + teléfono)
router.get('/find',
  bookingLimiter,
  [
    query('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido.'),
    query('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido.')
  ],
  validate,
  findBookings
);

// Cancelar una cita propia (público, exige nombre + teléfono coincidentes)
router.post('/:id/cancel',
  bookingLimiter,
  [
    param('id').isInt({ min: 1 }),
    body('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre inválido.'),
    body('clientPhone').trim().isLength({ min: 6, max: 20 }).withMessage('Teléfono inválido.')
  ],
  validate,
  cancelBookingPublic
);

module.exports = router;
