export interface Booking {
  id: number;
  slotId: number;
  clientName: string;
  clientPhone: string;
  status: 'confirmed' | 'cancelled';
  slot?: {
    id: number;
    date: string;
    time: string;
    durationMinutes: number;
  };
}

export interface CreateBookingPayload {
  slotId: number;
  clientName: string;
  clientPhone: string;
}
