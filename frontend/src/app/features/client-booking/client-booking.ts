import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

import { SlotService } from '../../core/services/slot.service';
import { BookingService } from '../../core/services/booking.service';
import { Slot } from '../../core/models/slot.model';

@Component({
  selector: 'app-client-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './client-booking.html',
  styleUrl: './client-booking.scss'
})
export class ClientBooking {
  readonly minDate = new Date();
  readonly selectedDate = signal<Date>(new Date());
  readonly slots = signal<Slot[]>([]);
  readonly selectedSlot = signal<Slot | null>(null);
  readonly loadingSlots = signal(false);
  readonly submitting = signal(false);
  readonly confirmed = signal<{ date: string; time: string } | null>(null);

  readonly groupedByHour = computed(() => this.slots());

  private fb = inject(FormBuilder);
  private slotService = inject(SlotService);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);

  readonly form = this.fb.group({
    clientName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    clientPhone: ['', [Validators.required, Validators.pattern(/^[0-9+\s()-]{6,20}$/)]]
  });

  constructor() {
    this.loadSlots();
  }

  onDateChange(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.loadSlots();
  }

  private toIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  loadSlots(): void {
    this.loadingSlots.set(true);
    const isoDate = this.toIsoDate(this.selectedDate());
    this.slotService.getAvailableSlots(isoDate).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.loadingSlots.set(false);
        this.snackBar.open('No se pudieron cargar los huecos disponibles.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  selectSlot(slot: Slot): void {
    this.selectedSlot.set(slot);
  }

  formatTime(time: string): string {
    return time?.slice(0, 5) ?? time;
  }

  submitBooking(): void {
    const slot = this.selectedSlot();
    if (!slot || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { clientName, clientPhone } = this.form.getRawValue();

    this.bookingService.createBooking({
      slotId: slot.id,
      clientName: clientName!.trim(),
      clientPhone: clientPhone!.trim()
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmed.set({ date: slot.date, time: this.formatTime(slot.time) });
        this.selectedSlot.set(null);
        this.form.reset();
        this.loadSlots();
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message || 'No se pudo completar la reserva. Elige otro hueco.';
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        this.selectedSlot.set(null);
        this.loadSlots();
      }
    });
  }

  newBooking(): void {
    this.confirmed.set(null);
  }
}
