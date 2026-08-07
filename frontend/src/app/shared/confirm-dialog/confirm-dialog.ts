import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable, map } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo de advertencia (acción destructiva: cancelar cita, eliminar hueco...). */
  danger?: boolean;
  icon?: string;
}

// Diálogo de confirmación genérico y reutilizable: sustituye a los
// `window.confirm()` nativos (poco cuidados visualmente y no accesibles)
// por un modal coherente con el resto de la aplicación. Se usa tanto en el
// panel de administración como en el flujo de cliente.
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="confirm-dialog" [class.danger]="data.danger">
      <div class="confirm-icon">
        <mat-icon>{{ data.icon || (data.danger ? 'warning' : 'help') }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button [mat-dialog-close]="false" cdkFocusInitial>
          {{ data.cancelLabel || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          [color]="data.danger ? 'warn' : 'primary'"
          [mat-dialog-close]="true"
        >
          {{ data.confirmLabel || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      display: flex;
      flex-direction: column;
      padding: 4px 4px 0;
      max-width: 360px;
    }

    .confirm-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
      margin-bottom: 12px;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    .confirm-dialog.danger .confirm-icon {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    h2[mat-dialog-title] {
      margin: 0 0 4px;
      font-size: 1.1rem;
      font-weight: 700;
    }

    mat-dialog-content {
      color: var(--mat-sys-on-surface-variant);
      font-size: 0.92rem;
      padding: 0;
      margin: 0 0 8px;
    }

    mat-dialog-actions {
      padding: 8px 0 0;
    }
  `]
})
export class ConfirmDialogComponent {
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

// Helper de conveniencia para no repetir dialog.open(...) en cada componente.
export function confirmDialog(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return dialog
    .open(ConfirmDialogComponent, { data, autoFocus: 'first-tabbable', restoreFocus: true })
    .afterClosed()
    .pipe(map((result) => !!result));
}
