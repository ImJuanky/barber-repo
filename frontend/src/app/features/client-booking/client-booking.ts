import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { SlotService } from '../../core/services/slot.service';
import { BookingService, CancelableBooking } from '../../core/services/booking.service';
import { CustomerAuthService } from '../../core/services/customer-auth.service';
import { Slot } from '../../core/models/slot.model';
import { SERVICES, ServiceType } from '../../core/models/booking.model';
import { confirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

// Móvil español: 9 dígitos empezando por 6 o 7, admite +34/0034/34 y separadores.
function spanishMobileValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value || '');
  const digits = raw.replace(/\D/g, '');
  const withoutPrefix = digits.replace(/^(0034|34)/, '');
  return /^[67]\d{8}$/.test(withoutPrefix) ? null : { spanishMobile: true };
}

interface CalendarDay {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  hasAvailability: boolean;
}

@Component({
  selector: 'app-client-booking',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './client-booking.html',
  styleUrl: './client-booking.scss'
})
export class ClientBooking {
  private fb = inject(FormBuilder);
  private slotService = inject(SlotService);
  private bookingService = inject(BookingService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  readonly customerAuth = inject(CustomerAuthService);

  readonly skeletonSlots = Array.from({ length: 6 });

  readonly services = SERVICES;
  readonly selectedService = signal<ServiceType | null>(null);

  readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  readonly viewMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly availability = signal<Record<string, number>>({});
  readonly loadingMonth = signal(false);

  readonly selectedDate = signal<string | null>(null);
  readonly slots = signal<Slot[]>([]);
  readonly selectedSlot = signal<Slot | null>(null);
  readonly submitting = signal(false);
  readonly loadingSlots = signal(false);
  readonly confirmed = signal<{ date: string; time: string; service: ServiceType } | null>(null);

  readonly monthLabel = computed(() =>
    this.viewMonth().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly hasRecommendedSlot = computed(() => this.slots().some((s) => s.recommended));

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const view = this.viewMonth();
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = this.toIso(new Date());
    const availability = this.availability();

    const days: CalendarDay[] = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, i - startOffset + 1);
      days.push(this.buildDay(d, false, todayIso, availability));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(this.buildDay(new Date(year, month, d), true, todayIso, availability));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      const d = new Date(last.date);
      d.setDate(d.getDate() + 1);
      days.push(this.buildDay(d, false, todayIso, availability));
    }
    return days;
  });

  // --- Login / registro ---
  readonly authView = signal<'login' | 'register'>('login');
  readonly authLoading = signal(false);

  readonly loginForm = this.fb.group({
    phone: ['', [Validators.required, spanishMobileValidator]],
    password: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.required, spanishMobileValidator]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // --- Cancelar una cita ---
  readonly mode = signal<'book' | 'cancel'>('book');
  readonly searching = signal(false);
  readonly searchResults = signal<CancelableBooking[] | null>(null);
  readonly cancellingId = signal<number | null>(null);
  readonly cancelledOne = signal(false);

  constructor() {
    this.loadMonthAvailability();
  }

  private toIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private buildDay(date: Date, inCurrentMonth: boolean, todayIso: string, availability: Record<string, number>): CalendarDay {
    const iso = this.toIso(date);
    return {
      date: iso,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isPast: iso < todayIso,
      isToday: iso === todayIso,
      hasAvailability: (availability[iso] || 0) > 0
    };
  }

  selectService(service: ServiceType): void {
    this.selectedService.set(service);
  }

  serviceLabel(service: ServiceType): string {
    return this.services.find((s) => s.value === service)?.label ?? service;
  }

  servicePrice(service: ServiceType): number {
    return this.services.find((s) => s.value === service)?.price ?? 0;
  }

  loadMonthAvailability(): void {
    this.loadingMonth.set(true);
    const view = this.viewMonth();
    const month = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}`;
    this.slotService.getAvailabilityByMonth(month).subscribe({
      next: (data) => {
        this.availability.set(data);
        this.loadingMonth.set(false);
      },
      error: () => this.loadingMonth.set(false)
    });
  }

  prevMonth(): void {
    const v = this.viewMonth();
    const now = new Date();
    const prev = new Date(v.getFullYear(), v.getMonth() - 1, 1);
    if (prev.getFullYear() < now.getFullYear() || (prev.getFullYear() === now.getFullYear() && prev.getMonth() < now.getMonth())) return;
    this.viewMonth.set(prev);
    this.loadMonthAvailability();
  }

  nextMonth(): void {
    const v = this.viewMonth();
    this.viewMonth.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
    this.loadMonthAvailability();
  }

  selectDay(day: CalendarDay): void {
    if (day.isPast || !day.hasAvailability) return;
    this.selectedDate.set(day.date);
    this.selectedSlot.set(null);
    this.loadSlots(day.date);
  }

  loadSlots(date: string): void {
    this.loadingSlots.set(true);
    this.slotService.getAvailableSlots(date).subscribe({
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

  changeService(): void {
    this.selectedService.set(null);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
  }

  submitBooking(): void {
    const slot = this.selectedSlot();
    const service = this.selectedService();
    if (!slot || !service) return;

    this.submitting.set(true);

    this.bookingService.createBooking({ slotId: slot.id, service }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmed.set({ date: slot.date, time: this.formatTime(slot.time), service });
        this.selectedSlot.set(null);
        this.loadMonthAvailability();
        if (this.selectedDate()) this.loadSlots(this.selectedDate()!);
      },
      error: (err) => {
        this.submitting.set(false);
        const message = err?.error?.message || 'No se pudo completar la reserva. Elige otro hueco.';
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        this.selectedSlot.set(null);
        if (this.selectedDate()) this.loadSlots(this.selectedDate()!);
        this.loadMonthAvailability();
      }
    });
  }

  newBooking(): void {
    this.confirmed.set(null);
    this.selectedService.set(null);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
  }

  // --- Login / registro ---
  goToLogin(): void {
    this.authView.set('login');
  }

  goToRegister(): void {
    this.authView.set('register');
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.authLoading.set(true);
    const { phone, password } = this.loginForm.getRawValue();
    this.customerAuth.login(phone!.trim(), password!).subscribe({
      next: () => {
        this.authLoading.set(false);
        this.loginForm.reset();
      },
      error: (err) => {
        this.authLoading.set(false);
        const message = err?.error?.message || 'No se pudo iniciar sesión.';
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
      }
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.authLoading.set(true);
    const { name, phone, password } = this.registerForm.getRawValue();
    this.customerAuth.register(name!.trim(), phone!.trim(), password!).subscribe({
      next: () => {
        this.authLoading.set(false);
        this.registerForm.reset();
      },
      error: (err) => {
        this.authLoading.set(false);
        const message = err?.error?.message || 'No se pudo completar el registro.';
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
      }
    });
  }

  logout(): void {
    this.customerAuth.logout();
    this.mode.set('book');
    this.newBooking();
    this.searchResults.set(null);
  }

  // --- Cancelar una cita ---
  goToCancel(): void {
    this.mode.set('cancel');
    this.searchResults.set(null);
    this.cancelledOne.set(false);
    this.searching.set(true);

    this.bookingService.findMyBookings().subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.searching.set(false);
      },
      error: () => {
        this.searching.set(false);
        this.snackBar.open('No se pudieron buscar tus citas. Inténtalo de nuevo.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  backToBooking(): void {
    this.mode.set('book');
  }

  cancelMyBooking(booking: CancelableBooking): void {
    confirmDialog(this.dialog, {
      title: 'Cancelar cita',
      message: `¿Seguro que quieres cancelar tu cita del ${booking.date} a las ${this.formatTime(booking.time)}?`,
      confirmLabel: 'Cancelar cita',
      cancelLabel: 'Volver',
      danger: true,
      icon: 'event_busy'
    }).subscribe((confirmed) => {
      if (!confirmed) return;

      this.cancellingId.set(booking.id);

      this.bookingService.cancelMyBooking(booking.id).subscribe({
        next: () => {
          this.cancellingId.set(null);
          this.cancelledOne.set(true);
          this.searchResults.set((this.searchResults() || []).filter((b) => b.id !== booking.id));
        },
        error: (err) => {
          this.cancellingId.set(null);
          const message = err?.error?.message || 'No se pudo cancelar la cita.';
          this.snackBar.open(message, 'Cerrar', { duration: 5000 });
        }
      });
    });
  }
}
