import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { TerminalState } from '../../../core/state/terminal.state';
import { PreferencesState } from '../../../core/services/preferences.state';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1
          class="logo"
          role="button"
          tabindex="0"
          title="Volver al inicio"
          (click)="goHome()"
          (keydown.enter)="goHome()">PugIDE</h1>
      </div>
      <div class="topbar-right">
        <div class="topbar-actions">
          <button class="text-btn" title="Copiar un enlace con el proyecto (archivos y datos; sin imágenes ni fuentes)" (click)="onShare()">
            <span class="material-symbols-outlined">link</span>
            Compartir
          </button>
          <button class="text-btn" title="Descargar el HTML renderizado autocontenido" (click)="onExportHtml()">
            <span class="material-symbols-outlined">code</span>
            Exportar HTML
          </button>
          <div class="divider"></div>
          <button class="icon-btn" title="Toggle Theme" (click)="onToggleTheme()">
            <span class="material-symbols-outlined">contrast</span>
          </button>
          <div class="divider"></div>
          <button
            class="text-btn"
            [class.active]="preferences.autoCompile()"
            [title]="preferences.autoCompile() ? 'Auto-compile is on: recompiles as you type' : 'Auto-compile is off: press Save or Ctrl+S to compile'"
            (click)="onToggleAutoCompile()">
            <span class="status-dot" [class.on]="preferences.autoCompile()"></span>
            Auto-compile
          </button>
          <button class="save-btn" (click)="onSave()">Save</button>
        </div>
      </div>
      @if (shareNotice(); as n) {
        <div class="share-notice" [class.warn]="n.warn" role="status">
          <span>{{ n.text }}</span>
          <button class="notice-close" title="Cerrar aviso" (click)="shareNotice.set(null)">&times;</button>
        </div>
      }
    </header>
  `,
  styles: [`
    .topbar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 24px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      z-index: 50;
      flex-shrink: 0;
    }

    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--accent-color);
      line-height: 40px;
      cursor: pointer;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .icon-btn:hover {
      background: var(--bg-surface-container-highest);
      color: var(--text-primary);
    }

    .icon-btn:active {
      transform: scale(0.95);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--border-color);
      margin: 0 4px;
    }

    .text-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 36px;
      font-size: 14px;
      color: var(--text-secondary);
      border-radius: var(--radius);
      transition: all 0.15s;
    }

    .text-btn:hover {
      background: var(--bg-surface-container-highest);
      color: var(--text-primary);
    }

    .text-btn.active {
      color: var(--text-on-primary-container, var(--accent-color));
      background: var(--accent-container, transparent);
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
    }

    .status-dot.on {
      background: var(--accent-color);
      box-shadow: 0 0 6px var(--accent-color);
    }

    .share-notice {
      position: absolute;
      top: 100%;
      right: 24px;
      max-width: 420px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-surface-container-highest, var(--bg-surface));
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 60;
    }

    .share-notice.warn {
      border-color: #e0a030;
    }

    .notice-close {
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
    }

    .save-btn {
      padding: 0 16px;
      height: 36px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-on-primary);
      background: var(--accent-color);
      border-radius: var(--radius);
      box-shadow: 0 4px 12px rgba(221, 183, 255, 0.3);
      transition: all 0.15s;
    }

    .save-btn:hover {
      filter: brightness(1.1);
    }

    .save-btn:active {
      transform: scale(0.95);
    }
  `],
})
export class TopbarComponent {
  protected editorState = inject(EditorState);
  protected preferences = inject(PreferencesState);
  private orchestrator = inject(OrchestratorService);
  private router = inject(Router);
  private projectIo = inject(ProjectIoService);
  private terminal = inject(TerminalState);
  protected shareNotice = signal<{ text: string; warn: boolean } | null>(null);

  goHome(): void {
    this.router.navigate(['/']);
  }

  onSave(): void {
    this.editorState.saveCurrentFile();
    this.orchestrator.manualCompile();
    this.orchestrator.saveSession();
  }

  onToggleAutoCompile(): void {
    this.preferences.update({ autoCompile: !this.preferences.autoCompile() });
  }

  onToggleTheme(): void {
    this.preferences.toggleTheme();
  }

  async onShare(): Promise<void> {
    const { url, length, tooLong } = this.projectIo.buildShareLink(location.origin + '/ide');
    let copied = true;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      copied = false;
    }
    let text = copied ? 'Enlace copiado al portapapeles.' : 'No se pudo copiar automáticamente: copia el enlace de la barra de direcciones.';
    if (!copied) history.replaceState(null, '', url);
    text += ' No incluye imágenes ni fuentes subidas.';
    if (tooLong) {
      text += ` Aviso: el enlace es muy largo (${length} caracteres) y puede no funcionar en algunos navegadores o aplicaciones de mensajería. Considera exportar un .zip.`;
    }
    this.shareNotice.set({ text, warn: tooLong || !copied });
    this.terminal.addEntry(tooLong ? 'warning' : 'success', 'Compartir', text);
  }

  onExportHtml(): void {
    this.projectIo.exportHtml();
  }
}
