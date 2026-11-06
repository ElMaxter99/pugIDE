import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { EditorState } from '../../../core/state/editor.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { PreviewState } from '../../../core/state/preview.state';
import { ParserState } from '../../../core/state/parser.state';
import { PersistenceService } from '../../../core/services/persistence.service';
import { PreferencesState } from '../../../core/services/preferences.state';

@Component({
  selector: 'app-statusbar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="statusbar">
      <div class="status-left">
        <button type="button" class="status-group" (click)="toggleTerminal()" title="Mostrar u ocultar el Registro" [attr.aria-label]="terminalState.errorCount() + (terminalState.errorCount() === 1 ? ' error' : ' errores') + ': mostrar u ocultar el Registro'">
          <span aria-hidden="true" class="material-symbols-outlined error-icon">cancel</span>
          <span>{{ terminalState.errorCount() }} {{ terminalState.errorCount() === 1 ? 'error' : 'errores' }}</span>
        </button>
        <div class="status-group">
          <span aria-hidden="true" class="material-symbols-outlined warning-icon">warning</span>
          <span>{{ terminalState.warningCount() }} {{ terminalState.warningCount() === 1 ? 'aviso' : 'avisos' }}</span>
        </div>
        @if (parserState.isParsing()) {
          <div class="status-group">
            <span aria-hidden="true" class="material-symbols-outlined info-icon">sync</span>
            <span>Analizando&hellip;</span>
          </div>
        } @else if (previewState.compilationTime() > 0) {
          <div class="status-group">
            <span aria-hidden="true" class="material-symbols-outlined info-icon">info</span>
            <span>Compilado en {{ previewState.compilationTime() | number:'1.0-0' }} ms</span>
          </div>
        }
      </div>
      <div class="status-right">
        <button
          type="button"
          class="status-group"
          data-testid="autocompile-toggle"
          [attr.aria-pressed]="preferences.autoCompile()"
          [title]="preferences.autoCompile() ? 'Autocompilación activada: recompila al escribir. Púlsalo para desactivarla.' : 'Autocompilación desactivada: pulsa Guardar o Ctrl+S para compilar. Púlsalo para activarla.'"
          (click)="preferences.update({ autoCompile: !preferences.autoCompile() })">
          <span aria-hidden="true" class="auto-dot" [class.on]="preferences.autoCompile()"></span>
          <span>Autocompilar: {{ preferences.autoCompile() ? 'sí' : 'no' }}</span>
        </button>
        <span class="status-item dim">UTF-8</span>
        <span class="status-item dim">{{ getLanguage() }}</span>
        <div
          class="status-item"
          [class.failed]="persistence.lastWriteFailed()"
          [class.pending]="!persistence.lastWriteFailed() && editorState.hasUnsavedChanges()"
          [class.live]="!persistence.lastWriteFailed() && !editorState.hasUnsavedChanges()"
          [title]="persistence.lastWriteFailed() ? 'Local storage save failed — your work may not survive a reload. Export the project to be safe.' : ''">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">
            {{ persistence.lastWriteFailed() ? 'cloud_off' : (editorState.hasUnsavedChanges() ? 'edit' : 'cloud_done') }}
          </span>
          <span>{{ persistence.lastWriteFailed() ? 'No se pudo guardar' : (editorState.hasUnsavedChanges() ? 'Cambios sin guardar' : 'Guardado') }}</span>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .statusbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 32px;
      padding: 0 16px;
      background: #1a1523;
      /* La barra es oscura en los dos temas: lleva su propia paleta para que el contraste no dependa del tema. */
      --text-primary: #eadfed;
      --text-secondary: #cfc2d6;
      --text-tertiary: #988d9f;
      --accent-color: #ddb7ff;
      --tertiary-color: #fabc4e;
      --secondary-color: #4cd7f6;
      --error-color: #ffb4ab;
      --warning-color: #fabc4e;
      --success-color: #a6e3a1;
      border-top: 1px solid rgba(221, 183, 255, 0.2);
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      user-select: none;
      color: var(--text-primary);
      flex-shrink: 0;
      z-index: 60;
    }

    .status-left, .status-right {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .status-group {
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: inherit;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      height: 32px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .status-group:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .auto-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-tertiary);
      flex-shrink: 0;
    }

    .auto-dot.on {
      background: var(--accent-color);
      box-shadow: 0 0 6px var(--accent-color);
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 4px;
    }

    .status-item.dim {
      color: var(--text-tertiary);
    }

    .status-item.live {
      color: var(--accent-color);
    }

    .status-item.pending {
      color: var(--tertiary-color);
    }

    .status-item.failed {
      color: var(--error-color);
    }

    .error-icon {
      font-size: 14px;
      color: var(--error-color);
    }

    .warning-icon {
      font-size: 14px;
      color: var(--tertiary-color);
    }

    .info-icon {
      font-size: 14px;
      color: var(--secondary-color);
    }
  `],
})
export class StatusbarComponent {
  protected editorState = inject(EditorState);
  protected terminalState = inject(TerminalState);
  protected previewState = inject(PreviewState);
  protected parserState = inject(ParserState);
  protected persistence = inject(PersistenceService);
  protected preferences = inject(PreferencesState);

  getLanguage(): string {
    const tab = this.editorState.activeTab();
    switch (tab?.type) {
      case 'pug': return 'Pug/Sass';
      case 'scss': return 'Pug/Sass';
      case 'less': return 'Less';
      case 'json': return 'JSON';
      case 'javascript': return 'JavaScript';
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      default: return 'Plain Text';
    }
  }

  toggleTerminal(): void {
    this.terminalState.toggle();
  }
}
