import { Injectable, signal } from '@angular/core';
import { AppPreferences } from '../models/index';
import type { DatasetsFile } from '../utils/datasets.util';

const STORAGE_KEY = 'pug-ide-preferences';
const PROJECT_KEY = 'pug-ide-project';
const CURRENT_ID_KEY = 'pug-ide-current-project';
const ANALYTICS_CONSENT_KEY = 'pug-ide-analytics-consent';

/** Decisión del usuario sobre la analítica anónima de visitas (null: aún no ha decidido). */
export type AnalyticsConsent = 'granted' | 'denied';

export interface ProjectSessionState {
  projectName: string;
  files: Record<string, string>;
  openTabPaths: string[];
  activeTabPath: string | null;
  /** Juegos de datos del proyecto (opcional: sesiones antiguas no lo tienen). */
  datasets?: DatasetsFile;
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
    sortAttributes: false,
    autoCompile: true,
    previewDevice: 'Desktop',
    zoom: 100,
    sidebarCollapsed: false,
    dataCollapsed: false,
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

  loadAnalyticsConsent(): AnalyticsConsent | null {
    try {
      const v = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch {
      return null;
    }
  }

  saveAnalyticsConsent(value: AnalyticsConsent): void {
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
    } catch { /* ignore */ }
  }

  /** Identificador del proyecto activo en la biblioteca (`ProjectLibraryService`). */
  loadCurrentProjectId(): string | null {
    try {
      return localStorage.getItem(CURRENT_ID_KEY);
    } catch {
      return null;
    }
  }

  saveCurrentProjectId(id: string): void {
    try {
      localStorage.setItem(CURRENT_ID_KEY, id);
    } catch { /* ignore */ }
  }

  clearAll(): void {
    try { localStorage.removeItem(CURRENT_ID_KEY); } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROJECT_KEY);
  }

  clearProjectState(): void {
    localStorage.removeItem(PROJECT_KEY);
    try { localStorage.removeItem(CURRENT_ID_KEY); } catch { /* ignore */ }
  }
}
