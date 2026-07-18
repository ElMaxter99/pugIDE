import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { EditorState } from '../../../core/state/editor.state';
import { PreferencesState } from '../../../core/services/preferences.state';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="logo">PugIDE</h1>
        <nav class="nav-links">
          <a class="nav-link active" href="#">Project</a>
          <a class="nav-link" href="#">Build</a>
          <a class="nav-link" href="#">Deploy</a>
        </nav>
      </div>
      <div class="topbar-right">
        <div class="search-bar">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Search commands..." />
          <span class="search-shortcut">&#8984;K</span>
        </div>
        <div class="topbar-actions">
          <button class="icon-btn" title="Toggle Theme" (click)="onToggleTheme()">
            <span class="material-symbols-outlined">contrast</span>
          </button>
          <button class="icon-btn" title="Settings">
            <span class="material-symbols-outlined">settings</span>
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
      gap: 32px;
    }

    .logo {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--accent-color);
      line-height: 40px;
    }

    .nav-links {
      display: flex;
      gap: 24px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      height: 64px;
      padding: 0 4px;
      font-size: 14px;
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.15s;
    }

    .nav-link:hover {
      color: var(--text-primary);
    }

    .nav-link.active {
      color: var(--accent-color);
      font-weight: 700;
      border-bottom: 2px solid var(--accent-color);
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 36px;
      background: var(--bg-surface-container-low);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      transition: all 0.2s;
    }

    .search-bar:focus-within {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 1px var(--accent-color);
    }

    .search-icon {
      font-size: 18px;
      color: var(--text-secondary);
    }

    .search-input {
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 14px;
      width: 192px;
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-tertiary);
    }

    .search-shortcut {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-tertiary);
      padding: 1px 4px;
      border: 1px solid var(--border-color);
      border-radius: 3px;
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

  onSave(): void {
    this.editorState.saveCurrentFile();
  }

  onToggleAutoSave(): void {
    this.preferences.update({ autoCompile: !this.preferences.autoCompile() });
  }

  onToggleTheme(): void {
    this.preferences.toggleTheme();
  }
}
