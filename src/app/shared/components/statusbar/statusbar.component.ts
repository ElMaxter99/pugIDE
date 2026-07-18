import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { EditorState } from '../../../core/state/editor.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { PreviewState } from '../../../core/state/preview.state';
import { PreferencesState } from '../../../core/services/preferences.state';

@Component({
  selector: 'app-statusbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="statusbar">
      <div class="status-left">
        <div class="status-group" (click)="toggleTerminal()">
          <span class="material-symbols-outlined error-icon">cancel</span>
          <span>{{ terminalState.errorCount() }} errors</span>
        </div>
        <div class="status-group">
          <span class="material-symbols-outlined warning-icon">warning</span>
          <span>{{ terminalState.warningCount() }} warnings</span>
        </div>
        @if (previewState.compilationTime() > 0) {
          <div class="status-group">
            <span class="material-symbols-outlined info-icon">info</span>
            <span>Compiled in {{ previewState.compilationTime() | number:'1.0-0' }}ms</span>
          </div>
        }
      </div>
      <div class="status-right">
        <span class="status-item dim">UTF-8</span>
        <span class="status-item dim">{{ getLanguage() }}</span>
        <div class="status-item live">
          <span class="material-symbols-outlined" style="font-size: 14px;">cloud_done</span>
          <span>Live Sync</span>
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
  protected preferences = inject(PreferencesState);

  getLanguage(): string {
    const tab = this.editorState.activeTab();
    switch (tab?.type) {
      case 'pug': return 'Pug/Sass';
      case 'scss': return 'Pug/Sass';
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
