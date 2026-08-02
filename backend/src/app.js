const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const { sanitizeBody } = require('./utils/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const slotRoutes = require('./routes/slotRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Seguridad básica
// crossOriginResourcePolicy en "cross-origin" porque el frontend (Vercel) y el
// backend (Render) viven en dominios distintos; con el valor por defecto
// ("same-origin") el navegador bloquea las peticiones del frontend con un
// error genérico "Failed to fetch" aunque CORS esté bien configurado.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(sanitizeBody);
app.use('/api', apiLimiter);

// Rutas
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
