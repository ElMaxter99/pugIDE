import { Injectable } from '@angular/core';
import { FileVersion, addVersion } from '../utils/history.util';

const DB_NAME = 'pug-ide-history';
const STORE = 'files';
const SEP = '\u0000';

/** Versiones de un archivo de un proyecto. `key` = `<proyecto>\0<ruta>`. */
export interface HistoryRecord {
  key: string;
  versions: FileVersion[];
}

/** Almacenamiento subyacente (IndexedDB en el navegador; en memoria en las pruebas). */
export interface HistoryBackend {
  get(key: string): Promise<HistoryRecord | undefined>;
  put(record: HistoryRecord): Promise<void>;
  remove(key: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}

class IndexedDbHistoryBackend implements HistoryBackend {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | null): Promise<T> {
    const db = await this.open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req?.result as T);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  get(key: string): Promise<HistoryRecord | undefined> {
    return this.run('readonly', (s) => s.get(key));
  }

  async put(record: HistoryRecord): Promise<void> {
    await this.run('readwrite', (s) => s.put(record));
  }

  async remove(key: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(key));
  }

  async removePrefix(prefix: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(IDBKeyRange.bound(prefix, prefix + '￿')));
  }
}

/** Almacenamiento en memoria: lo usan las pruebas y es el respaldo si IndexedDB no existe. */
export class MemoryHistoryBackend implements HistoryBackend {
  private rows = new Map<string, HistoryRecord>();
  async get(key: string): Promise<HistoryRecord | undefined> {
    const r = this.rows.get(key);
    return r ? structuredClone(r) : undefined;
  }
  async put(record: HistoryRecord): Promise<void> {
    this.rows.set(record.key, structuredClone(record));
  }
  async remove(key: string): Promise<void> {
    this.rows.delete(key);
  }
  async removePrefix(prefix: string): Promise<void> {
    for (const k of [...this.rows.keys()]) if (k.startsWith(prefix)) this.rows.delete(k);
  }
}

export type RecordOutcome = 'added' | 'same' | 'skipped' | 'failed';

/**
 * Historial local por archivo (IndexedDB `pug-ide-history`): las versiones de cada archivo de cada proyecto
 * para poder compararlas y volver atrás. Todo local; los fallos de almacenamiento no son fatales.
 */
@Injectable({ providedIn: 'root' })
export class FileHistoryService {
  /** Sustituible en pruebas. */
  backend: HistoryBackend = typeof indexedDB !== 'undefined' ? new IndexedDbHistoryBackend() : new MemoryHistoryBackend();

  /** Las lecturas-modificaciones-escrituras van en cola para no pisarse entre sí. */
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private key(projectId: string, path: string): string {
    return projectId + SEP + path;
  }

  /** Versiones del archivo, la más reciente primero. Espera a las escrituras pendientes (p. ej. la de un Guardar reciente). */
  list(projectId: string, path: string): Promise<FileVersion[]> {
    return this.enqueue(async () => {
      try {
        return (await this.backend.get(this.key(projectId, path)))?.versions ?? [];
      } catch {
        return [];
      }
    });
  }

  /**
   * Guarda una versión. `previous`: el contenido anterior del archivo; si todavía no hay historial se guarda
   * primero como versión `inicial`, para poder volver al estado con el que se abrió.
   */
  record(
    projectId: string, path: string, content: string, reason: string,
    opts: { auto?: boolean; previous?: string; at?: number } = {},
  ): Promise<RecordOutcome> {
    return this.enqueue(async () => {
      try {
        const key = this.key(projectId, path);
        const at = opts.at ?? Date.now();
        let versions = (await this.backend.get(key))?.versions ?? [];
        let changed = false;
        if (!versions.length && opts.previous !== undefined && opts.previous !== content) {
          const base = addVersion(versions, { at: at - 1, content: opts.previous, reason: 'inicial' });
          if (base) { versions = base; changed = true; }
        }
        const next = addVersion(versions, { at, content, reason }, { auto: opts.auto });
        if (next) { versions = next; changed = true; }
        if (!changed) return versions[0]?.content === content ? 'same' : 'skipped';
        await this.backend.put({ key, versions });
        return next ? 'added' : 'skipped';
      } catch {
        return 'failed';
      }
    });
  }

  /** El historial sigue al archivo cuando se renombra. */
  rename(projectId: string, from: string, to: string): Promise<void> {
    return this.enqueue(async () => {
      try {
        const rec = await this.backend.get(this.key(projectId, from));
        if (!rec) return;
        await this.backend.put({ key: this.key(projectId, to), versions: rec.versions });
        await this.backend.remove(this.key(projectId, from));
      } catch { /* no es fatal */ }
    });
  }

  /** Borra todo el historial de un proyecto. */
  removeProject(projectId: string): Promise<void> {
    return this.enqueue(async () => {
      try { await this.backend.removePrefix(projectId + SEP); } catch { /* no es fatal */ }
    });
  }
}
