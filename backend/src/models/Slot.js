const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Slot = sequelize.define('Slot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    field: 'duration_minutes'
  },
  status: {
    type: DataTypes.ENUM('available', 'blocked', 'booked'),
    allowNull: false,
    defaultValue: 'available'
  }
}, {
  tableName: 'slots',
  indexes: [
    { unique: true, fields: ['date', 'time'] }
  ]
});

module.exports = Slot;
