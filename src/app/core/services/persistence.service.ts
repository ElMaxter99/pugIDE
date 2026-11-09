import { DEFAULT_JSON_VIEW, sanitizeJsonView } from '../utils/json-view.util';
import { readSession } from '../utils/session-validate.util';
import { Injectable, signal } from '@angular/core';
import { AppPreferences } from '../models/index';
import type { DatasetsFile } from '../utils/datasets.util';
import { DEFAULT_LAYOUT, isLayoutId, sanitizeDeviceMemory, sanitizePanelSizes } from '../utils/layout.util';

const STORAGE_KEY = 'pug-ide-preferences';
const PROJECT_KEY = 'pug-ide-project';
const CORRUPT_KEY = 'pug-ide-project-corrupt';
const CURRENT_ID_KEY = 'pug-ide-current-project';
const ANALYTICS_CONSENT_KEY = 'pug-ide-analytics-consent';
const LAST_BACKUP_KEY = 'pug-ide-last-backup';
const FIRST_USE_KEY = 'pug-ide-first-use';
const RECENT_COMMANDS_KEY = 'pug-ide-recent-commands';
const WELCOME_KEY = 'pug-ide-welcome';
const TOUR_KEY = 'pug-ide-tour';

/** Decisión del usuario sobre la analítica anónima de visitas (null: aún no ha decidido). */
export type AnalyticsConsent = 'granted' | 'denied';

export interface ProjectSessionState {
  projectName: string;
  files: Record<string, string>;
  openTabPaths: string[];
  activeTabPath: string | null;
  /** Juegos de datos del proyecto (opcional: sesiones antiguas no lo tienen). */
  datasets?: DatasetsFile;
  /** Plantilla elegida para la vista previa (sesiones antiguas no la tienen: vista automática). */
  previewEntry?: string;
}

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  /** True when the last write to localStorage failed (quota exceeded, private browsing, disabled storage, ...). */
  readonly lastWriteFailed = signal(false);

  private defaults: AppPreferences = {
    theme: 'auto',
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
    layout: DEFAULT_LAYOUT,
    panelSizes: {},
    sidebarTab: 'archivos',
    deviceBeforePdf: null,
    jsonView: DEFAULT_JSON_VIEW,
  };

  loadPreferences(): AppPreferences {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = { ...this.defaults, ...JSON.parse(raw) } as AppPreferences;
        // Preferencias antiguas o escritas a mano: lo que no sea válido vuelve a su valor de partida.
        if (!isLayoutId(saved.layout)) saved.layout = DEFAULT_LAYOUT;
        saved.panelSizes = sanitizePanelSizes(saved.panelSizes);
        if (saved.theme !== 'dark' && saved.theme !== 'light') saved.theme = 'auto';
        if (saved.sidebarTab !== 'datos') saved.sidebarTab = 'archivos';
        saved.deviceBeforePdf = sanitizeDeviceMemory(saved.deviceBeforePdf);
        saved.jsonView = sanitizeJsonView(saved.jsonView);
        return saved;
      }
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

  /** Qué pasó con la última sesión leída si no estaba bien (null: nada). La lee el arranque para avisar en el Registro. */
  sessionProblem: { reason: string; copied: boolean } | null = null;

  loadProjectState(): ProjectSessionState | null {
    let raw: string | null = null;
    try { raw = localStorage.getItem(PROJECT_KEY); } catch { return null; }
    const reading = readSession(raw);
    if (reading.problem) {
      // Antes de que el autoguardado la pise con el proyecto por defecto, se guarda una copia del texto original.
      let copied = false;
      try { if (raw) { localStorage.setItem(CORRUPT_KEY, raw); copied = true; } } catch { /* sin espacio: se avisa igualmente */ }
      this.sessionProblem = { reason: reading.problem, copied };
    }
    return reading.state as ProjectSessionState | null;
  }

  saveProjectState(state: ProjectSessionState): void {
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(state));
      this.lastWriteFailed.set(false);
    } catch {
      this.lastWriteFailed.set(true);
    }
  }

  /** Comandos de la paleta usados hace poco (identificadores, el más reciente primero). */
  loadRecentCommands(): string[] {
    try {
      const raw = JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) ?? '[]');
      if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string').slice(0, 5);
    } catch { /* ignore */ }
    return [];
  }

  saveRecentCommands(ids: string[]): void {
    try {
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(ids.slice(0, 5)));
    } catch { /* sin almacenamiento: los recientes solo duran la sesión */ }
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

  /** Fecha de la última exportación (carpeta o .zip) y del primer uso; null si no constan. */
  loadBackupInfo(): { lastBackup: number | null; firstUse: number | null } {
    const read = (key: string): number | null => {
      try {
        const n = Number(localStorage.getItem(key));
        return Number.isFinite(n) && n > 0 ? n : null;
      } catch {
        return null;
      }
    };
    return { lastBackup: read(LAST_BACKUP_KEY), firstUse: read(FIRST_USE_KEY) };
  }

  saveLastBackup(at = Date.now()): void {
    try { localStorage.setItem(LAST_BACKUP_KEY, String(at)); } catch { /* ignore */ }
  }

  /** ¿Ya se enseñó la bienvenida de primer uso? Solo se ofrece una vez; si no hay almacenamiento se da por vista para no insistir. */
  loadWelcomeSeen(): boolean {
    try { return localStorage.getItem(WELCOME_KEY) !== null; } catch { return true; }
  }

  saveWelcomeSeen(): void {
    try { localStorage.setItem(WELCOME_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  /** ¿Se terminó o saltó ya el recorrido guiado? */
  loadTourDone(): boolean {
    try { return localStorage.getItem(TOUR_KEY) !== null; } catch { return true; }
  }

  saveTourDone(): void {
    try { localStorage.setItem(TOUR_KEY, String(Date.now())); } catch { /* ignore */ }
  }

  /** Guarda el primer uso si aún no consta. */
  ensureFirstUse(at = Date.now()): void {
    try {
      if (!localStorage.getItem(FIRST_USE_KEY)) localStorage.setItem(FIRST_USE_KEY, String(at));
    } catch { /* ignore */ }
  }

  /** Pide al navegador que no borre los datos del sitio por falta de espacio. Devuelve si quedó concedido. */
  async requestPersistentStorage(): Promise<boolean> {
    try {
      if (!navigator.storage?.persist) return false;
      return (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch {
      return false;
    }
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
