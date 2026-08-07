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

// ¿La combinación fecha+hora indicada ya ha pasado respecto a "ahora" en Madrid?
// Un hueco que empieza justo "ahora" también se considera pasado (no tiene
// sentido reservar una cita que debería empezar en este mismo instante).
function isPastSlot(date, time, referenceNow = getMadridNowParts()) {
  if (!date) return false;
  if (date < referenceNow.date) return true;
  if (date > referenceNow.date) return false;
  return normalizeTime(time) <= referenceNow.time;
}

// Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde medianoche.
function timeToMinutes(time) {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

module.exports = { TIMEZONE, getMadridNowParts, normalizeTime, isPastSlot, timeToMinutes };
