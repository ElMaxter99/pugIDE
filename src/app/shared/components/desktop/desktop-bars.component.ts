import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DesktopUpdateService } from '../../../core/services/desktop-update.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { UiState } from '../../../core/state/ui.state';

/** Avisos de la app de escritorio bajo la barra superior: versión nueva (P-27) y archivos que cambiaron en disco (P-26). */
@Component({
  selector: 'app-desktop-bars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updates.showBar()) {
      <div class="bar update" role="status" data-testid="update-bar">
        <span aria-hidden="true" class="material-symbols-outlined">update</span>
        <span class="text">Hay una versión nueva de PugIDE: <strong>{{ updates.state()!.latest!.version }}</strong> (tienes la {{ updates.state()!.current }}).</span>
        <button type="button" class="btn" data-testid="update-later" (click)="updates.dismiss()">Ahora no</button>
        <button type="button" class="btn primary" data-testid="update-download" title="Abre la página de la versión en el navegador" (click)="updates.download()">Descargar</button>
      </div>
    }
    @for (c of workspace.conflicts(); track c.path) {
      <div class="bar conflict" role="alert" data-testid="workspace-conflict">
        <span aria-hidden="true" class="material-symbols-outlined">sync_problem</span>
        <span class="text"><strong>{{ c.path.slice(1) }}</strong> {{ c.disk === null ? 'se ha borrado en el disco' : 'ha cambiado en el disco' }} y aquí tiene cambios sin guardar.</span>
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
    .bar.conflict .material-symbols-outlined { color: var(--warning-color); }
    .text { flex: 1; min-width: 200px; overflow-wrap: anywhere; }
    .btn { padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border-color: var(--accent-color); color: var(--text-on-primary); }
  `],
})
export class DesktopBarsComponent {
  protected readonly updates = inject(DesktopUpdateService);
  protected readonly workspace = inject(WorkspaceService);
  protected readonly ui = inject(UiState);
}
