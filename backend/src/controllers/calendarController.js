const { Op } = require('sequelize');
const { Slot, Booking } = require('../models');

// GET /api/admin/calendar?month=YYYY-MM  -> huecos agrupados por día para la vista de calendario
async function getMonthView(req, res, next) {
  try {
    const { month } = req.query; // 'YYYY-MM'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Parámetro "month" inválido. Formato esperado: YYYY-MM.' });
    }

    const from = `${month}-01`;
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2, '0')}`;

    const slots = await Slot.findAll({
      where: { date: { [Op.between]: [from, to] } },
      include: [{ model: Booking, as: 'booking', attributes: ['id', 'clientName', 'clientPhone', 'status'] }],
      order: [['date', 'ASC'], ['time', 'ASC']]
    });

    const grouped = {};
    for (const slot of slots) {
      if (!grouped[slot.date]) grouped[slot.date] = [];
      grouped[slot.date].push(slot);
    }

    res.json(grouped);
  } catch (err) {
    next(err);
  }
}

module.exports = { getMonthView };
