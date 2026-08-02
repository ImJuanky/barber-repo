const { Op } = require('sequelize');
const { Booking, Slot } = require('../models');
const { SERVICES } = require('../utils/services');

// GET /api/admin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=month|day
// Devuelve el número de cortes y los ingresos generados, agrupados por
// periodo, para dibujar la gráfica del panel de administración.
async function getStats(req, res, next) {
  try {
    const { from, to, groupBy } = req.query;
    const group = groupBy === 'day' ? 'day' : 'month';

    const slotWhere = {};
    if (from && to) slotWhere.date = { [Op.between]: [from, to] };

    const bookings = await Booking.findAll({
      where: { status: 'confirmed' },
      include: [{ model: Slot, as: 'slot', where: slotWhere, attributes: ['date'] }],
      attributes: ['id', 'service', 'price']
    });

    const periodsMap = {};
    let totalRevenue = 0;
    let totalBookings = 0;
    const byService = {};
    for (const key of Object.keys(SERVICES)) byService[key] = { count: 0, revenue: 0 };

    for (const booking of bookings) {
      const date = booking.slot.date;
      const period = group === 'day' ? date : date.slice(0, 7); // YYYY-MM
      if (!periodsMap[period]) periodsMap[period] = { period, count: 0, revenue: 0 };

      const price = Number(booking.price);
      periodsMap[period].count += 1;
      periodsMap[period].revenue += price;

      totalRevenue += price;
      totalBookings += 1;

      if (byService[booking.service]) {
        byService[booking.service].count += 1;
        byService[booking.service].revenue += price;
      }
    }

    const series = Object.values(periodsMap).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      totalBookings,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      byService,
      series
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
