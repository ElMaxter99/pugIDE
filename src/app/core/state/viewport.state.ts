import { Injectable, computed, signal } from '@angular/core';

/** Por debajo de este ancho las barras superior y de estado pasan a su versión compacta (P-19). */
export const COMPACT_WIDTH = 900;
/** Alto de las barras superior y de estado, y lo mínimo que debe quedarle al editor para que el panel inferior se enseñe entero. */
export const TOPBAR_HEIGHT = 64;
export const STATUSBAR_HEIGHT = 32;
export const MIN_EDITOR_HEIGHT = 240;

/** Altura del panel inferior: `clamp(120px, 33vh, 240px)`. */
export function bottomPanelHeight(viewportHeight: number): number {
  return Math.round(Math.min(240, Math.max(120, viewportHeight * 0.33)));
}

/** ¿El editor se quedaría con menos de 240 px de alto con el panel inferior enseñado entero? Entonces el panel se recoge en una franja. */
export function bottomPanelCompact(viewportHeight: number): boolean {
  return viewportHeight - TOPBAR_HEIGHT - STATUSBAR_HEIGHT - bottomPanelHeight(viewportHeight) < MIN_EDITOR_HEIGHT;
}

/** Tamaño de la ventana (para las versiones compactas de las barras y el panel inferior). */
@Injectable({ providedIn: 'root' })
export class ViewportState {
  readonly width = signal(typeof window === 'undefined' ? 1440 : window.innerWidth);
  readonly height = signal(typeof window === 'undefined' ? 900 : window.innerHeight);
  readonly compact = computed(() => this.width() < COMPACT_WIDTH);
  readonly bottomCompact = computed(() => bottomPanelCompact(this.height()));

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.width.set(window.innerWidth);
        this.height.set(window.innerHeight);
      });
    }
  }
}
