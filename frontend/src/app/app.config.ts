import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { customerAuthInterceptor } from './core/interceptors/customer-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withViewTransitions: cross-fade nativo del navegador entre rutas, sin
    // JS de animación ni coste de rendimiento apreciable.
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor, customerAuthInterceptor])),
    provideAnimationsAsync()
  ]
};
