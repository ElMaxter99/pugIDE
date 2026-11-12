import { Injectable, computed, inject, signal } from '@angular/core';
import { UiState } from '../state/ui.state';
import { OrchestratorService } from './orchestrator.service';
import { WorkspaceService } from './workspace.service';
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
  /** Actualizar dentro de la app (P-35/P-36); null en una app de escritorio anterior a la 0.14. */
  self?: SelfUpdateState | null;
  /** Versión a la que se acaba de actualizar (aviso al abrir), o null. */
  justUpdated?: string | null;
}

export interface SelfUpdateState {
  phase: 'idle' | 'downloading' | 'ready' | 'error';
  version: string | null;
  percent: number;
  transferred: number;
  total: number;
  /** offline | checksum | missing | other */
  error: string | null;
  installOnQuit: boolean;
  /** Esta instalación se puede actualizar sola (instalador de Windows, AppImage, .deb, .rpm). */
  canUpdate: boolean;
  /** Si no: portable | mac | dev | linux-unknown. */
  cannotReason: string | null;
  /** .deb o .rpm: el sistema pedirá la contraseña al instalar. */
  linuxPackage: string | null;
}

/**
 * Aviso de versión nueva de la app de escritorio (P-27) y actualizar dentro de la app (P-35/P-36). Apagado mientras la
 * persona no lo acepte: sin su permiso la app no hace ninguna llamada de red. Nada se descarga ni se instala sin pulsar
 * «Actualizar»; donde el sistema no deja (macOS, portable) se ofrece «Descargar», que abre la página de la versión.
 */
@Injectable({ providedIn: 'root' })
export class DesktopUpdateService {
  private readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly workspace = inject(WorkspaceService);
  readonly available = desktopHasSystem();
  readonly state = signal<UpdateState | null>(null);
  readonly checking = signal(false);
  /** Resultado de la última búsqueda hecha a mano (null: aún no se ha buscado en esta sesión). */
  readonly lastManual = signal<'ok' | 'offline' | null>(null);
  /** Hay que preguntar (una sola vez) si se quiere el aviso. */
  readonly mustAsk = computed(() => this.available && this.state() !== null && !this.state()!.asked);
  /** Barra «Hay una versión nueva». */
  readonly showBar = computed(() => {
    const s = this.state();
    if (!s) return false;
    const phase = s.self?.phase ?? 'idle';
    if (phase === 'downloading' || phase === 'error') return true;
    if (phase === 'ready') return !s.self!.installOnQuit;
    return s.enabled && !!s.latest && !s.dismissed;
  });
  readonly self = computed(() => this.state()?.self ?? null);
  /** «Actualizar» (se instala sola) o «Descargar» (macOS, portable, desde el código, app anterior). */
  readonly canUpdate = computed(() => !!this.self()?.canUpdate);
  /** Aviso «PugIDE se ha actualizado a X», abajo a la derecha, hasta que se cierra. */
  readonly justUpdated = computed(() => this.state()?.justUpdated ?? null);

  constructor() {
    if (!this.available) return;
    void this.refresh();
    onDesktopEvent((e) => {
      if (e.type === 'updates-changed') void this.refresh();
      else if (e.type === 'upd-progress' && e['update']) this.state.update((s) => (s ? { ...s, self: e['update'] as SelfUpdateState } : s));
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

  /** «Ver novedades», «Descargar» y «Descargar desde GitHub»: la página de la versión en el navegador. */
  openRelease(): void {
    void desktopInvoke('upd:open-release').catch(() => desktopInvoke('upd:download').catch(() => undefined));
  }

  /** «Actualizar» y «Reintentar»: descarga la versión nueva (el progreso llega por eventos). */
  async update(): Promise<void> {
    if (!this.canUpdate()) { this.openRelease(); return; }
    try { await desktopInvoke('upd:update'); } catch { /* el error llega como estado */ }
    await this.refresh();
  }

  async cancel(): Promise<void> {
    try { await desktopInvoke('upd:cancel'); } catch { /* sin cambios */ }
    await this.refresh();
  }

  /** «Reiniciar y actualizar» (guarda todo antes) o «Al cerrar PugIDE». */
  async install(when: 'now' | 'quit'): Promise<void> {
    if (when === 'now') {
      this.orchestrator.saveSession();
      try { await this.workspace.flush(); } catch { /* sin espacio abierto */ }
    }
    try { await desktopInvoke('upd:install', { when }); } catch { /* sin cambios */ }
    if (when === 'quit') await this.refresh();
  }

  async ackUpdated(): Promise<void> {
    try { this.state.set(await desktopInvoke<UpdateState>('upd:ack-updated')); } catch { this.state.update((s) => (s ? { ...s, justUpdated: null } : s)); }
  }
}
