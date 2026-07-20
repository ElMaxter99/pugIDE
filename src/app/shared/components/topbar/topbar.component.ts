import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { PreferencesState } from '../../../core/services/preferences.state';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="logo">PugIDE</h1>
      </div>
      <div class="topbar-right">
        <div class="topbar-actions">
          <button class="icon-btn" title="Toggle Theme" (click)="onToggleTheme()">
            <span class="material-symbols-outlined">contrast</span>
          </button>
          <div class="divider"></div>
          <button class="text-btn" (click)="onToggleAutoSave()">Auto-save</button>
          <button class="save-btn" (click)="onSave()">Save</button>
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

  onSave(): void {
    this.editorState.saveCurrentFile();
    this.orchestrator.manualCompile();
  }

  onToggleAutoSave(): void {
    this.preferences.update({ autoCompile: !this.preferences.autoCompile() });
  }

  onToggleTheme(): void {
    this.preferences.toggleTheme();
  }
}
