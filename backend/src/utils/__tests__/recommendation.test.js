const test = require('node:test');
const assert = require('node:assert/strict');
const { annotateWithRecommendations, scoreCandidates } = require('../recommendation');

function slot(id, time, durationMinutes = 30) {
  return { id, date: '2026-08-06', time, durationMinutes };
}

function booking(time, durationMinutes = 30) {
  return { slot: { time, durationMinutes } };
}

function recommendedTimes(annotated) {
  return annotated.filter((s) => s.recommended).map((s) => s.time).sort();
}

test('sin citas existentes: nadie se recomienda, todas las horas se conservan', () => {
  const available = [slot(1, '09:00'), slot(2, '09:30'), slot(3, '10:00')];
  const annotated = annotateWithRecommendations(available, []);
  assert.equal(annotated.length, 3);
  assert.deepEqual(recommendedTimes(annotated), []);
  // todas las horas siguen presentes
  assert.deepEqual(annotated.map((s) => s.time).sort(), ['09:00', '09:30', '10:00']);
});

test('una sola cita existente: las horas inmediatamente adyacentes se recomiendan', () => {
  const available = [slot(1, '17:00'), slot(2, '17:30'), slot(3, '18:30'), slot(4, '19:00'), slot(5, '19:30')];
  const bookings = [booking('18:00')];
  const annotated = annotateWithRecommendations(available, bookings);

  assert.deepEqual(recommendedTimes(annotated), ['17:30', '18:30']);
  // el resto de horas se mantienen disponibles con recommended=false
  const rest = annotated.filter((s) => !s.recommended).map((s) => s.time).sort();
  assert.deepEqual(rest, ['17:00', '19:00', '19:30']);
});

test('hueco exacto entre dos citas: la hora que lo rellena tiene prioridad muy alta', () => {
  const available = [slot(1, '18:30')];
  const bookings = [booking('18:00'), booking('19:00')];
  const annotated = annotateWithRecommendations(available, bookings);

  assert.equal(annotated[0].recommended, true);
  assert.equal(annotated[0].recommendationReason, 'Completa tu horario');
});

test('hueco entre dos citas más ancho que una sola cita: la puntuación de relleno es mayor cuanto más cerca del centro/lados', () => {
  // Citas a las 17:00-17:30 y 19:00-19:30. Huecos libres: 17:30, 18:00, 18:30.
  const available = [slot(1, '17:30'), slot(2, '18:00'), slot(3, '18:30')];
  const bookings = [booking('17:00'), booking('19:00')];
  const annotated = annotateWithRecommendations(available, bookings);
  const byTime = Object.fromEntries(annotated.map((s) => [s.time, s]));

  // Los extremos (pegados a una cita) deben puntuar más que el centro.
  assert.ok(byTime['17:30'].priorityScore > byTime['18:00'].priorityScore);
  assert.ok(byTime['18:30'].priorityScore > byTime['18:00'].priorityScore);
  // Ninguna hora desaparece.
  assert.equal(annotated.length, 3);
});

test('varias citas consecutivas: los huecos justo antes/después del bloque se recomiendan', () => {
  const available = [slot(1, '10:00'), slot(2, '11:30'), slot(3, '12:00')];
  const bookings = [booking('10:30'), booking('11:00')]; // bloque ocupado 10:30-11:30
  const annotated = annotateWithRecommendations(available, bookings);

  // 10:00 (justo antes del bloque) y 11:30 (justo después) empatan como mejores opciones.
  assert.deepEqual(recommendedTimes(annotated), ['10:00', '11:30']);
  // 12:00 se aleja del bloque y no se recomienda, pero sigue disponible.
  assert.equal(annotated.length, 3);
});

test('primeras/últimas horas del día sin citas alrededor no se recomiendan por defecto', () => {
  const available = [slot(1, '09:00'), slot(2, '09:30'), slot(3, '20:00'), slot(4, '20:30')];
  const bookings = [booking('14:00')]; // cita lejos de ambos extremos
  const annotated = annotateWithRecommendations(available, bookings);
  // nada está pegado a las 14:00, así que no hay recomendación (todas empatan en score 0)
  assert.deepEqual(recommendedTimes(annotated), []);
});

test('duraciones de servicio distintas: el bloque ocupado usa la duración real de la cita', () => {
  // Cita de 60 minutos a las 18:00 (18:00-19:00). Huecos de 30 min disponibles.
  const available = [slot(1, '18:30'), slot(2, '19:00'), slot(3, '19:30')];
  const bookings = [booking('18:00', 60)];
  const annotated = annotateWithRecommendations(available, bookings);
  const byTime = Object.fromEntries(annotated.map((s) => [s.time, s]));

  // 18:30 sigue ocupado "virtualmente" por la cita de 60 min, así que la
  // hora recomendada es la que queda justo pegada al final real (19:00).
  assert.equal(byTime['19:00'].recommended, true);
});

test('cancelar la única cita existente hace que las recomendaciones desaparezcan (recalculo dinámico)', () => {
  const available = [slot(1, '17:30'), slot(2, '18:30')];
  const withBooking = annotateWithRecommendations(available, [booking('18:00')]);
  assert.deepEqual(recommendedTimes(withBooking), ['17:30', '18:30']);

  const afterCancel = annotateWithRecommendations(available, []);
  assert.deepEqual(recommendedTimes(afterCancel), []);
});

test('scoreCandidates: el relleno exacto de un hueco puntúa más que la simple adyacencia', () => {
  const adjacentOnly = scoreCandidates(
    [{ id: 1, startMinutes: 17 * 60 + 30, durationMinutes: 30 }],
    [{ startMinutes: 18 * 60, durationMinutes: 30 }]
  ).get(1).score;

  const perfectGapFill = scoreCandidates(
    [{ id: 1, startMinutes: 18 * 60 + 30, durationMinutes: 30 }],
    [{ startMinutes: 18 * 60, durationMinutes: 30 }, { startMinutes: 19 * 60, durationMinutes: 30 }]
  ).get(1).score;

  assert.ok(perfectGapFill > adjacentOnly);
});
