const { google } = require('googleapis');

function getOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  }

  return oAuth2Client;
}

function isConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function buildDateTime(date, time) {
  // date: 'YYYY-MM-DD', time: 'HH:mm:ss' -> ISO local datetime string
  return `${date}T${time}`;
}

function addMinutes(date, time, minutes) {
  const [h, m, s] = time.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m + minutes, s || 0);
  const pad = (n) => String(n).padStart(2, '0');
  const newDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const newTime = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { date: newDate, time: newTime };
}

/**
 * Crea un evento en Google Calendar para una reserva confirmada.
 * Si las credenciales no están configuradas, no hace nada (no bloquea la reserva).
 */
async function createBookingEvent({ clientName, clientPhone, service, date, time, durationMinutes = 30, timeZone = 'Europe/Madrid' }) {
  if (!isConfigured()) {
    console.warn('[googleCalendarService] Credenciales de Google no configuradas. Se omite la creación del evento.');
    return null;
  }

  try {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const start = buildDateTime(date, time);
    const end = buildDateTime(...Object.values(addMinutes(date, time, durationMinutes)));

    const event = {
      summary: `Cita: ${clientName}${service ? ' · ' + service : ''}`,
      description: `Cliente: ${clientName}\nTeléfono: ${clientPhone}${service ? `\nServicio: ${service}` : ''}`,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      reminders: { useDefault: true }
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: event
    });

    return response.data.id;
  } catch (err) {
    console.error('[googleCalendarService] Error creando evento:', err.message);
    return null;
  }
}

async function deleteBookingEvent(eventId) {
  if (!isConfigured() || !eventId) return;

  try {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId
    });
  } catch (err) {
    console.error('[googleCalendarService] Error eliminando evento:', err.message);
  }
}

async function updateBookingEvent(eventId, { clientName, clientPhone, service, date, time, durationMinutes = 30, timeZone = 'Europe/Madrid' }) {
  if (!isConfigured() || !eventId) return;

  try {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const start = buildDateTime(date, time);
    const end = buildDateTime(...Object.values(addMinutes(date, time, durationMinutes)));

    await calendar.events.patch({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
      requestBody: {
        summary: `Cita: ${clientName}${service ? ' · ' + service : ''}`,
        description: `Cliente: ${clientName}\nTeléfono: ${clientPhone}${service ? `\nServicio: ${service}` : ''}`,
        start: { dateTime: start, timeZone },
        end: { dateTime: end, timeZone }
      }
    });
  } catch (err) {
    console.error('[googleCalendarService] Error actualizando evento:', err.message);
  }
}

module.exports = {
  isConfigured,
  createBookingEvent,
  deleteBookingEvent,
  updateBookingEvent,
  getOAuthClient
};
