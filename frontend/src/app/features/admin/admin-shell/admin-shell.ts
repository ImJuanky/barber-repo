import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../../core/services/auth.service';
import { CustomerAuthService } from '../../../core/services/customer-auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  // Se puede entrar aquí como admin "clásico" (login por email) o como
  // cliente cuyo teléfono tiene permisos de administrador. Se muestra el
  // nombre de quien esté realmente conectado.
  readonly displayName = computed(
    () => this.auth.currentAdmin()?.name || this.customerAuth.currentCustomer()?.name || ''
  );

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
