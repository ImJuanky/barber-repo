const sequelize = require('../config/database');
const Admin = require('./Admin');
const Slot = require('./Slot');
const Booking = require('./Booking');
const Customer = require('./Customer');

Slot.hasOne(Booking, { foreignKey: 'slotId', as: 'booking', onDelete: 'CASCADE' });
Booking.belongsTo(Slot, { foreignKey: 'slotId', as: 'slot' });

Customer.hasMany(Booking, { foreignKey: 'customerId', as: 'bookings' });
Booking.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

module.exports = { sequelize, Admin, Slot, Booking, Customer };
