import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './admin-bookings.html',
  styleUrl: './admin-bookings.scss'
})
export class AdminBookings {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly filterDate = signal<Date | null>(null);

  editingBookingId: number | null = null;
  editName = '';
  editPhone = '';

  constructor(private bookingService: BookingService, private snackBar: MatSnackBar) {
    this.loadBookings();
  }

  private toIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  onFilterDateChange(date: Date | null): void {
    this.filterDate.set(date);
    this.loadBookings();
  }

  clearFilter(): void {
    this.filterDate.set(null);
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    const date = this.filterDate();
    this.bookingService.listBookings(date ? { date: this.toIsoDate(date) } : {}).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify('No se pudieron cargar las reservas.');
      }
    });
  }

  startEdit(booking: Booking): void {
    this.editingBookingId = booking.id;
    this.editName = booking.clientName;
    this.editPhone = booking.clientPhone;
  }

  cancelEditForm(): void {
    this.editingBookingId = null;
  }

  saveEdit(booking: Booking): void {
    this.bookingService.updateBooking(booking.id, {
      clientName: this.editName.trim(),
      clientPhone: this.editPhone.trim()
    }).subscribe({
      next: () => {
        this.editingBookingId = null;
        this.loadBookings();
        this.notify('Reserva actualizada.');
      },
      error: (err) => this.notify(err?.error?.message || 'No se pudo actualizar la reserva.')
    });
  }

  cancelBooking(booking: Booking): void {
    if (!confirm(`¿Cancelar la reserva de ${booking.clientName}?`)) return;
    this.bookingService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.loadBookings();
        this.notify('Reserva cancelada y hueco liberado.');
      },
      error: (err) => this.notify(err?.error?.message || 'No se pudo cancelar la reserva.')
    });
  }

  formatTime(time?: string): string {
    return time?.slice(0, 5) ?? '';
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
