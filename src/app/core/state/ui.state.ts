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
  /** Diálogo con el historial de versiones del archivo activo. */
  readonly historyOpen = signal(false);
  /** Diálogo de instantáneas del proyecto (guardar, comparar, restaurar). */
  readonly snapshotsOpen = signal(false);
  /** Orden al editor desde fuera de él (paleta): `id` de la acción de Monaco o `pug.searchInProject`; `n` fuerza cada petición. */
  readonly editorCommand = signal<{ id: string; n: number } | null>(null);

  requestEditorCommand(id: string): void {
    this.editorCommand.set({ id, n: (this.editorCommand()?.n ?? 0) + 1 });
  }
}
