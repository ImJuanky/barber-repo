const express = require('express');
const { body, param } = require('express-validator');
const { requireAdminAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const slotController = require('../controllers/slotController');
const bookingController = require('../controllers/bookingController');
const calendarController = require('../controllers/calendarController');
const statsController = require('../controllers/statsController');

const router = express.Router();

router.use(requireAdminAuth);

// Huecos
router.get('/slots', slotController.listAllSlots);
router.post('/slots',
  [
    body('date').isISO8601().withMessage('Fecha inválida.'),
    body('time').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('times').optional().isArray()
  ],
  validate,
  slotController.createSlots
);
router.post('/slots/bulk',
  [body('slots').isArray({ min: 1 }).withMessage('Debes indicar al menos un hueco.')],
  validate,
  slotController.createSlotsBulk
);
router.put('/slots/:id', [param('id').isInt()], validate, slotController.updateSlot);
router.delete('/slots/:id', [param('id').isInt()], validate, slotController.deleteSlot);
router.patch('/slots/:id/block', [param('id').isInt()], validate, slotController.blockSlot);
router.patch('/slots/:id/unblock', [param('id').isInt()], validate, slotController.unblockSlot);

// Reservas
router.get('/bookings', bookingController.listBookings);
router.put('/bookings/:id', [param('id').isInt()], validate, bookingController.updateBooking);
router.delete('/bookings/:id', [param('id').isInt()], validate, bookingController.cancelBooking);

// Calendario
router.get('/calendar', calendarController.getMonthView);

// Estadísticas
router.get('/stats', statsController.getStats);

module.exports = router;
