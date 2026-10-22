import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AnalyticsService } from '../../../core/services/analytics.service';

/** Aviso de privacidad: pide permiso para la analítica anónima hasta que el usuario decide. */
@Component({
  selector: 'app-consent-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (analytics.consent() === null) {
      <aside class="consent" role="region" aria-label="Aviso de privacidad">
        <p>
          <strong>Tu código no sale de tu navegador.</strong>
          Si quieres, PugIDE cuenta las visitas con una analítica anónima (Vercel Web Analytics: sin cookies de seguimiento
          y sin ningún dato de tus proyectos). ¿Lo permites?
        </p>
        <div class="actions">
          <button class="btn secondary" (click)="analytics.reject()">Rechazar</button>
          <button class="btn primary" (click)="analytics.accept()">Aceptar</button>
        </div>
      </aside>
    }
  `,
  styles: [`
    .consent {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 16px;
      z-index: 3000;
      max-width: 720px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding: 14px 18px;
      color: var(--text-primary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      font-size: 13px;
      line-height: 1.5;
    }
    p { margin: 0; flex: 1 1 320px; }
    .actions { display: flex; gap: 8px; margin-left: auto; }
    .btn { padding: 7px 16px; font-size: 13px; border-radius: 6px; font-weight: 600; }
    .btn.primary { background: var(--accent-color); color: var(--text-on-primary); }
    .btn.secondary { color: var(--text-primary); background: var(--bg-surface-container-highest, var(--bg-hover)); }
    .btn:hover { filter: brightness(1.1); }
  `],
})
export class ConsentBannerComponent {
  protected analytics = inject(AnalyticsService);
}
