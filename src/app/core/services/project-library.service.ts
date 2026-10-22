import { Injectable } from '@angular/core';
import type { AssetFile } from '../state/asset.state';
import type { ProjectSessionState } from './persistence.service';

const DB_NAME = 'pug-ide-projects';
const META = 'meta';
const DATA = 'data';

/** Datos ligeros de un proyecto guardado, para listarlo sin cargar sus archivos. */
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: number;
  fileCount: number;
  assetCount: number;
}

/** Contenido completo de un proyecto guardado. */
export interface ProjectSnapshot {
  session: ProjectSessionState;
  assets: AssetFile[];
}

/** Almacenamiento subyacente (IndexedDB en el navegador; en memoria en las pruebas). */
export interface LibraryBackend {
  put(meta: ProjectSummary, data: ProjectSnapshot): Promise<void>;
  getAllMeta(): Promise<ProjectSummary[]>;
  getData(id: string): Promise<ProjectSnapshot | null>;
  remove(id: string): Promise<void>;
}

class IndexedDbBackend implements LibraryBackend {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(META, { keyPath: 'id' });
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

  async put(meta: ProjectSummary, data: ProjectSnapshot): Promise<void> {
    await this.tx<void>([META, DATA], 'readwrite', (tx) => {
      tx.objectStore(META).put(meta);
      tx.objectStore(DATA).put({ id: meta.id, ...data });
      return null;
    });
  }

  getAllMeta(): Promise<ProjectSummary[]> {
    return this.tx<ProjectSummary[]>([META], 'readonly', (tx) => tx.objectStore(META).getAll());
  }

  async getData(id: string): Promise<ProjectSnapshot | null> {
    const row = await this.tx<(ProjectSnapshot & { id: string }) | undefined>([DATA], 'readonly', (tx) => tx.objectStore(DATA).get(id));
    return row ? { session: row.session, assets: row.assets } : null;
  }

  async remove(id: string): Promise<void> {
    await this.tx<void>([META, DATA], 'readwrite', (tx) => {
      tx.objectStore(META).delete(id);
      tx.objectStore(DATA).delete(id);
      return null;
    });
  }
}

/** Almacenamiento en memoria: lo usan las pruebas y es el respaldo si IndexedDB no existe. */
export class MemoryLibraryBackend implements LibraryBackend {
  private metas = new Map<string, ProjectSummary>();
  private datas = new Map<string, ProjectSnapshot>();

  async put(meta: ProjectSummary, data: ProjectSnapshot): Promise<void> {
    this.metas.set(meta.id, { ...meta });
    this.datas.set(meta.id, structuredClone(data));
  }
  async getAllMeta(): Promise<ProjectSummary[]> {
    return [...this.metas.values()].map((m) => ({ ...m }));
  }
  async getData(id: string): Promise<ProjectSnapshot | null> {
    const d = this.datas.get(id);
    return d ? structuredClone(d) : null;
  }
  async remove(id: string): Promise<void> {
    this.metas.delete(id);
    this.datas.delete(id);
  }
}

/**
 * Biblioteca de proyectos guardados en IndexedDB (`pug-ide-projects`): cada proyecto con sus
 * archivos, juegos de datos y assets. Todo local; los fallos de almacenamiento no son fatales
 * (los métodos devuelven false / null / lista vacía).
 */
@Injectable({ providedIn: 'root' })
export class ProjectLibraryService {
  /** Sustituible en pruebas. */
  backend: LibraryBackend = new IndexedDbBackend();

  /** Nuevo identificador de proyecto. */
  newId(): string {
    const rnd = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `p-${rnd}`;
  }

  async list(): Promise<ProjectSummary[]> {
    try {
      return (await this.backend.getAllMeta()).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  /** Guarda (o actualiza) un proyecto. Devuelve false si no se pudo escribir (cuota, modo privado…). */
  async save(id: string, snapshot: ProjectSnapshot): Promise<boolean> {
    const meta: ProjectSummary = {
      id,
      name: snapshot.session.projectName,
      updatedAt: Date.now(),
      fileCount: Object.keys(snapshot.session.files).length,
      assetCount: snapshot.assets.length,
    };
    try {
      await this.backend.put(meta, snapshot);
      return true;
    } catch {
      return false;
    }
  }

  async load(id: string): Promise<ProjectSnapshot | null> {
    try {
      return await this.backend.getData(id);
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.backend.remove(id);
      return true;
    } catch {
      return false;
    }
  }

  /** Cambia el nombre guardado (también dentro de la sesión del proyecto). */
  async rename(id: string, name: string): Promise<boolean> {
    const snap = await this.load(id);
    if (!snap) return false;
    snap.session.projectName = name;
    return this.save(id, snap);
  }

  /** Copia un proyecto con otro id y nombre; devuelve el id nuevo o null. */
  async duplicate(id: string, name: string): Promise<string | null> {
    const snap = await this.load(id);
    if (!snap) return null;
    snap.session.projectName = name;
    const copyId = this.newId();
    return (await this.save(copyId, snap)) ? copyId : null;
  }
}
