import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Booking, CreateBookingPayload, ServiceType } from '../models/booking.model';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly publicUrl = `${environment.apiUrl}/bookings`;
  private readonly adminUrl = `${environment.apiUrl}/admin/bookings`;

  constructor(private http: HttpClient) {}

  createBooking(payload: CreateBookingPayload): Observable<any> {
    return this.http.post(this.publicUrl, payload);
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
