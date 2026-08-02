// Catálogo de servicios ofrecidos y su precio (en euros).
// Definido en un único lugar para que el precio se calcule siempre en el
// servidor (nunca confiando en un precio enviado por el cliente).
const SERVICES = {
  corte: { label: 'Corte', price: 10, durationMinutes: 30 },
  corte_barba: { label: 'Corte y barba', price: 13, durationMinutes: 30 }
};

function isValidService(service) {
  return Object.prototype.hasOwnProperty.call(SERVICES, service);
}

function getServicePrice(service) {
  return SERVICES[service]?.price ?? SERVICES.corte.price;
}

function getServiceLabel(service) {
  return SERVICES[service]?.label ?? service;
}

module.exports = { SERVICES, isValidService, getServicePrice, getServiceLabel };
