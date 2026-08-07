import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MatSelectModule } from '@angular/material/select';

import { BookingService } from '../../../core/services/booking.service';
import { Booking, ServiceType, SERVICES } from '../../../core/models/booking.model';
import { confirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './admin-bookings.html',
  styleUrl: './admin-bookings.scss'
})
export class AdminBookings {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly filterDate = signal<Date | null>(null);
  readonly services = SERVICES;
  readonly skeletonRows = Array.from({ length: 5 });

  editingBookingId: number | null = null;
  editName = '';
  editPhone = '';
  editService: ServiceType = 'corte';

  constructor(private bookingService: BookingService, private snackBar: MatSnackBar, private dialog: MatDialog) {
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
    this.editService = booking.service;
  }

  cancelEditForm(): void {
    this.editingBookingId = null;
  }

  serviceLabel(service: ServiceType): string {
    return this.services.find((s) => s.value === service)?.label ?? service;
  }

  saveEdit(booking: Booking): void {
    this.bookingService.updateBooking(booking.id, {
      clientName: this.editName.trim(),
      clientPhone: this.editPhone.trim(),
      service: this.editService
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
    confirmDialog(this.dialog, {
      title: 'Cancelar reserva',
      message: `¿Seguro que quieres cancelar la reserva de ${booking.clientName}? El hueco quedará libre de nuevo.`,
      confirmLabel: 'Cancelar reserva',
      cancelLabel: 'Volver',
      danger: true,
      icon: 'event_busy'
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.bookingService.cancelBooking(booking.id).subscribe({
        next: () => {
          this.loadBookings();
          this.notify('Reserva cancelada y hueco liberado.');
        },
        error: (err) => this.notify(err?.error?.message || 'No se pudo cancelar la reserva.')
      });
    });
  }

  formatTime(time?: string): string {
    return time?.slice(0, 5) ?? '';
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
