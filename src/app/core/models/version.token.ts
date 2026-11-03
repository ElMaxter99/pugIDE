import { InjectionToken } from '@angular/core';
// Import con nombre: el bundler descarta el resto de package.json (si no, sus dependencias de desarrollo acabarían en el JS).
import { version } from '../../../../package.json';

export const APP_VERSION = new InjectionToken<string>('App version', {
  providedIn: 'root',
  factory: () => version,
});
