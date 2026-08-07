const { Op } = require('sequelize');
const { Slot, Booking } = require('../models');
const { getMadridNowParts, isPastSlot } = require('../utils/time');
const { annotateWithRecommendations } = require('../utils/recommendation');

// GET /api/slots?date=YYYY-MM-DD  (público: solo huecos disponibles, sin datos de reservas)
// Cada hueco incluye además priorityScore/recommended/recommendationReason:
// un "calendario inteligente" que destaca (sin eliminar) las horas que mejor
// aprovechan la agenda del día (pegadas a otras citas o rellenando huecos).
async function getAvailableSlots(req, res, next) {
  try {
    const { date, from, to } = req.query;
    const where = { status: 'available' };

    if (date) {
      where.date = date;
    } else if (from && to) {
      where.date = { [Op.between]: [from, to] };
    } else {
      where.date = { [Op.gte]: new Date().toISOString().slice(0, 10) };
    }

    const slots = await Slot.findAll({
      where,
      order: [['date', 'ASC'], ['time', 'ASC']],
      attributes: ['id', 'date', 'time', 'durationMinutes']
    });

    // Nunca mostrar (ni permitir reservar) huecos cuya hora ya haya pasado
    // en el día de hoy. Esto es una validación real de datos, no solo de UI:
    // el mismo filtro protege también /api/bookings vía isPastSlot.
    const nowParts = getMadridNowParts();
    const futureSlots = slots.filter((slot) => !isPastSlot(slot.date, slot.time, nowParts));

    // Se calculan las recomendaciones día a día, usando todas las citas
    // confirmadas de cada fecha implicada (no solo las de los huecos libres).
    const datesInvolved = [...new Set(futureSlots.map((s) => s.date))];
    const confirmedBookings = datesInvolved.length
      ? await Booking.findAll({
          where: { status: 'confirmed' },
          include: [{
            model: Slot,
            as: 'slot',
            where: { date: { [Op.in]: datesInvolved } },
            attributes: ['id', 'date', 'time', 'durationMinutes']
          }]
        })
      : [];

    const bookingsByDate = {};
    for (const booking of confirmedBookings) {
      const d = booking.slot.date;
      if (!bookingsByDate[d]) bookingsByDate[d] = [];
      bookingsByDate[d].push(booking);
    }

    const slotsByDate = {};
    for (const slot of futureSlots) {
      if (!slotsByDate[slot.date]) slotsByDate[slot.date] = [];
      slotsByDate[slot.date].push(slot.get({ plain: true }));
    }

    const result = [];
    for (const d of Object.keys(slotsByDate)) {
      const annotated = annotateWithRecommendations(slotsByDate[d], bookingsByDate[d] || []);
      result.push(...annotated);
    }
    result.sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/slots/availability?month=YYYY-MM  (público: qué días del mes tienen huecos libres)
async function getAvailabilityByMonth(req, res, next) {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Parámetro "month" inválido. Formato esperado: YYYY-MM.' });
    }

    const from = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;

    const slots = await Slot.findAll({
      where: {
        status: 'available',
        date: { [Op.between]: [from, to] }
      },
      attributes: ['date', 'time']
    });

    // Un hueco de hoy cuya hora ya pasó no cuenta como disponibilidad real
    // (evita que el calendario marque hoy como "con huecos" cuando ya no
    // queda ninguna hora reservable).
    const nowParts = getMadridNowParts();
    const counts = {};
    for (const slot of slots) {
      if (isPastSlot(slot.date, slot.time, nowParts)) continue;
      counts[slot.date] = (counts[slot.date] || 0) + 1;
    }

    res.json(counts);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/slots?date=&from=&to=  (admin: todos los huecos con su estado)
async function listAllSlots(req, res, next) {
  try {
    const { date, from, to } = req.query;
    const where = {};

    if (date) where.date = date;
    else if (from && to) where.date = { [Op.between]: [from, to] };

    const slots = await Slot.findAll({
      where,
      order: [['date', 'ASC'], ['time', 'ASC']],
      include: [{ model: Booking, as: 'booking', attributes: ['id', 'clientName', 'clientPhone', 'status'] }]
    });

    res.json(slots);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/slots  { date, times: ['09:30','10:00'] } o { date, time }
async function createSlots(req, res, next) {
  try {
    const { date, time, times, durationMinutes } = req.body;
    const timeList = times && Array.isArray(times) ? times : [time];

    if (!date || timeList.length === 0 || timeList.some((t) => !t)) {
      return res.status(400).json({ message: 'Debes indicar fecha y al menos una hora.' });
    }

    const created = [];
    for (const t of timeList) {
      const [slot, wasCreated] = await Slot.findOrCreate({
        where: { date, time: t },
        defaults: { durationMinutes: durationMinutes || 30, status: 'available' }
      });
      if (wasCreated) created.push(slot);
    }

    res.status(201).json({ created, message: `${created.length} hueco(s) creado(s).` });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/slots/bulk  { slots: [{ date, time, durationMinutes }] }
// Crea huecos en varias fechas distintas de una sola vez (usado por la
// cuadrícula semanal del panel de administración).
async function createSlotsBulk(req, res, next) {
  try {
    const { slots } = req.body;
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: 'Debes indicar al menos un hueco.' });
    }

    const created = [];
    for (const item of slots) {
      if (!item?.date || !item?.time) continue;
      const [slot, wasCreated] = await Slot.findOrCreate({
        where: { date: item.date, time: item.time },
        defaults: { durationMinutes: item.durationMinutes || 30, status: 'available' }
      });
      if (wasCreated) created.push(slot);
    }

    res.status(201).json({ created, message: `${created.length} hueco(s) creado(s).` });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/slots/:id  { date, time, durationMinutes }
async function updateSlot(req, res, next) {
  try {
    const slot = await Slot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Hueco no encontrado.' });
    if (slot.status === 'booked') {
      return res.status(409).json({ message: 'No se puede modificar un hueco ya reservado. Cancela la reserva primero.' });
    }

    const { date, time, durationMinutes } = req.body;
    if (date) slot.date = date;
    if (time) slot.time = time;
    if (durationMinutes) slot.durationMinutes = durationMinutes;
    await slot.save();

    res.json(slot);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/slots/:id
async function deleteSlot(req, res, next) {
  try {
    const slot = await Slot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Hueco no encontrado.' });
    if (slot.status === 'booked') {
      return res.status(409).json({ message: 'No se puede eliminar un hueco con una reserva activa.' });
    }
    await slot.destroy();
    res.json({ message: 'Hueco eliminado.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/slots/:id/block
async function blockSlot(req, res, next) {
  try {
    const slot = await Slot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Hueco no encontrado.' });
    if (slot.status === 'booked') {
      return res.status(409).json({ message: 'No se puede bloquear un hueco ya reservado.' });
    }
    slot.status = 'blocked';
    await slot.save();
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/slots/:id/unblock
async function unblockSlot(req, res, next) {
  try {
    const slot = await Slot.findByPk(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Hueco no encontrado.' });
    if (slot.status !== 'blocked') {
      return res.status(409).json({ message: 'El hueco no está bloqueado.' });
    }
    slot.status = 'available';
    await slot.save();
    res.json(slot);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailableSlots,
  getAvailabilityByMonth,
  listAllSlots,
  createSlots,
  createSlotsBulk,
  updateSlot,
  deleteSlot,
  blockSlot,
  unblockSlot
};
