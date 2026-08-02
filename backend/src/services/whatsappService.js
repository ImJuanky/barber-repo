// Notificaciones al administrador vía WhatsApp usando CallMeBot
// (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
// Es un servicio gratuito no oficial: el propio admin debe activarlo una vez
// desde su móvil (añadir el contacto de CallMeBot y enviarle el mensaje de
// activación) para obtener su API key. No bloquea nunca la operación
// principal (crear/cancelar reserva) si falla o no está configurado.

function isConfigured() {
  return Boolean(process.env.WHATSAPP_ADMIN_PHONE && process.env.WHATSAPP_API_KEY);
}

async function sendAdminNotification(message) {
  if (!isConfigured()) {
    console.warn('[whatsappService] WHATSAPP_ADMIN_PHONE / WHATSAPP_API_KEY no configurados. Se omite la notificación.');
    return;
  }

  try {
    const phone = process.env.WHATSAPP_ADMIN_PHONE;
    const apikey = process.env.WHATSAPP_API_KEY;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apikey)}`;

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error('[whatsappService] Respuesta no OK de CallMeBot:', response.status, body);
    }
  } catch (err) {
    console.error('[whatsappService] Error enviando notificación de WhatsApp:', err.message);
  }
}

function notifyNewBooking({ clientName, clientPhone, service, date, time, price }) {
  const message = `Nueva reserva\nCliente: ${clientName}\nTeléfono: ${clientPhone}\nServicio: ${service}\nFecha: ${date} ${time?.slice(0, 5)}\nPrecio: ${price} €`;
  return sendAdminNotification(message);
}

function notifyCancelledBooking({ clientName, clientPhone, service, date, time }) {
  const message = `Cita cancelada\nCliente: ${clientName}\nTeléfono: ${clientPhone}\nServicio: ${service}\nFecha: ${date} ${time?.slice(0, 5)}`;
  return sendAdminNotification(message);
}

module.exports = { isConfigured, sendAdminNotification, notifyNewBooking, notifyCancelledBooking };
