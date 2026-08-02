import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Slot } from '../models/slot.model';

export interface BulkSlotInput {
  date: string;
  time: string;
  durationMinutes?: number;
}

@Injectable({ providedIn: 'root' })
export class SlotService {
  private readonly publicUrl = `${environment.apiUrl}/slots`;
  private readonly adminUrl = `${environment.apiUrl}/admin/slots`;
  private readonly calendarUrl = `${environment.apiUrl}/admin/calendar`;

  constructor(private http: HttpClient) {}

  // Cliente: solo huecos disponibles
  getAvailableSlots(date?: string): Observable<Slot[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<Slot[]>(this.publicUrl, { params });
  }

  // Cliente: qué días de un mes tienen huecos libres (para el calendario visual)
  getAvailabilityByMonth(month: string): Observable<Record<string, number>> {
    const params = new HttpParams().set('month', month);
    return this.http.get<Record<string, number>>(`${this.publicUrl}/availability`, { params });
  }

  // Admin: todos los huecos (con estado y reserva asociada)
  getAllSlots(date?: string, from?: string, to?: string): Observable<Slot[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Slot[]>(this.adminUrl, { params });
  }

  createSlots(date: string, times: string[], durationMinutes = 30): Observable<any> {
    return this.http.post(this.adminUrl, { date, times, durationMinutes });
  }

  createSlotsBulk(slots: BulkSlotInput[]): Observable<any> {
    return this.http.post(`${this.adminUrl}/bulk`, { slots });
  }

  updateSlot(id: number, data: Partial<Slot>): Observable<Slot> {
    return this.http.put<Slot>(`${this.adminUrl}/${id}`, data);
  }

  deleteSlot(id: number): Observable<any> {
    return this.http.delete(`${this.adminUrl}/${id}`);
  }

  blockSlot(id: number): Observable<Slot> {
    return this.http.patch<Slot>(`${this.adminUrl}/${id}/block`, {});
  }

  unblockSlot(id: number): Observable<Slot> {
    return this.http.patch<Slot>(`${this.adminUrl}/${id}/unblock`, {});
  }

  getMonthView(month: string): Observable<Record<string, Slot[]>> {
    const params = new HttpParams().set('month', month);
    return this.http.get<Record<string, Slot[]>>(this.calendarUrl, { params });
  }
}
