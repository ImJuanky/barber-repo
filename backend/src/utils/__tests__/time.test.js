const test = require('node:test');
const assert = require('node:assert/strict');
const { isPastSlot, isBookable, minutesUntilSlot, MIN_BOOKING_LEAD_MINUTES } = require('../time');

test('isPastSlot: fecha anterior a hoy siempre es pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-06', '23:00', now), true);
});

test('isPastSlot: fecha posterior a hoy nunca es pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-08', '00:00', now), false);
});

test('isPastSlot: mismo día, hora anterior a la actual es pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-07', '17:30', now), true);
});

test('isPastSlot: mismo día, hora exactamente igual a la actual es pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-07', '17:45', now), true);
});

test('isPastSlot: mismo día, hora posterior a la actual NO es pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-07', '17:46', now), false);
  assert.equal(isPastSlot('2026-08-07', '18:00', now), false);
});

test('isPastSlot: acepta formato HH:mm y HH:mm:ss indistintamente', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isPastSlot('2026-08-07', '17:45:00', now), true);
  assert.equal(isPastSlot('2026-08-07', '17:45', now), true);
});

test('MIN_BOOKING_LEAD_MINUTES es 20', () => {
  assert.equal(MIN_BOOKING_LEAD_MINUTES, 20);
});

test('isBookable: rechaza una hora que ya ha pasado', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isBookable('2026-08-07', '17:30', now), false);
});

test('isBookable: rechaza una hora a menos de 20 minutos vista', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isBookable('2026-08-07', '17:50', now), false); // faltan 5 min
  assert.equal(isBookable('2026-08-07', '18:00', now), false); // faltan 15 min
  assert.equal(isBookable('2026-08-07', '18:04', now), false); // faltan 19 min
});

test('isBookable: acepta una hora a exactamente 20 minutos vista o más', () => {
  const now = { date: '2026-08-07', time: '17:45:00' };
  assert.equal(isBookable('2026-08-07', '18:05', now), true); // faltan 20 min exactos
  assert.equal(isBookable('2026-08-07', '19:00', now), true);
});

test('isBookable: un día futuro cualquiera siempre es reservable', () => {
  const now = { date: '2026-08-07', time: '23:55:00' };
  assert.equal(isBookable('2026-08-08', '09:00', now), true);
});

test('minutesUntilSlot / isBookable: cruzan la medianoche correctamente', () => {
  // Hoy 23:50, hueco mañana 00:05 -> solo 15 minutos reales de diferencia.
  const now = { date: '2026-08-07', time: '23:50:00' };
  assert.equal(minutesUntilSlot('2026-08-08', '00:05', now), 15);
  assert.equal(isBookable('2026-08-08', '00:05', now), false);

  // Hoy 23:50, hueco mañana 00:15 -> 25 minutos, sí es reservable.
  assert.equal(minutesUntilSlot('2026-08-08', '00:15', now), 25);
  assert.equal(isBookable('2026-08-08', '00:15', now), true);
});
