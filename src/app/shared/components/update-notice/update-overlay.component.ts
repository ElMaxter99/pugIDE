import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppUpdateService } from '../../../core/services/app-update.service';

/** Mensaje centrado mientras se activa una versión nueva y la página se recarga sola (mesa V-03). */
@Component({
  selector: 'app-update-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (update.applying()) {
      <div class="update-backdrop">
        <div class="update-card" role="status">
          <span class="update-title">Actualizando a la última versión…</span>
          <span class="update-sub">Un momento: PugIDE se recarga sola. Tus proyectos no se tocan.</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .update-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--bg-surface-container-lowest) 82%, transparent);
      font-family: var(--font-family);
    }
    .update-card {
      width: 380px;
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      text-align: center;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      color: var(--text-primary);
    }
    .update-title { font-size: 18px; font-weight: 600; }
    .update-sub { color: var(--text-secondary); line-height: 1.5; font-size: 14px; }
  `],
})
export class UpdateOverlayComponent {
  protected update = inject(AppUpdateService);
}
