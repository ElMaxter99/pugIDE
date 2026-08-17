import { Injectable, signal } from '@angular/core';
import { AppPreferences } from '../models/index';

const STORAGE_KEY = 'pug-ide-preferences';
const PROJECT_KEY = 'pug-ide-project';

export interface ProjectSessionState {
  projectName: string;
  files: Record<string, string>;
  openTabPaths: string[];
  activeTabPath: string | null;
}

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  /** True when the last write to localStorage failed (quota exceeded, private browsing, disabled storage, ...). */
  readonly lastWriteFailed = signal(false);

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
      this.lastWriteFailed.set(false);
    } catch {
      this.lastWriteFailed.set(true);
    }
  }

  loadProjectState(): ProjectSessionState | null {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  }

  saveProjectState(state: ProjectSessionState): void {
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(state));
      this.lastWriteFailed.set(false);
    } catch {
      this.lastWriteFailed.set(true);
    }
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROJECT_KEY);
  }

  clearProjectState(): void {
    localStorage.removeItem(PROJECT_KEY);
  }
}
