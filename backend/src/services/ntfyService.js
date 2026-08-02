// Notificaciones push al admin vía ntfy.sh (https://ntfy.sh) - gratis,
// oficial, sin necesidad de cuenta. El admin instala la app ntfy en su
// móvil y se suscribe al "topic" configurado en NTFY_TOPIC; a partir de
// ahí cualquier POST a https://ntfy.sh/<topic> le llega como notificación
// push. No bloquea nunca la operación principal si falla o no está
// configurado.

function isConfigured() {
  return Boolean(process.env.NTFY_TOPIC);
}

async function sendAdminNotification(title, message) {
  if (!isConfigured()) {
    console.warn('[ntfyService] NTFY_TOPIC no configurado. Se omite la notificación.');
    return;
  }

  try {
    const topic = process.env.NTFY_TOPIC;
    const response = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: 'POST',
      body: message,
      headers: {
        Title: encodeURIComponent(title),
        Priority: 'default',
        Tags: 'scissors'
      }
    });
    if (!response.ok) {
      const body = await response.text();
      console.error('[ntfyService] Respuesta no OK de ntfy.sh:', response.status, body);
    }
  } catch (err) {
    console.error('[ntfyService] Error enviando notificación push:', err.message);
  }
}

function notifyNewBooking({ clientName, clientPhone, service, date, time, price }) {
  const message = `Cliente: ${clientName}\nTeléfono: ${clientPhone}\nServicio: ${service}\nFecha: ${date} ${time?.slice(0, 5)}\nPrecio: ${price} €`;
  return sendAdminNotification('Nueva reserva', message);
}

function notifyCancelledBooking({ clientName, clientPhone, service, date, time }) {
  const message = `Cliente: ${clientName}\nTeléfono: ${clientPhone}\nServicio: ${service}\nFecha: ${date} ${time?.slice(0, 5)}`;
  return sendAdminNotification('Cita cancelada', message);
}

module.exports = { isConfigured, sendAdminNotification, notifyNewBooking, notifyCancelledBooking };
