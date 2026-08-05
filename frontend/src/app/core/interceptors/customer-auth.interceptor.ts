import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { CustomerAuthService } from '../services/customer-auth.service';

// Adjunta el token del cliente en /bookings (público de cliente, no /admin/bookings)
// y en /customers. Si el token caduca o es inválido, cierra la sesión localmente
// para que la interfaz vuelva a mostrar el login (no hay una ruta dedicada a la
// que redirigir, el login vive dentro de la propia página de reserva).
export const customerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(CustomerAuthService);
  const token = auth.getToken();
  const isCustomerRoute = (req.url.includes('/bookings') && !req.url.includes('/admin')) || req.url.includes('/customers');

  const authReq = token && isCustomerRoute
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && isCustomerRoute) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
