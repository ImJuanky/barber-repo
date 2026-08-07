import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CustomerAuthService } from '../services/customer-auth.service';

// Deja pasar tanto al admin "clásico" (login por email) como a un cliente
// autenticado por teléfono cuyo número esté en la lista de administradores
// (el backend es quien decide esto de verdad; aquí solo evitamos mostrar el
// panel a quien no lo vería funcionar igualmente por falta de permisos).
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const customerAuth = inject(CustomerAuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;
  if (customerAuth.currentCustomer()?.isAdmin) return true;

  router.navigate(['/admin/login']);
  return false;
};
