import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { isDesktopApp } from './core/utils/desktop.util';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      // En escritorio no hay service worker: la app va dentro del instalador y se actualiza con él.
      enabled: !isDevMode() && !isDesktopApp(),
      // Inmediato: esperar a que la app «se estabilice» (hasta 30 s) retrasaba la primera comprobación de versión nueva.
      registrationStrategy: 'registerImmediately',
    }),
  ],
};
