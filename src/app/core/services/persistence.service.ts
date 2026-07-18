import { Injectable, signal } from '@angular/core';
import { AppPreferences } from '../models/index';

const STORAGE_KEY = 'pug-ide-preferences';
const PROJECT_KEY = 'pug-ide-project';

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private defaults: AppPreferences = {
    theme: 'dark',
    fontSize: 14,
    tabSize: 2,
    minimap: true,
    wordWrap: false,
    formatOnSave: true,
    autoCompile: true,
    previewDevice: 'Desktop',
    zoom: 100,
  };

  loadPreferences(): AppPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...this.defaults, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...this.defaults };
  }

  savePreferences(prefs: Partial<AppPreferences>): void {
    try {
      const current = this.loadPreferences();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
    } catch { /* ignore */ }
  }

  loadProjectState(): { openFiles: string[]; activeFile: string | null } {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { openFiles: [], activeFile: null };
  }

  saveProjectState(state: { openFiles: string[]; activeFile: string | null }): void {
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROJECT_KEY);
  }
}
