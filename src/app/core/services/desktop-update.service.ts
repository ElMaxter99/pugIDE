import { Injectable, computed, inject, signal } from '@angular/core';
import { UiState } from '../state/ui.state';
import { desktopHasSystem, desktopInvoke, onDesktopEvent } from '../utils/desktop.util';

export interface UpdateState {
  current: string;
  /** Ya se preguntó si se quiere el aviso. */
  asked: boolean;
  enabled: boolean;
  lastCheck: number;
  /** Versión más nueva que la instalada, si la hay. */
  latest: { version: string; url: string } | null;
  /** La persona dijo «Ahora no» para esa versión. */
  dismissed: boolean;
  checked?: boolean;
  reason?: string | null;
}

/**
 * Aviso de versión nueva de la app de escritorio (P-27). Apagado mientras la persona no lo acepte: sin su permiso la app
 * no hace ninguna llamada de red. No instala nada: «Descargar» abre la página de la versión en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class DesktopUpdateService {
  private readonly ui = inject(UiState);
  readonly available = desktopHasSystem();
  readonly state = signal<UpdateState | null>(null);
  readonly checking = signal(false);
  /** Resultado de la última búsqueda hecha a mano (null: aún no se ha buscado en esta sesión). */
  readonly lastManual = signal<'ok' | 'offline' | null>(null);
  /** Hay que preguntar (una sola vez) si se quiere el aviso. */
  readonly mustAsk = computed(() => this.available && this.state() !== null && !this.state()!.asked);
  /** Barra «Hay una versión nueva». */
  readonly showBar = computed(() => { const s = this.state(); return !!s && s.enabled && !!s.latest && !s.dismissed; });

  constructor() {
    if (!this.available) return;
    void this.refresh();
    onDesktopEvent((e) => {
      if (e.type === 'updates-changed') void this.refresh();
      else if (e.type === 'open-updates') this.ui.updatesOpen.set(true);
      else if (e.type === 'open-workspaces') this.ui.workspacesOpen.set(true);
    });
  }

  async refresh(): Promise<void> {
    try { this.state.set(await desktopInvoke<UpdateState>('upd:state')); } catch { /* app antigua */ }
  }

  async answer(enabled: boolean): Promise<void> {
    try { this.state.set(await desktopInvoke<UpdateState>('upd:answer', { enabled })); } catch { /* sin cambios */ }
  }

  async check(): Promise<void> {
    this.checking.set(true);
    try {
      const s = await desktopInvoke<UpdateState>('upd:check');
      this.state.set(s);
      this.lastManual.set(s.checked ? 'ok' : 'offline');
    } catch { this.lastManual.set('offline'); }
    this.checking.set(false);
  }

  async dismiss(): Promise<void> {
    try { this.state.set(await desktopInvoke<UpdateState>('upd:dismiss')); } catch { /* sin cambios */ }
  }

  download(): void {
    void desktopInvoke('upd:download').catch(() => undefined);
  }
}
