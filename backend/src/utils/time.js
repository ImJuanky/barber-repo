// Utilidades de fecha/hora. La peluquería opera en horario de España, así que
// "ahora" se calcula siempre en la zona horaria de Madrid, sin importar en
// qué zona horaria esté configurado el servidor (Render corre en UTC).
const TIMEZONE = 'Europe/Madrid';

// Devuelve { date: 'YYYY-MM-DD', time: 'HH:mm:ss' } correspondientes al
// instante actual, en hora de Madrid.
function getMadridNowParts() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  // Algunos entornos devuelven "24" en vez de "00" para medianoche.
  const hour = parts.hour === '24' ? '00' : parts.hour;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}:${parts.second}`
  };
}

// Normaliza un valor TIME de la BD (puede venir como 'HH:mm' o 'HH:mm:ss') a 'HH:mm:ss'.
function normalizeTime(time) {
  if (!time) return '00:00:00';
  const parts = String(time).split(':');
  const [h = '00', m = '00', s = '00'] = parts;
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
}

// Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde medianoche.
function timeToMinutes(time) {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

// Minutos absolutos (día calendario * 1440 + minuto del día) para poder
// restar dos marcas fecha+hora sin importar si caen en días distintos
// (p. ej. hoy 23:50 frente a mañana 00:05). Se usa aritmética de calendario
// pura (Date.UTC solo como contador de días), no conversión real a UTC, así
// que no depende de en qué huso horario esté el servidor.
function toAbsoluteMinutes(date, time) {
  const [year, month, day] = String(date).split('-').map(Number);
  const days = Date.UTC(year, month - 1, day) / 86400000;
  return days * 1440 + timeToMinutes(time);
}

// Minutos que faltan desde "ahora" (Madrid) hasta la fecha+hora indicada.
// Negativo si esa hora ya pasó.
function minutesUntilSlot(date, time, referenceNow = getMadridNowParts()) {
  if (!date) return Infinity;
  return toAbsoluteMinutes(date, time) - toAbsoluteMinutes(referenceNow.date, referenceNow.time);
}

// ¿La combinación fecha+hora indicada ya ha pasado respecto a "ahora" en Madrid?
// Un hueco que empieza justo "ahora" también se considera pasado (no tiene
// sentido reservar una cita que debería empezar en este mismo instante).
function isPastSlot(date, time, referenceNow = getMadridNowParts()) {
  return minutesUntilSlot(date, time, referenceNow) <= 0;
}

// Antelación mínima exigida para poder reservar un hueco (en minutos).
const MIN_BOOKING_LEAD_MINUTES = 20;

// ¿Se puede reservar este hueco ahora mismo? No basta con que sea futuro:
// además debe faltar al menos MIN_BOOKING_LEAD_MINUTES para que empiece.
function isBookable(date, time, referenceNow = getMadridNowParts(), leadMinutes = MIN_BOOKING_LEAD_MINUTES) {
  return minutesUntilSlot(date, time, referenceNow) >= leadMinutes;
}

module.exports = {
  TIMEZONE,
  MIN_BOOKING_LEAD_MINUTES,
  getMadridNowParts,
  normalizeTime,
  timeToMinutes,
  minutesUntilSlot,
  isPastSlot,
  isBookable
};
