import { InjectionToken } from '@angular/core';
import pkg from '../../../../package.json';

export const APP_VERSION = new InjectionToken<string>('App version', {
  providedIn: 'root',
  factory: () => pkg.version,
});
