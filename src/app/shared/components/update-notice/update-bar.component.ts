import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppUpdateService } from '../../../core/services/app-update.service';

/** Barra fina bajo la cabecera: hay una versión nueva y el usuario decide cuándo recargar (diseño: lienzo, mesa V-03). */
@Component({
  selector: 'app-update-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (update.visible()) {
      <div class="update-bar" role="status">
        <span class="update-text"><strong>Hay una versión nueva de PugIDE.</strong> Tu trabajo está guardado; se aplica al recargar.</span>
        <button type="button" class="update-now" (click)="update.apply()">Actualizar ahora</button>
        <button type="button" class="update-later" (click)="update.dismiss()">Más tarde</button>
      </div>
    }
  `,
  styles: [`
    .update-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 6px 16px;
      background: color-mix(in srgb, var(--secondary-container) 18%, var(--bg-primary));
      border-bottom: 1px solid var(--secondary-container);
      color: var(--text-primary);
      font-size: 13px;
    }
    .update-text { flex: 1 1 320px; min-width: 0; line-height: 1.45; }
    button {
      min-height: 32px;
      padding: 4px 14px;
      border-radius: var(--radius);
      font: inherit;
      cursor: pointer;
    }
    .update-now { background: var(--accent-color); color: var(--text-on-primary); border: none; font-weight: 600; }
    .update-later { background: transparent; color: var(--text-primary); border: 1px solid var(--text-tertiary); }
  `],
})
export class UpdateBarComponent {
  protected update = inject(AppUpdateService);
}
