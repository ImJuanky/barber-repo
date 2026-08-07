import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CustomerAuthService } from '../services/customer-auth.service';

// Las peticiones a /api/admin/* llevan el token de administrador "clásico"
// (login por email) si existe. Si no hay sesión de admin pero sí una sesión
// de cliente cuyo teléfono está en la lista de administradores (backend
// config/roles.js), se reutiliza ese mismo token de cliente: el backend ya
// sabe aceptarlo para rutas de admin (ver middleware/auth.js). No se crea
// ningún token ni almacenamiento nuevo, solo se reutilizan los existentes.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const customerAuth = inject(CustomerAuthService);
  const router = inject(Router);

  const isAdminRoute = req.url.includes('/admin');
  const adminToken = auth.getToken();
  const customerIsAdmin = customerAuth.currentCustomer()?.isAdmin === true;
  const fallbackToken = customerIsAdmin ? customerAuth.getToken() : null;
  const token = adminToken || (isAdminRoute ? fallbackToken : null);
  const usingAdminToken = !!adminToken;

  const authReq = token && isAdminRoute
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && isAdminRoute && usingAdminToken) {
        auth.logout();
        router.navigate(['/admin/login']);
      }
      return throwError(() => err);
    })
  );
};
