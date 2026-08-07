import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { SlotService } from '../../../core/services/slot.service';
import { Slot } from '../../../core/models/slot.model';

interface CalendarDay {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  slots: Slot[];
}

@Component({
  selector: 'app-admin-calendar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './admin-calendar.html',
  styleUrl: './admin-calendar.scss'
})
export class AdminCalendar {
  readonly viewDate = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly slotsByDate = signal<Record<string, Slot[]>>({});
  readonly loading = signal(false);
  readonly selectedDay = signal<CalendarDay | null>(null);

  readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  readonly monthLabel = computed(() =>
    this.viewDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  );

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // lunes = 0 ... domingo = 6
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayIso = this.toIso(new Date());

    const days: CalendarDay[] = [];

    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, i - startOffset + 1);
      days.push(this.buildDay(d, false, todayIso));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(this.buildDay(new Date(year, month, d), true, todayIso));
    }
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1];
      const d = new Date(last.date);
      d.setDate(d.getDate() + 1);
      days.push(this.buildDay(d, false, todayIso));
    }

    return days;
  });

  constructor(private slotService: SlotService) {
    this.loadMonth();
  }

  private toIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private buildDay(date: Date, inCurrentMonth: boolean, todayIso: string): CalendarDay {
    const iso = this.toIso(date);
    return {
      date: iso,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isToday: iso === todayIso,
      slots: this.slotsByDate()[iso] || []
    };
  }

  loadMonth(): void {
    this.loading.set(true);
    const view = this.viewDate();
    const month = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}`;
    this.slotService.getMonthView(month).subscribe({
      next: (data) => {
        this.slotsByDate.set(data);
        this.loading.set(false);
        this.selectedDay.set(null);
      },
      error: () => this.loading.set(false)
    });
  }

  prevMonth(): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
    this.loadMonth();
  }

  nextMonth(): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
    this.loadMonth();
  }

  selectDay(day: CalendarDay): void {
    this.selectedDay.set(day);
  }

  countByStatus(day: CalendarDay, status: string): number {
    return day.slots.filter((s) => s.status === status).length;
  }

  formatTime(time: string): string {
    return time?.slice(0, 5) ?? time;
  }
}
