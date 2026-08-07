import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { SlotService } from '../../../core/services/slot.service';
import { Slot } from '../../../core/models/slot.model';
import { confirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';

interface GridDay {
  date: string;
  label: string;
  dayNumber: number;
}

type CellStatus = 'empty' | 'selected' | 'available' | 'blocked' | 'booked';

@Component({
  selector: 'app-admin-slots',
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
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './admin-slots.html',
  styleUrl: './admin-slots.scss'
})
export class AdminSlots {
  readonly gridTimes = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30'];
  readonly weekDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  readonly weekStart = signal(this.getMonday(new Date()));
  readonly weekSlots = signal<Slot[]>([]);
  readonly loadingWeek = signal(false);
  readonly pendingSelection = signal<Set<string>>(new Set());
  readonly creating = signal(false);

  readonly customDate = signal<Date>(new Date());
  customTimeInput = '';

  editingSlotId: number | null = null;
  editTimeValue = '';

  readonly gridDays = computed<GridDay[]>(() => {
    const start = this.weekStart();
    return this.weekDayNames.map((label, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { date: this.toIso(d), label, dayNumber: d.getDate() };
    });
  });

  readonly weekRangeLabel = computed(() => {
    const days = this.gridDays();
    if (days.length === 0) return '';
    const first = new Date(days[0].date);
    const last = new Date(days[days.length - 1].date);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return `${fmt(first)} – ${fmt(last)}`;
  });

  readonly slotsByKey = computed<Map<string, Slot>>(() => {
    const map = new Map<string, Slot>();
    for (const slot of this.weekSlots()) {
      map.set(`${slot.date}_${this.normalizeTime(slot.time)}`, slot);
    }
    return map;
  });

  // Huecos fuera de la cuadrícula estándar (otros días u horas) dentro de la semana visible
  readonly extraSlots = computed<Slot[]>(() => {
    const gridDates = new Set(this.gridDays().map((d) => d.date));
    const gridTimeSet = new Set(this.gridTimes);
    return this.weekSlots()
      .filter((s) => !gridDates.has(s.date) || !gridTimeSet.has(this.normalizeTime(s.time)))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  });

  constructor(private slotService: SlotService, private snackBar: MatSnackBar, private dialog: MatDialog) {
    this.loadWeek();
  }

  private toIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private normalizeTime(time: string): string {
    return time?.slice(0, 5) ?? time;
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  loadWeek(): void {
    this.loadingWeek.set(true);
    const days = this.gridDays();
    const from = days[0].date;
    const to = days[days.length - 1].date;
    // Ampliamos el rango a toda la semana (incluyendo sábado y domingo) para
    // mostrar también huecos personalizados creados fuera de lunes-viernes.
    const start = new Date(this.weekStart());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    this.slotService.getAllSlots(undefined, this.toIso(start), this.toIso(end)).subscribe({
      next: (slots) => {
        this.weekSlots.set(slots);
        this.loadingWeek.set(false);
      },
      error: () => {
        this.loadingWeek.set(false);
        this.notify('No se pudieron cargar los huecos de la semana.');
      }
    });
  }

  prevWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() - 7);
    this.weekStart.set(d);
    this.pendingSelection.set(new Set());
    this.loadWeek();
  }

  nextWeek(): void {
    const d = new Date(this.weekStart());
    d.setDate(d.getDate() + 7);
    this.weekStart.set(d);
    this.pendingSelection.set(new Set());
    this.loadWeek();
  }

  cellStatus(date: string, time: string): CellStatus {
    const key = `${date}_${time}`;
    const slot = this.slotsByKey().get(key);
    if (slot) return slot.status as CellStatus;
    if (this.pendingSelection().has(key)) return 'selected';
    return 'empty';
  }

  cellSlot(date: string, time: string): Slot | undefined {
    return this.slotsByKey().get(`${date}_${time}`);
  }

  toggleCell(date: string, time: string): void {
    const status = this.cellStatus(date, time);
    const key = `${date}_${time}`;

    if (status === 'empty' || status === 'selected') {
      const next = new Set(this.pendingSelection());
      if (next.has(key)) next.delete(key);
      else next.add(key);
      this.pendingSelection.set(next);
      return;
    }

    const slot = this.cellSlot(date, time);
    if (!slot || slot.status === 'booked') return;

    const action = slot.status === 'blocked' ? this.slotService.unblockSlot(slot.id) : this.slotService.blockSlot(slot.id);
    action.subscribe({
      next: () => this.loadWeek(),
      error: (err) => this.notify(err?.error?.message || 'Operación no permitida.')
    });
  }

  get pendingCount(): number {
    return this.pendingSelection().size;
  }

  createSelected(): void {
    if (this.pendingCount === 0) return;
    const slots = Array.from(this.pendingSelection()).map((key) => {
      const [date, time] = key.split('_');
      return { date, time: `${time}:00`, durationMinutes: 30 };
    });

    this.creating.set(true);
    this.slotService.createSlotsBulk(slots).subscribe({
      next: (res) => {
        this.creating.set(false);
        this.pendingSelection.set(new Set());
        this.notify(res.message || 'Huecos creados.');
        this.loadWeek();
      },
      error: (err) => {
        this.creating.set(false);
        this.notify(err?.error?.message || 'No se pudieron crear los huecos.');
      }
    });
  }

  clearSelection(): void {
    this.pendingSelection.set(new Set());
  }

  // Huecos personalizados fuera de la cuadrícula (cualquier día/hora)
  addCustomSlot(): void {
    const value = this.customTimeInput.trim();
    if (!value) {
      this.notify('Indica una hora.');
      return;
    }
    const normalized = value.length === 5 ? `${value}:00` : value;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      this.notify('Formato de hora inválido. Usa HH:mm.');
      return;
    }

    const date = this.toIso(this.customDate());
    this.slotService.createSlots(date, [normalized]).subscribe({
      next: (res) => {
        this.notify(res.message || 'Hueco creado.');
        this.customTimeInput = '';
        this.loadWeek();
      },
      error: (err) => this.notify(err?.error?.message || 'No se pudo crear el hueco.')
    });
  }

  onCustomDateChange(date: Date | null): void {
    if (date) this.customDate.set(date);
  }

  deleteSlot(slot: Slot): void {
    confirmDialog(this.dialog, {
      title: 'Eliminar hueco',
      message: `¿Eliminar el hueco del ${slot.date} a las ${this.normalizeTime(slot.time)}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
      icon: 'delete'
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.slotService.deleteSlot(slot.id).subscribe({
        next: () => this.loadWeek(),
        error: (err) => this.notify(err?.error?.message || 'No se pudo eliminar el hueco.')
      });
    });
  }

  startEdit(slot: Slot): void {
    this.editingSlotId = slot.id;
    this.editTimeValue = this.normalizeTime(slot.time);
  }

  cancelEdit(): void {
    this.editingSlotId = null;
    this.editTimeValue = '';
  }

  saveEdit(slot: Slot): void {
    const normalized = this.editTimeValue.length === 5 ? `${this.editTimeValue}:00` : this.editTimeValue;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      this.notify('Formato de hora inválido.');
      return;
    }
    this.slotService.updateSlot(slot.id, { time: normalized }).subscribe({
      next: () => {
        this.cancelEdit();
        this.loadWeek();
      },
      error: (err) => this.notify(err?.error?.message || 'No se pudo modificar el hueco.')
    });
  }

  formatTime(time: string): string {
    return time?.slice(0, 5) ?? time;
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'available': return 'Disponible';
      case 'blocked': return 'Bloqueado';
      case 'booked': return 'Reservado';
      case 'selected': return 'Seleccionado para crear';
      case 'empty': return 'Libre, toca para seleccionar';
      default: return status || '';
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
