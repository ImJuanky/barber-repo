export interface Slot {
  id: number;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:mm:ss
  durationMinutes: number;
  status?: 'available' | 'blocked' | 'booked';
  booking?: {
    id: number;
    clientName: string;
    clientPhone: string;
    status: 'confirmed' | 'cancelled';
  } | null;
  // Calendario inteligente: puntuación de conveniencia de este hueco según
  // las citas ya existentes ese día (ver GET /api/slots). No afecta a la
  // disponibilidad: el hueco sigue siendo reservable igual que cualquier otro.
  priorityScore?: number;
  recommended?: boolean;
  recommendationReason?: string | null;
}
