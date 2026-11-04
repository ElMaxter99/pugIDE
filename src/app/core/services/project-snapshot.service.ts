import { Injectable } from '@angular/core';
import type { SnapshotContent, SnapshotMeta } from '../models/project-snapshot.model';
import {
  MAX_SNAPSHOTS, MAX_SNAPSHOT_BYTES, WeighedItem, measureSnapshot, oldestSnapshot, snapshotMeta, snapshotsOverLimit, sortNewestFirst,
} from '../utils/snapshot.util';

const DB_NAME = 'pug-ide-snapshots';
const META = 'meta';
const DATA = 'data';

/** Almacenamiento subyacente (IndexedDB en el navegador; en memoria en las pruebas). */
export interface SnapshotBackend {
  put(meta: SnapshotMeta, content: SnapshotContent): Promise<void>;
  listMeta(projectId: string): Promise<SnapshotMeta[]>;
  getContent(id: string): Promise<SnapshotContent | undefined>;
  updateMeta(meta: SnapshotMeta): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

class IndexedDbSnapshotBackend implements SnapshotBackend {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const meta = req.result.createObjectStore(META, { keyPath: 'id' });
        meta.createIndex('projectId', 'projectId');
        req.result.createObjectStore(DATA, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async tx<T>(stores: string[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => IDBRequest | null): Promise<T> {
    const db = await this.open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        const req = fn(tx);
        tx.oncomplete = () => resolve(req?.result as T);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  async put(meta: SnapshotMeta, content: SnapshotContent): Promise<void> {
    await this.tx<void>([META, DATA], 'readwrite', (tx) => {
      tx.objectStore(DATA).put({ id: meta.id, content });
      tx.objectStore(META).put(meta);
      return null;
    });
  }

  listMeta(projectId: string): Promise<SnapshotMeta[]> {
    return this.tx<SnapshotMeta[]>([META], 'readonly', (tx) => tx.objectStore(META).index('projectId').getAll(projectId));
  }

  async getContent(id: string): Promise<SnapshotContent | undefined> {
    const row = await this.tx<{ content: SnapshotContent } | undefined>([DATA], 'readonly', (tx) => tx.objectStore(DATA).get(id));
    return row?.content;
  }

  async updateMeta(meta: SnapshotMeta): Promise<void> {
    await this.tx<void>([META], 'readwrite', (tx) => tx.objectStore(META).put(meta));
  }

  async remove(ids: string[]): Promise<void> {
    await this.tx<void>([META, DATA], 'readwrite', (tx) => {
      for (const id of ids) {
        tx.objectStore(META).delete(id);
        tx.objectStore(DATA).delete(id);
      }
      return null;
    });
  }
}

/** Almacenamiento en memoria: lo usan las pruebas y es el respaldo si IndexedDB no existe. */
export class MemorySnapshotBackend implements SnapshotBackend {
  private metas = new Map<string, SnapshotMeta>();
  private datas = new Map<string, SnapshotContent>();
  async put(meta: SnapshotMeta, content: SnapshotContent): Promise<void> {
    this.datas.set(meta.id, structuredClone(content));
    this.metas.set(meta.id, { ...meta });
  }
  async listMeta(projectId: string): Promise<SnapshotMeta[]> {
    return [...this.metas.values()].filter((m) => m.projectId === projectId).map((m) => ({ ...m }));
  }
  async getContent(id: string): Promise<SnapshotContent | undefined> {
    const c = this.datas.get(id);
    return c ? structuredClone(c) : undefined;
  }
  async updateMeta(meta: SnapshotMeta): Promise<void> {
    if (this.metas.has(meta.id)) this.metas.set(meta.id, { ...meta });
  }
  async remove(ids: string[]): Promise<void> {
    for (const id of ids) { this.metas.delete(id); this.datas.delete(id); }
  }
}

export interface SaveOptions {
  /** Copia creada por PugIDE (p. ej. «Antes de restaurar…»). */
  auto?: boolean;
  /** Permite eliminar la más antigua si ya hay `MAX_SNAPSHOTS`. Sin ello, un proyecto lleno devuelve `full` y no guarda nada. */
  replaceOldest?: boolean;
  at?: number;
}

export type SaveOutcome =
  | { ok: true; meta: SnapshotMeta; replaced: SnapshotMeta | null }
  | { ok: false; reason: 'full'; oldest: SnapshotMeta }
  | { ok: false; reason: 'too-big'; bytes: number; max: number; heaviest: WeighedItem[] }
  | { ok: false; reason: 'unavailable' };

/** Resultado de restaurar: la copia automática que se guardó antes, o por qué no se restauró nada. */
export type RestoreOutcome =
  | { ok: true; safety: SnapshotMeta; replaced: SnapshotMeta | null }
  | { ok: false; reason: 'missing' }
  | Exclude<SaveOutcome, { ok: true }>;

/**
 * Instantáneas con nombre de un proyecto entero (IndexedDB `pug-ide-snapshots`): archivos, juegos de datos, idiomas y assets.
 * Todo local; los fallos de almacenamiento no son fatales (devuelven `unavailable`, lista vacía o `null`).
 */
@Injectable({ providedIn: 'root' })
export class ProjectSnapshotService {
  /** Sustituible en pruebas. */
  backend: SnapshotBackend = typeof indexedDB !== 'undefined' ? new IndexedDbSnapshotBackend() : new MemorySnapshotBackend();

  /** Las lecturas-modificaciones-escrituras van en cola para no pisarse entre sí. */
  private queue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Instantáneas del proyecto, la más reciente primero. */
  list(projectId: string): Promise<SnapshotMeta[]> {
    return this.enqueue(async () => {
      try {
        return sortNewestFirst(await this.backend.listMeta(projectId));
      } catch {
        return [];
      }
    });
  }

  /** Guarda una instantánea. No sustituye la más antigua sin `replaceOldest` y comprueba el tope de tamaño antes de escribir. */
  save(projectId: string, name: string, content: SnapshotContent, opts: SaveOptions = {}): Promise<SaveOutcome> {
    return this.enqueue(async (): Promise<SaveOutcome> => {
      const size = measureSnapshot(content, MAX_SNAPSHOT_BYTES);
      if (!size.fits) return { ok: false, reason: 'too-big', bytes: size.bytes, max: size.max, heaviest: size.heaviest };
      try {
        const existing = await this.backend.listMeta(projectId);
        const oldest = oldestSnapshot(existing);
        if (oldest && existing.length >= MAX_SNAPSHOTS && !opts.replaceOldest) return { ok: false, reason: 'full', oldest };
        const at = opts.at ?? Date.now();
        const meta = snapshotMeta(this.newId(), projectId, name, at, !!opts.auto, content, size.bytes);
        // Primero se escribe la nueva: si falla, la más antigua sigue ahí.
        await this.backend.put(meta, content);
        const over = snapshotsOverLimit([...existing, meta]);
        if (over.length) await this.backend.remove(over.map((s) => s.id));
        return { ok: true, meta, replaced: over[0] ?? null };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    });
  }

  /** Contenido completo de una instantánea, o `null` si ya no existe. */
  load(id: string): Promise<SnapshotContent | null> {
    return this.enqueue(async () => {
      try {
        return (await this.backend.getContent(id)) ?? null;
      } catch {
        return null;
      }
    });
  }

  rename(projectId: string, id: string, name: string): Promise<boolean> {
    return this.enqueue(async () => {
      try {
        const meta = (await this.backend.listMeta(projectId)).find((m) => m.id === id);
        if (!meta) return false;
        await this.backend.updateMeta({ ...meta, name });
        return true;
      } catch {
        return false;
      }
    });
  }

  remove(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      try {
        await this.backend.remove([id]);
        return true;
      } catch {
        return false;
      }
    });
  }

  /** Borra todas las instantáneas de un proyecto (al borrar el proyecto). */
  removeProject(projectId: string): Promise<void> {
    return this.enqueue(async () => {
      try {
        await this.backend.remove((await this.backend.listMeta(projectId)).map((m) => m.id));
      } catch { /* no es fatal */ }
    });
  }
}
