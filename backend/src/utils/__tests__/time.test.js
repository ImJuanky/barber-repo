const test = require('node:test');
const assert = require('node:assert/strict');
const { isPastSlot } = require('../time');

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
