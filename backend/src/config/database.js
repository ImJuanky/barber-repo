const { Sequelize } = require('sequelize');
require('dotenv').config();

const useSsl = process.env.DB_SSL === 'true';
// 'mysql' (por defecto, para desarrollo local) o 'postgres' (Neon, Aiven Postgres, etc.)
const dialect = process.env.DB_DIALECT === 'postgres' ? 'postgres' : 'mysql';
const defaultPort = dialect === 'postgres' ? 5432 : 3306;

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || defaultPort,
    dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
    define: {
      underscored: true,
      timestamps: true
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
