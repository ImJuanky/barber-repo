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
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { SlotService } from '../../../core/services/slot.service';
import { Slot } from '../../../core/models/slot.model';

@Component({
  selector: 'app-admin-slots',
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
    MatChipsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './admin-slots.html',
  styleUrl: './admin-slots.scss'
})
export class AdminSlots {
  readonly selectedDate = signal<Date>(new Date());
  readonly slots = signal<Slot[]>([]);
  readonly loading = signal(false);
  readonly newTimes = signal<string[]>([]);
  newTimeInput = '';
  editingSlotId: number | null = null;
  editTimeValue = '';

  constructor(private slotService: SlotService, private snackBar: MatSnackBar) {
    this.loadSlots();
  }

  private toIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  get isoDate(): string {
    return this.toIsoDate(this.selectedDate());
  }

  onDateChange(date: Date | null): void {
    if (!date) return;
    this.selectedDate.set(date);
    this.newTimes.set([]);
    this.loadSlots();
  }

  loadSlots(): void {
    this.loading.set(true);
    this.slotService.getAllSlots(this.isoDate).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify('No se pudieron cargar los huecos.');
      }
    });
  }

  addTimeToList(): void {
    const value = this.newTimeInput.trim();
    if (!value) return;
    const normalized = value.length === 5 ? `${value}:00` : value;
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
      this.notify('Formato de hora inválido. Usa HH:mm.');
      return;
    }
    if (!this.newTimes().includes(normalized)) {
      this.newTimes.update((times) => [...times, normalized].sort());
    }
    this.newTimeInput = '';
  }

  removeTimeFromList(time: string): void {
    this.newTimes.update((times) => times.filter((t) => t !== time));
  }

  createSlots(): void {
    if (this.newTimes().length === 0) {
      this.notify('Añade al menos una hora.');
      return;
    }
    this.slotService.createSlots(this.isoDate, this.newTimes()).subscribe({
      next: (res) => {
        this.notify(res.message || 'Huecos creados.');
        this.newTimes.set([]);
        this.loadSlots();
      },
      error: (err) => this.notify(err?.error?.message || 'No se pudieron crear los huecos.')
    });
  }

  toggleBlock(slot: Slot): void {
    const action = slot.status === 'blocked'
      ? this.slotService.unblockSlot(slot.id)
      : this.slotService.blockSlot(slot.id);

    action.subscribe({
      next: () => this.loadSlots(),
      error: (err) => this.notify(err?.error?.message || 'Operación no permitida.')
    });
  }

  deleteSlot(slot: Slot): void {
    if (!confirm(`¿Eliminar el hueco de las ${this.formatTime(slot.time)}?`)) return;
    this.slotService.deleteSlot(slot.id).subscribe({
      next: () => this.loadSlots(),
      error: (err) => this.notify(err?.error?.message || 'No se pudo eliminar el hueco.')
    });
  }

  startEdit(slot: Slot): void {
    this.editingSlotId = slot.id;
    this.editTimeValue = this.formatTime(slot.time);
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
        this.loadSlots();
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
      default: return status || '';
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
