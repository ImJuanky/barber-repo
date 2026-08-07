// Lógica de recomendación de horarios ("calendario inteligente").
//
// Objetivo de negocio: entre todos los huecos realmente disponibles de un
// día, destacar aquellos que, si se reservan, reducen mejor los tiempos
// muertos del peluquero (porque quedan pegados a citas ya existentes o
// porque rellenan exactamente un hueco entre dos citas).
//
// Esto es lógica pura (no toca la BD ni Express) para que sea fácil de
// testear con cualquier combinación de citas/huecos.
const { timeToMinutes } = require('./time');

const ADJACENCY_WEIGHT = 1;
const GAP_FIT_WEIGHT = 2;
// Unidad de normalización: un hueco pegado (0 min de separación) puntúa 1;
// a partir de ahí la puntuación decae según cuántos "bloques" de 30 min de
// separación haya. No depende de que la agenda esté en huecos de 30 min
// exactos, es solo la escala de referencia.
const UNIT_MINUTES = 30;

// Combina intervalos ocupados que se solapan o son contiguos en uno solo,
// para que una cadena de citas consecutivas cuente como un único bloque
// ocupado (importante para "agrupar varias citas consecutivas").
function mergeBusyIntervals(intervals) {
  const sorted = [...intervals]
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }
  return merged;
}

// distancia (en "unidades" de UNIT_MINUTES) => puntuación de adyacencia,
// máxima (1) cuando la distancia es 0 y decreciente hacia 0 a medida que se aleja.
function proximityScore(gapMinutes) {
  if (gapMinutes === null) return 0; // no hay bloque ocupado en esa dirección
  return 1 / (gapMinutes / UNIT_MINUTES + 1);
}

// Calcula, para una lista de huecos candidatos (de un mismo día) y las citas
// ya confirmadas ese día, una puntuación de prioridad por candidato.
//
// candidates: [{ id, startMinutes, durationMinutes }]
// busyIntervals: [{ startMinutes, durationMinutes }]  (citas confirmadas)
//
// Devuelve un Map<id, { score, reason, fitsGapExactly }>.
function scoreCandidates(candidates, busyIntervals) {
  const busy = mergeBusyIntervals(
    busyIntervals.map((b) => ({ start: b.startMinutes, end: b.startMinutes + (b.durationMinutes || 0) }))
  );

  const result = new Map();

  for (const candidate of candidates) {
    const start = candidate.startMinutes;
    const end = start + (candidate.durationMinutes || 0);

    // Bloque ocupado más cercano que termina antes (o justo) de que empiece el candidato.
    const previousBusy = busy
      .filter((b) => b.end <= start)
      .reduce((closest, b) => (closest === null || b.end > closest.end ? b : closest), null);

    // Bloque ocupado más cercano que empieza después (o justo) de que termine el candidato.
    const nextBusy = busy
      .filter((b) => b.start >= end)
      .reduce((closest, b) => (closest === null || b.start < closest.start ? b : closest), null);

    const gapBefore = previousBusy ? start - previousBusy.end : null;
    const gapAfter = nextBusy ? nextBusy.start - end : null;

    const leftScore = proximityScore(gapBefore);
    const rightScore = proximityScore(gapAfter);
    const adjacencyScore = leftScore + rightScore;

    // Solo hay "hueco entre citas" real cuando hay bloque ocupado a ambos lados.
    const boundedBothSides = previousBusy !== null && nextBusy !== null;
    let gapBonus = 0;
    let fitsGapExactly = false;

    if (boundedBothSides) {
      const totalGapSpan = nextBusy.start - previousBusy.end; // tamaño total del hueco libre entre las dos citas
      const candidateDuration = end - start;
      // Qué proporción del hueco ocuparía este candidato: 1 = lo rellena
      // exactamente, valores menores = el hueco es más grande que la cita.
      const fitRatio = totalGapSpan > 0 ? Math.min(candidateDuration / totalGapSpan, 1) : 0;
      gapBonus = fitRatio;
      fitsGapExactly = gapBefore === 0 && gapAfter === 0;
    }

    const score = adjacencyScore * ADJACENCY_WEIGHT + gapBonus * GAP_FIT_WEIGHT;

    let reason = null;
    if (fitsGapExactly) {
      reason = 'fills_gap';
    } else if (boundedBothSides && gapBonus > 0) {
      reason = 'shrinks_gap';
    } else if (gapBefore === 0 || gapAfter === 0) {
      reason = 'adjacent';
    }

    result.set(candidate.id, { score: Math.round(score * 1000) / 1000, reason });
  }

  return result;
}

// Añade a cada slot disponible su puntuación, y marca como "recommended" los
// que empatan con la puntuación máxima del día (si esa máxima es > 0).
// No elimina ni reordena nada: todas las horas disponibles se conservan.
function annotateWithRecommendations(availableSlots, confirmedBookingsWithSlot) {
  const busyIntervals = confirmedBookingsWithSlot
    .filter((b) => b.slot)
    .map((b) => ({
      startMinutes: timeToMinutes(b.slot.time),
      durationMinutes: b.slot.durationMinutes || 30
    }));

  const candidates = availableSlots.map((s) => ({
    id: s.id,
    startMinutes: timeToMinutes(s.time),
    durationMinutes: s.durationMinutes || 30
  }));

  const scored = scoreCandidates(candidates, busyIntervals);

  let maxScore = 0;
  for (const { score } of scored.values()) {
    if (score > maxScore) maxScore = score;
  }

  const REASON_LABELS = {
    fills_gap: 'Completa tu horario',
    shrinks_gap: 'Reduce un hueco libre',
    adjacent: 'Justo al lado de otra cita'
  };

  // Umbral mínimo para que una puntuación se considere "significativa". Sin
  // esto, una cita lejana (a horas de distancia) seguiría produciendo un
  // "ganador" técnico por decimales, aunque no sea realmente una buena
  // recomendación. 0.5 equivale, como mínimo, a estar pegado a una cita
  // por un lado (proximityScore(0) = 1) medio "diluido", o a ~30 min de una.
  const MEANINGFUL_SCORE_THRESHOLD = 0.5;

  return availableSlots.map((slot) => {
    const entry = scored.get(slot.id) || { score: 0, reason: null };
    const recommended =
      entry.score >= MEANINGFUL_SCORE_THRESHOLD &&
      maxScore >= MEANINGFUL_SCORE_THRESHOLD &&
      entry.score >= maxScore - 1e-6;
    return {
      ...slot,
      priorityScore: entry.score,
      recommended,
      recommendationReason: recommended ? REASON_LABELS[entry.reason] || null : null
    };
  });
}

module.exports = { mergeBusyIntervals, scoreCandidates, annotateWithRecommendations };
