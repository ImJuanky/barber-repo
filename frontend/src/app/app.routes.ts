import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'reservar',
    loadComponent: () =>
      import('./features/client-booking/client-booking').then((m) => m.ClientBooking)
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login').then((m) => m.AdminLogin)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-shell/admin-shell').then((m) => m.AdminShell),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'reservas', pathMatch: 'full' },
      {
        path: 'reservas',
        loadComponent: () =>
          import('./features/admin/admin-bookings/admin-bookings').then((m) => m.AdminBookings)
      },
      {
        path: 'huecos',
        loadComponent: () =>
          import('./features/admin/admin-slots/admin-slots').then((m) => m.AdminSlots)
      },
      {
        path: 'calendario',
        loadComponent: () =>
          import('./features/admin/admin-calendar/admin-calendar').then((m) => m.AdminCalendar)
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/admin/admin-stats/admin-stats').then((m) => m.AdminStats)
      }
    ]
  },
  { path: '', redirectTo: 'reservar', pathMatch: 'full' },
  { path: '**', redirectTo: 'reservar' }
];
