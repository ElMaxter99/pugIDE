import { Injectable, signal } from '@angular/core';

/** Estado de la interfaz compartido entre componentes (paneles flotantes y diálogos). */
@Injectable({ providedIn: 'root' })
export class UiState {
  /** Diálogo "Mis proyectos". */
  readonly projectsOpen = signal(false);
  /** Paleta de comandos (Ctrl+K). */
  readonly paletteOpen = signal(false);
  /** Diálogo de atajos de teclado. */
  readonly shortcutsOpen = signal(false);
  /** Diálogo para añadir un idioma (`/locales/<código>/translations.json`). */
  readonly addLocaleOpen = signal(false);
}
