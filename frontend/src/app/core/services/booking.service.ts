import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, CreateBookingPayload, ServiceType } from '../models/booking.model';

export interface CancelableBooking {
  id: number;
  clientName: string;
  service: ServiceType;
  serviceLabel: string;
  price: number;
  date: string;
  time: string;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly publicUrl = `${environment.apiUrl}/bookings`;
  private readonly adminUrl = `${environment.apiUrl}/admin/bookings`;

  constructor(private http: HttpClient) {}

  createBooking(payload: CreateBookingPayload): Observable<any> {
    return this.http.post(this.publicUrl, payload);
  }

  // Busca las citas futuras de un cliente (público) para poder cancelarlas.
  findMyBookings(clientName: string, clientPhone: string): Observable<CancelableBooking[]> {
    const params = new HttpParams().set('clientName', clientName).set('clientPhone', clientPhone);
    return this.http.get<CancelableBooking[]>(`${this.publicUrl}/find`, { params });
  }

  // Cancela una cita propia (público), verificando nombre + teléfono en el backend.
  cancelMyBooking(id: number, clientName: string, clientPhone: string): Observable<any> {
    return this.http.post(`${this.publicUrl}/${id}/cancel`, { clientName, clientPhone });
  }

  listBookings(filters: { date?: string; from?: string; to?: string; status?: string } = {}): Observable<Booking[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<Booking[]>(this.adminUrl, { params });
  }

  updateBooking(id: number, data: { clientName?: string; clientPhone?: string; service?: ServiceType }): Observable<Booking> {
    return this.http.put<Booking>(`${this.adminUrl}/${id}`, data);
  }

  cancelBooking(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/${id}`);
  }
}
