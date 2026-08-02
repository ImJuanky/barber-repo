import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StatsPeriod {
  period: string;
  count: number;
  revenue: number;
}

export interface StatsResponse {
  totalBookings: number;
  totalRevenue: number;
  byService: Record<string, { count: number; revenue: number }>;
  series: StatsPeriod[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly url = `${environment.apiUrl}/admin/stats`;

  constructor(private http: HttpClient) {}

  getStats(from?: string, to?: string, groupBy: 'day' | 'month' = 'month'): Observable<StatsResponse> {
    let params = new HttpParams().set('groupBy', groupBy);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<StatsResponse>(this.url, { params });
  }
}
