const sequelize = require('../config/database');
const Admin = require('./Admin');
const Slot = require('./Slot');
const Booking = require('./Booking');

Slot.hasOne(Booking, { foreignKey: 'slotId', as: 'booking', onDelete: 'CASCADE' });
Booking.belongsTo(Slot, { foreignKey: 'slotId', as: 'slot' });

module.exports = { sequelize, Admin, Slot, Booking };
