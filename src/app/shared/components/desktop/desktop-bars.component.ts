import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DesktopUpdateService } from '../../../core/services/desktop-update.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { UiState } from '../../../core/state/ui.state';

/**
 * Avisos de la app de escritorio bajo la barra superior: versión nueva y actualizar dentro de la app (P-27, P-35/P-36) y
 * archivos que cambiaron en disco (P-26). Más el aviso «PugIDE se ha actualizado a X», abajo a la derecha.
 */
@Component({
  selector: 'app-desktop-bars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updates.showBar()) {
      @switch (phase()) {
        @case ('downloading') {
          <div class="bar update" role="status" data-testid="update-bar" data-phase="downloading">
            <span aria-hidden="true" class="material-symbols-outlined">download</span>
            <div class="text">
              <div>Descargando PugIDE <strong>{{ version() }}</strong>… <span data-testid="update-percent">{{ self()!.percent }} %</span>@if (self()!.total) { · {{ mb(self()!.transferred) }} de {{ mb(self()!.total) }} MB }</div>
              <div class="progress" role="progressbar" aria-label="Descarga de la versión nueva" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="self()!.percent"><div class="fill" [style.width.%]="self()!.percent"></div></div>
            </div>
            <button type="button" class="btn" data-testid="update-cancel" (click)="updates.cancel()">Cancelar</button>
          </div>
        }
        @case ('ready') {
          <div class="bar update ready" role="status" data-testid="update-bar" data-phase="ready">
            <span aria-hidden="true" class="material-symbols-outlined">check_circle</span>
            <span class="text">PugIDE <strong>{{ version() }}</strong> está lista.
              @if (self()!.linuxPackage) { Al reiniciar, el sistema te pedirá tu contraseña para instalar el paquete. } @else { Se instala al reiniciar (unos segundos); tus proyectos y espacios se guardan antes. }</span>
            <button type="button" class="btn" data-testid="update-on-quit" (click)="updates.install('quit')">Al cerrar PugIDE</button>
            <button type="button" class="btn primary" data-testid="update-restart" (click)="updates.install('now')"><span aria-hidden="true" class="material-symbols-outlined">sync</span>Reiniciar y actualizar</button>
          </div>
        }
        @case ('error') {
          <div class="bar update error" role="alert" data-testid="update-bar" data-phase="error">
            <span aria-hidden="true" class="material-symbols-outlined">error</span>
            <span class="text" data-testid="update-error"><strong>No se pudo actualizar a {{ version() }}.</strong> {{ errorText() }} No se ha cambiado nada: sigues con la {{ updates.state()!.current }}.</span>
            <button type="button" class="btn link" data-testid="update-github" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Descargar desde GitHub</button>
            <button type="button" class="btn primary" data-testid="update-retry" (click)="updates.update()"><span aria-hidden="true" class="material-symbols-outlined">refresh</span>Reintentar</button>
          </div>
        }
        @default {
          <div class="bar update" role="status" data-testid="update-bar" data-phase="idle">
            <span aria-hidden="true" class="material-symbols-outlined">update</span>
            <span class="text">Hay una versión nueva de PugIDE: <strong>{{ updates.state()!.latest!.version }}</strong> (tienes la {{ updates.state()!.current }}).</span>
            <button type="button" class="btn link" data-testid="update-notes" title="Abre la página de la versión en el navegador" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Ver novedades</button>
            <button type="button" class="btn" data-testid="update-later" (click)="updates.dismiss()">Ahora no</button>
            @if (updates.canUpdate()) {
              <button type="button" class="btn primary" data-testid="update-now" (click)="updates.update()"><span aria-hidden="true" class="material-symbols-outlined">download</span>Actualizar</button>
            } @else {
              <button type="button" class="btn primary" data-testid="update-download" [title]="manualHint()" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Descargar</button>
            }
          </div>
        }
      }
    }
    @if (updates.justUpdated(); as v) {
      <div class="toast" role="status" data-testid="update-done">
        <span aria-hidden="true" class="material-symbols-outlined ok">check_circle</span>
        <div class="toast-body">
          <div><strong>PugIDE se ha actualizado a {{ v }}</strong></div>
          <div class="small">Tus proyectos están como los dejaste.</div>
          <button type="button" class="btn link" data-testid="update-done-notes" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Ver novedades</button>
        </div>
        <button type="button" class="close" aria-label="Cerrar aviso" data-testid="update-done-close" (click)="updates.ackUpdated()">×</button>
      </div>
    }
    @for (c of workspace.conflicts(); track c.path) {
      <div class="bar conflict" role="alert" data-testid="workspace-conflict">
        <span aria-hidden="true" class="material-symbols-outlined">sync_problem</span>
        <span class="text"><strong>{{ c.path.slice(1) }}</strong> {{ c.disk === null ? 'se ha borrado en el disco' : 'ha cambiado en el disco' }} y aquí tiene cambios sin guardar.</span>
        <button type="button" class="btn link" data-testid="conflict-diff" (click)="ui.conflictDiffPath.set(c.path)"><span aria-hidden="true" class="material-symbols-outlined">swap_horiz</span>Ver diferencias</button>
        <button type="button" class="btn" data-testid="conflict-mine" (click)="workspace.resolveConflict(c.path, 'mine')">Quedarme con lo mío</button>
        <button type="button" class="btn primary" data-testid="conflict-disk" (click)="workspace.resolveConflict(c.path, 'disk')">{{ c.disk === null ? 'Borrarlo aquí también' : 'Cargar el del disco' }}</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 6px 16px; font-size: 13px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); background: var(--bg-active); }
    .bar.conflict { border-bottom-color: var(--warning-color); }
    .bar .material-symbols-outlined { font-size: 20px; color: var(--accent-color); }
    .bar.conflict > .material-symbols-outlined { color: var(--warning-color); }
    .text { flex: 1; min-width: 200px; overflow-wrap: anywhere; }
    .btn { padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border-color: var(--accent-color); color: var(--text-on-primary); }
    .btn { display: inline-flex; align-items: center; gap: 6px; }
    .btn .material-symbols-outlined { font-size: 16px; color: inherit; }
    .btn.link { background: none; border-color: transparent; color: var(--accent-color); padding: 5px 6px; }
    .btn.link:hover { text-decoration: underline; background: none; }
    .bar.ready { border-bottom-color: var(--success-color); }
    .bar.ready > .material-symbols-outlined { color: var(--success-color); }
    .bar.error { border-bottom-color: var(--error-color); }
    .bar.error > .material-symbols-outlined { color: var(--error-color); }
    .progress { height: 6px; margin-top: 4px; border-radius: 3px; background: var(--bg-input); border: 1px solid var(--border-color); overflow: hidden; }
    .fill { height: 100%; background: var(--accent-color); transition: width 0.2s; }
    .toast { position: fixed; right: 16px; bottom: 40px; z-index: 1500; width: 380px; max-width: calc(100vw - 32px); display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); font-size: 13px; color: var(--text-primary); }
    .toast .ok { color: var(--success-color); font-size: 20px; }
    .toast-body { flex: 1; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
    .small { font-size: 12px; color: var(--text-secondary); }
    .close { width: 24px; height: 24px; border: 0; background: transparent; color: var(--text-secondary); font-size: 18px; line-height: 1; cursor: pointer; border-radius: 4px; }
    .close:hover { background: var(--bg-hover); }
  `],
})
export class DesktopBarsComponent {
  protected readonly updates = inject(DesktopUpdateService);
  protected readonly workspace = inject(WorkspaceService);
  protected readonly ui = inject(UiState);
  protected readonly self = this.updates.self;
  protected readonly phase = computed(() => this.self()?.phase ?? 'idle');
  protected readonly version = computed(() => this.self()?.version ?? this.updates.state()?.latest?.version ?? '');
  protected readonly errorText = computed(() => ({
    offline: 'La descarga se cortó (sin conexión).',
    checksum: 'El archivo descargado no coincide con el publicado, así que no se ha instalado.',
    missing: 'Esta versión aún no tiene preparada la actualización en GitHub.',
  } as Record<string, string>)[this.self()?.error ?? ''] ?? 'Ha fallado la descarga.');
  protected readonly manualHint = computed(() => ({
    portable: 'En la versión portable la actualización se instala a mano: abre la página de la versión con el archivo.',
    mac: 'En macOS la actualización se instala a mano (la app no está firmada): abre la página de la versión.',
    dev: 'Desde el código no hay instalación que actualizar: abre la página de la versión.',
  } as Record<string, string>)[this.self()?.cannotReason ?? ''] ?? 'Abre la página de la versión en el navegador');

  protected mb(bytes: number): string {
    return Math.round(bytes / 1024 / 1024).toString();
  }
}
