import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { PreferencesState } from '../../../core/services/preferences.state';
import { FormatterService } from '../../../core/services/formatter.service';
import { SettingsPanelComponent } from '../../../features/settings/settings-panel.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [SettingsPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <app-settings-panel #settingsPanel />
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
          <button class="icon-btn" title="Cambiar tema" (click)="onToggleTheme()">
            <span class="material-symbols-outlined">contrast</span>
          </button>
          @if (canFormatActiveFile()) {
            <button class="icon-btn" title="Formatear documento" (click)="onFormat()">
              <span class="material-symbols-outlined">format_align_left</span>
            </button>
          }
          <button class="icon-btn" title="Preferencias del editor" (click)="settingsPanel.open()">
            <span class="material-symbols-outlined">settings</span>
          </button>
          <div class="divider"></div>
          <button
            class="text-btn"
            [class.active]="preferences.autoCompile()"
            [title]="preferences.autoCompile() ? 'Autocompilación activada: recompila mientras escribes' : 'Autocompilación desactivada: pulsa Guardar o Ctrl+S para compilar'"
            (click)="onToggleAutoCompile()">
            <span class="status-dot" [class.on]="preferences.autoCompile()"></span>
            Autocompilar
          </button>
          <button class="save-btn" (click)="onSave()">Guardar</button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .topbar {
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
  private formatter = inject(FormatterService);
  private orchestrator = inject(OrchestratorService);
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }

  canFormatActiveFile(): boolean {
    const type = this.editorState.activeTab()?.type;
    return !!type && this.formatter.supports(type);
  }

  onFormat(): void {
    this.editorState.requestFormat();
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
}
