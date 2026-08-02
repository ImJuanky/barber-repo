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
}
