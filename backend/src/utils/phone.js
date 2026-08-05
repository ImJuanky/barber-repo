// Utilidades para números de móvil españoles: 9 dígitos empezando por 6 o 7,
// con prefijo internacional opcional (+34 / 0034 / 34) y separadores (espacios,
// guiones, paréntesis) que se ignoran.

function normalizeSpanishPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  const withoutPrefix = digits.replace(/^(0034|34)/, '');
  return withoutPrefix;
}

function isValidSpanishMobile(rawPhone) {
  const normalized = normalizeSpanishPhone(rawPhone);
  return /^[67]\d{8}$/.test(normalized);
}

module.exports = { normalizeSpanishPhone, isValidSpanishMobile };
