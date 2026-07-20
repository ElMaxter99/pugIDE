import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'ide',
    loadComponent: () =>
      import('./layout/main-layout.component').then(m => m.MainLayoutComponent),
  },
  { path: '**', redirectTo: '' },
];
