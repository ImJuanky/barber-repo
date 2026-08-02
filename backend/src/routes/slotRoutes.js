const express = require('express');
const { query } = require('express-validator');
const { getAvailableSlots, getAvailabilityByMonth } = require('../controllers/slotController');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/',
  [
    query('date').optional().isISO8601().withMessage('Fecha inválida.'),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601()
  ],
  validate,
  getAvailableSlots
);

router.get('/availability',
  [query('month').matches(/^\d{4}-\d{2}$/).withMessage('Formato esperado: YYYY-MM.')],
  validate,
  getAvailabilityByMonth
);

module.exports = router;
