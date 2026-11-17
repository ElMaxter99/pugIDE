import { DEFAULT_JSON_VIEW, sanitizeJsonView } from '../utils/json-view.util';
import { PdfBatchChoices, sanitizePdfBatchChoices } from '../utils/pdf-batch.util';
import { PdfChoices, sanitizePdfChoices } from '../utils/pdf-export.util';
import { readSession } from '../utils/session-validate.util';
import { Injectable, signal } from '@angular/core';
import { AppPreferences } from '../models/index';
import type { DatasetsFile } from '../utils/datasets.util';
import { DEFAULT_LAYOUT, isLayoutId, sanitizeDeviceMemory, sanitizePanelSizes } from '../utils/layout.util';

const STORAGE_KEY = 'pug-ide-preferences';
const PROJECT_KEY = 'pug-ide-project';
const CORRUPT_KEY = 'pug-ide-project-corrupt';
/** Marca en localStorage: la sesión no cabía (5 MB) y la guardada es la de IndexedDB. */
const SESSION_IN_IDB_KEY = 'pug-ide-project-idb';
const SESSION_DB = 'pug-ide-session';
const SESSION_STORE = 'kv';
const SESSION_RECORD = 'project';
const CURRENT_ID_KEY = 'pug-ide-current-project';
const ANALYTICS_CONSENT_KEY = 'pug-ide-analytics-consent';
const LAST_BACKUP_KEY = 'pug-ide-last-backup';
const FIRST_USE_KEY = 'pug-ide-first-use';
const RECENT_COMMANDS_KEY = 'pug-ide-recent-commands';
const WELCOME_KEY = 'pug-ide-welcome';
const TOUR_KEY = 'pug-ide-tour';
const PDF_CHOICES_KEY = 'pug-ide-pdf-export';
const PDF_BATCH_KEY = 'pug-ide-pdf-batch';
const OPEN_FILE_CHOICE_KEY = 'pug-ide-open-file-choice';

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

/** Dónde va la sesión cuando no cabe en localStorage (IndexedDB en el navegador; en memoria en las pruebas). */
export interface SessionBackend {
  get(): Promise<string | null>;
  put(raw: string): Promise<void>;
  clear(): Promise<void>;
}

class IndexedDbSessionBackend implements SessionBackend {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(SESSION_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(SESSION_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE, mode);
        const req = fn(tx.objectStore(SESSION_STORE));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async get(): Promise<string | null> {
    const v = await this.run<unknown>('readonly', (s) => s.get(SESSION_RECORD));
    return typeof v === 'string' ? v : null;
  }

  async put(raw: string): Promise<void> {
    await this.run('readwrite', (s) => s.put(raw, SESSION_RECORD));
  }

  async clear(): Promise<void> {
    await this.run('readwrite', (s) => s.delete(SESSION_RECORD));
  }
}

export class MemorySessionBackend implements SessionBackend {
  private raw: string | null = null;
  async get(): Promise<string | null> { return this.raw; }
  async put(raw: string): Promise<void> { this.raw = raw; }
  async clear(): Promise<void> { this.raw = null; }
}

@Injectable({ providedIn: 'root' })
export class PersistenceService {
  /** Sesiones que no caben en localStorage. Reemplazable en las pruebas. */
  sessionBackend: SessionBackend = typeof indexedDB === 'undefined' ? new MemorySessionBackend() : new IndexedDbSessionBackend();
  /** Las escrituras en IndexedDB van en fila: la última que se pide es la que queda. */
  private sessionQueue: Promise<void> = Promise.resolve();

  /** True si la última sesión no se pudo guardar en ningún sitio (ni localStorage ni IndexedDB), o falló otra escritura. */
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

  /** ¿Hay una sesión guardada? (sin leerla: la de IndexedDB solo se sabe por su marca). */
  hasSavedSession(): boolean {
    try {
      if (localStorage.getItem(SESSION_IN_IDB_KEY) !== null) return true;
      return Object.keys(readSession(localStorage.getItem(PROJECT_KEY)).state?.files ?? {}).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Lee la sesión guardada: de localStorage o, si no cabía (proyectos de más de ~5 MB), de IndexedDB.
   * Si no se puede leer entera, deja el motivo en `sessionProblem`.
   */
  async loadProjectState(): Promise<ProjectSessionState | null> {
    let raw: string | null = null;
    let inIdb: boolean;
    try {
      inIdb = localStorage.getItem(SESSION_IN_IDB_KEY) !== null;
      if (!inIdb) raw = localStorage.getItem(PROJECT_KEY);
    } catch {
      inIdb = true; // sin localStorage: se prueba IndexedDB
    }
    if (inIdb) {
      try { raw = await this.sessionBackend.get(); } catch { raw = null; }
    }
    const reading = readSession(raw);
    if (reading.problem) {
      // Antes de que el autoguardado la pise con el proyecto por defecto, se guarda una copia del texto original.
      let copied = false;
      try { if (raw) { localStorage.setItem(CORRUPT_KEY, raw); copied = true; } } catch { /* sin espacio: se avisa igualmente */ }
      this.sessionProblem = { reason: reading.problem, copied };
    }
    return reading.state as ProjectSessionState | null;
  }

  /**
   * Guarda la sesión. Va a localStorage mientras quepa (lectura inmediata al arrancar); si no cabe, a IndexedDB,
   * y solo cuando IndexedDB confirma se quita la copia anterior de localStorage: si algo falla, queda la última buena.
   */
  saveProjectState(state: ProjectSessionState): void {
    const raw = JSON.stringify(state);
    try {
      localStorage.setItem(PROJECT_KEY, raw);
      if (localStorage.getItem(SESSION_IN_IDB_KEY) !== null) {
        localStorage.removeItem(SESSION_IN_IDB_KEY);
        this.enqueue(() => this.sessionBackend.clear());
      }
      this.lastWriteFailed.set(false);
      return;
    } catch { /* no cabe o no hay localStorage: IndexedDB */ }
    this.enqueue(async () => {
      try {
        await this.sessionBackend.put(raw);
        try {
          localStorage.removeItem(PROJECT_KEY);
          localStorage.setItem(SESSION_IN_IDB_KEY, String(Date.now()));
        } catch { /* sin localStorage: al arrancar se prueba IndexedDB igualmente */ }
        this.lastWriteFailed.set(false);
      } catch {
        this.lastWriteFailed.set(true);
      }
    });
  }

  /** Espera a que terminen las escrituras pendientes en IndexedDB (pruebas y antes de cambiar de proyecto). */
  flushSession(): Promise<void> {
    return this.sessionQueue;
  }

  private enqueue(task: () => Promise<void>): void {
    this.sessionQueue = this.sessionQueue.then(task, task).catch(() => undefined);
  }

  /** «Varios PDF…» (P-42): modo, carpeta o .zip y número de página. */
  loadPdfBatchChoices(): PdfBatchChoices {
    try { return sanitizePdfBatchChoices(JSON.parse(localStorage.getItem(PDF_BATCH_KEY) ?? 'null')); } catch { return sanitizePdfBatchChoices(null); }
  }

  savePdfBatchChoices(choices: PdfBatchChoices): void {
    try { localStorage.setItem(PDF_BATCH_KEY, JSON.stringify(choices)); } catch { /* sin almacenamiento: no se recuerda */ }
  }

  /** Opciones del último «Exportar PDF» (P-39). */
  loadPdfChoices(): PdfChoices {
    try { return sanitizePdfChoices(JSON.parse(localStorage.getItem(PDF_CHOICES_KEY) ?? 'null')); } catch { return sanitizePdfChoices(null); }
  }

  savePdfChoices(choices: PdfChoices): void {
    try { localStorage.setItem(PDF_CHOICES_KEY, JSON.stringify(choices)); } catch { /* solo se pierden las opciones recordadas */ }
  }

  /** P-40: qué hacer siempre al abrir una plantilla suelta («Hacer siempre esto»); null = preguntar. */
  loadOpenFileChoice(): 'folder' | 'file' | null {
    try { const v = localStorage.getItem(OPEN_FILE_CHOICE_KEY); return v === 'folder' || v === 'file' ? v : null; } catch { return null; }
  }

  saveOpenFileChoice(choice: 'folder' | 'file' | null): void {
    try { if (choice) localStorage.setItem(OPEN_FILE_CHOICE_KEY, choice); else localStorage.removeItem(OPEN_FILE_CHOICE_KEY); } catch { /* se volverá a preguntar */ }
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
  /** Escritorio: la pantalla de espacios de trabajo ya se enseñó una vez al arrancar (no se repite sola). */
  workspacesIntroSeen(): boolean {
    try { return localStorage.getItem('pug-ide-workspaces-intro') !== null; } catch { return true; }
  }

  markWorkspacesIntroSeen(): void {
    try { localStorage.setItem('pug-ide-workspaces-intro', String(Date.now())); } catch { /* ignore */ }
  }

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
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    this.clearProjectState();
  }

  clearProjectState(): void {
    try {
      localStorage.removeItem(PROJECT_KEY);
      localStorage.removeItem(SESSION_IN_IDB_KEY);
    } catch { /* ignore */ }
    try { localStorage.removeItem(CURRENT_ID_KEY); } catch { /* ignore */ }
    this.enqueue(() => this.sessionBackend.clear());
  }
}
