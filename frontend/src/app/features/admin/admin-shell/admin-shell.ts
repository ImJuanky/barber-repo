import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  readonly navItems: NavItem[] = [
    { path: '/admin/reservas', label: 'Reservas', shortLabel: 'Reservas', icon: 'event_available' },
    { path: '/admin/huecos', label: 'Huecos', shortLabel: 'Huecos', icon: 'schedule' },
    { path: '/admin/calendario', label: 'Calendario', shortLabel: 'Calendario', icon: 'calendar_month' },
    { path: '/admin/estadisticas', label: 'Estadísticas', shortLabel: 'Stats', icon: 'bar_chart' }
  ];

  // Se puede entrar aquí como admin "clásico" (login por email) o como
  // cliente cuyo teléfono tiene permisos de administrador. Se muestra el
  // nombre de quien esté realmente conectado.
  readonly displayName = computed(
    () => this.auth.currentAdmin()?.name || this.customerAuth.currentCustomer()?.name || 'Admin'
  );

  readonly initials = computed(() => {
    const name = this.displayName();
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'A';
  });

  constructor(public auth: AuthService, private customerAuth: CustomerAuthService, private router: Router) {}

  logout(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.logout();
      return;
    }
    // Sesión de cliente-administrador: se cierra su sesión de cliente y se
    // vuelve a la página de reserva (no tiene login de admin propio).
    this.customerAuth.logout();
    this.router.navigate(['/reservar']);
  }
}
