import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer, CustomerAuthResponse } from '../models/customer.model';

const TOKEN_KEY = 'peluqueria_customer_token';
const CUSTOMER_KEY = 'peluqueria_customer_data';

@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly apiUrl = `${environment.apiUrl}/customers`;
  readonly currentCustomer = signal<Customer | null>(this.readStoredCustomer());

  constructor(private http: HttpClient) {}

  register(name: string, phone: string, password: string): Observable<CustomerAuthResponse> {
    return this.http.post<CustomerAuthResponse>(`${this.apiUrl}/register`, { name, phone, password }).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  login(phone: string, password: string): Observable<CustomerAuthResponse> {
    return this.http.post<CustomerAuthResponse>(`${this.apiUrl}/login`, { phone, password }).pipe(
      tap((res) => this.storeSession(res))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    this.currentCustomer.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private storeSession(res: CustomerAuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(res.customer));
    this.currentCustomer.set(res.customer);
  }

  private readStoredCustomer(): Customer | null {
    const raw = localStorage.getItem(CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
