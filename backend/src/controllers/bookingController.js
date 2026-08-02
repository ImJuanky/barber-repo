const { sequelize, Slot, Booking } = require('../models');
const googleCalendarService = require('../services/googleCalendarService');
const { isValidService, getServicePrice, getServiceLabel } = require('../utils/services');

// POST /api/bookings  { slotId, clientName, clientPhone, service }  (público)
async function createBooking(req, res, next) {
  const { slotId, clientName, clientPhone } = req.body;
  const service = isValidService(req.body.service) ? req.body.service : 'corte';
  const price = getServicePrice(service);

  const t = await sequelize.transaction();
  try {
    const slot = await Slot.findByPk(slotId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!slot) {
      await t.rollback();
      return res.status(404).json({ message: 'El hueco seleccionado no existe.' });
    }
    if (slot.status !== 'available') {
      await t.rollback();
      return res.status(409).json({ message: 'Ese hueco ya no está disponible. Elige otra hora.' });
    }

    const booking = await Booking.create({
      slotId: slot.id,
      clientName,
      clientPhone,
      service,
      price,
      status: 'confirmed'
    }, { transaction: t });

    slot.status = 'booked';
    await slot.save({ transaction: t });

    await t.commit();

    // Crear evento en Google Calendar (no bloqueante para la respuesta al cliente)
    googleCalendarService.createBookingEvent({
      clientName,
      clientPhone,
      service: getServiceLabel(service),
      date: slot.date,
      time: slot.time,
      durationMinutes: slot.durationMinutes
    }).then((eventId) => {
      if (eventId) booking.update({ googleEventId: eventId });
    });

    res.status(201).json({
      message: 'Reserva confirmada.',
      booking: {
        id: booking.id,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        service: booking.service,
        price: booking.price,
        date: slot.date,
        time: slot.time
      }
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

// GET /api/admin/bookings?date=&from=&to=&status=
async function listBookings(req, res, next) {
  try {
    const { Op } = require('sequelize');
    const { date, from, to, status } = req.query;
    const slotWhere = {};
    if (date) slotWhere.date = date;
    else if (from && to) slotWhere.date = { [Op.between]: [from, to] };

    const bookingWhere = {};
    if (status) bookingWhere.status = status;

    const bookings = await Booking.findAll({
      where: bookingWhere,
      include: [{ model: Slot, as: 'slot', where: slotWhere, attributes: ['id', 'date', 'time', 'durationMinutes'] }],
      order: [[{ model: Slot, as: 'slot' }, 'date', 'ASC'], [{ model: Slot, as: 'slot' }, 'time', 'ASC']]
    });

    res.json(bookings);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/bookings/:id  { clientName, clientPhone, service }
async function updateBooking(req, res, next) {
  try {
    const booking = await Booking.findByPk(req.params.id, { include: [{ model: Slot, as: 'slot' }] });
    if (!booking) return res.status(404).json({ message: 'Reserva no encontrada.' });

    const { clientName, clientPhone, service } = req.body;
    if (clientName) booking.clientName = clientName;
    if (clientPhone) booking.clientPhone = clientPhone;
    if (service && isValidService(service)) {
      booking.service = service;
      booking.price = getServicePrice(service);
    }
    await booking.save();

    if (booking.googleEventId) {
      googleCalendarService.updateBookingEvent(booking.googleEventId, {
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        service: getServiceLabel(booking.service),
        date: booking.slot.date,
        time: booking.slot.time,
        durationMinutes: booking.slot.durationMinutes
      });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/bookings/:id  (cancela la reserva y libera el hueco)
async function cancelBooking(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return res.status(404).json({ message: 'Reserva no encontrada.' });
    }

    const slot = await Slot.findByPk(booking.slotId, { transaction: t, lock: t.LOCK.UPDATE });

    const googleEventId = booking.googleEventId;
    await booking.destroy({ transaction: t });

    if (slot) {
      slot.status = 'available';
      await slot.save({ transaction: t });
    }

    await t.commit();

    if (googleEventId) {
      googleCalendarService.deleteBookingEvent(googleEventId);
    }

    res.json({ message: 'Reserva cancelada y hueco liberado.' });
  } catch (err) {
    await t.rollback();
    next(err);
  }
}

module.exports = { createBooking, listBookings, updateBooking, cancelBooking };
