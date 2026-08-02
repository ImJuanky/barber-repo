const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  slotId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'slot_id'
  },
  clientName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'client_name'
  },
  clientPhone: {
    type: DataTypes.STRING(30),
    allowNull: false,
    field: 'client_phone'
  },
  status: {
    type: DataTypes.ENUM('confirmed', 'cancelled'),
    allowNull: false,
    defaultValue: 'confirmed'
  },
  googleEventId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'google_event_id'
  }
}, {
  tableName: 'bookings'
});

module.exports = Booking;
