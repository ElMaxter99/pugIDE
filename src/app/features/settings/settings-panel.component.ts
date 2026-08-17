import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { PreferencesState } from '../../core/services/preferences.state';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="settings-overlay" (click)="close()">
        <div class="settings-dialog" (click)="$event.stopPropagation()">
          <div class="settings-header">
            <h3 class="settings-title">Preferencias del editor</h3>
            <button class="settings-close" (click)="close()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="settings-body">
            <div class="setting-row">
              <label class="setting-label" for="fontSize">Tamaño de fuente</label>
              <div class="setting-control">
                <input
                  id="fontSize"
                  type="range"
                  min="10"
                  max="24"
                  step="1"
                  [value]="preferences.fontSize()"
                  (input)="setFontSize($any($event.target).value)" />
                <span class="setting-value">{{ preferences.fontSize() }}px</span>
              </div>
            </div>

            <div class="setting-row">
              <label class="setting-label" for="zoom">Zoom del editor</label>
              <div class="setting-control">
                <input
                  id="zoom"
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  [value]="preferences.zoom()"
                  (input)="setZoom($any($event.target).value)" />
                <span class="setting-value">{{ preferences.zoom() }}%</span>
              </div>
            </div>

            <div class="setting-row">
              <label class="setting-label" for="tabSize">Tamaño de tabulación</label>
              <div class="setting-control">
                <select id="tabSize" class="setting-select" [value]="preferences.tabSize()" (change)="setTabSize($any($event.target).value)">
                  <option value="2">2 espacios</option>
                  <option value="4">4 espacios</option>
                  <option value="8">8 espacios</option>
                </select>
              </div>
            </div>

            <label class="setting-row checkbox-row">
              <span class="setting-label">Minimapa</span>
              <input type="checkbox" [checked]="preferences.minimap()" (change)="toggleMinimap()" />
            </label>

            <label class="setting-row checkbox-row">
              <span class="setting-label">Ajuste de línea (word wrap)</span>
              <input type="checkbox" [checked]="preferences.wordWrap()" (change)="toggleWordWrap()" />
            </label>

            <label class="setting-row checkbox-row">
              <span class="setting-label">Formatear al guardar</span>
              <input type="checkbox" [checked]="preferences.formatOnSave()" (change)="toggleFormatOnSave()" />
            </label>
          </div>

          <div class="settings-footer">
            <button class="settings-btn" (click)="close()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.1s ease-out;
    }

    .settings-dialog {
      width: 380px;
      max-width: 90vw;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 8px;
    }

    .settings-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .settings-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: none;
      color: var(--text-secondary);
      border-radius: 4px;
      cursor: pointer;
      padding: 0;
    }

    .settings-close:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .settings-body {
      padding: 8px 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .setting-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .setting-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .setting-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .setting-control input[type="range"] {
      flex: 1;
      accent-color: var(--accent-color);
    }

    .setting-value {
      font-size: 12px;
      color: var(--text-primary);
      font-family: var(--font-mono);
      min-width: 40px;
      text-align: right;
    }

    .setting-select {
      width: 100%;
      padding: 6px 10px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-primary);
      font-size: 13px;
      font-family: inherit;
    }

    .checkbox-row {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }

    .checkbox-row input[type="checkbox"] {
      accent-color: var(--accent-color);
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .settings-footer {
      display: flex;
      justify-content: flex-end;
      padding: 0 20px 16px;
    }

    .settings-btn {
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      font-family: inherit;
      background: var(--accent-color);
      border: none;
      color: var(--bg-primary);
    }

    .settings-btn:hover {
      opacity: 0.9;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `],
})
export class SettingsPanelComponent {
  protected preferences = inject(PreferencesState);
  protected isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setFontSize(value: string): void {
    this.preferences.update({ fontSize: Number(value) });
  }

  setZoom(value: string): void {
    this.preferences.update({ zoom: Number(value) });
  }

  setTabSize(value: string): void {
    this.preferences.update({ tabSize: Number(value) });
  }

  toggleMinimap(): void {
    this.preferences.update({ minimap: !this.preferences.minimap() });
  }

  toggleWordWrap(): void {
    this.preferences.update({ wordWrap: !this.preferences.wordWrap() });
  }

  toggleFormatOnSave(): void {
    this.preferences.update({ formatOnSave: !this.preferences.formatOnSave() });
  }
}
