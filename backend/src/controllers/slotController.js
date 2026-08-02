const { Op } = require('sequelize');
const { Slot, Booking } = require('../models');

// GET /api/slots?date=YYYY-MM-DD  (público: solo huecos disponibles, sin datos de reservas)
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

    res.json(slots);
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
  listAllSlots,
  createSlots,
  updateSlot,
  deleteSlot,
  blockSlot,
  unblockSlot
};
