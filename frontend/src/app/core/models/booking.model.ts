export type ServiceType = 'corte' | 'corte_barba';

export interface ServiceInfo {
  value: ServiceType;
  label: string;
  price: number;
}

export const SERVICES: ServiceInfo[] = [
  { value: 'corte', label: 'Corte', price: 10 },
  { value: 'corte_barba', label: 'Corte y barba', price: 13 }
];

export interface Booking {
  id: number;
  slotId: number;
  clientName: string;
  clientPhone: string;
  status: 'confirmed' | 'cancelled';
  service: ServiceType;
  price: number;
  slot?: {
    id: number;
    date: string;
    time: string;
    durationMinutes: number;
  };
}

export interface CreateBookingPayload {
  slotId: number;
  service: ServiceType;
}
