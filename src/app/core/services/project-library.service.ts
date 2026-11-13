import { Injectable } from '@angular/core';
import type { AssetFile } from '../state/asset.state';
import type { ProjectSessionState } from './persistence.service';

const DB_NAME = 'pug-ide-projects';
const META = 'meta';
const DATA = 'data';
/** Desde la versión 2: las imágenes y fuentes de cada proyecto, aparte del texto (ver `put`). */
const ASSETS = 'assets';

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

/**
 * Lo que se guarda. Sin `assets`, las imágenes y fuentes guardadas del proyecto se conservan como estaban: así el
 * autoguardado (cada vez que se deja de escribir) solo escribe el texto y los datos, no decenas de MB de imágenes.
 */
export interface ProjectSave {
  session: ProjectSessionState;
  assets?: AssetFile[];
}

/** Almacenamiento subyacente (IndexedDB en el navegador; en memoria en las pruebas). */
export interface LibraryBackend {
  put(meta: ProjectSummary, data: ProjectSave): Promise<void>;
  getAllMeta(): Promise<ProjectSummary[]>;
  getData(id: string): Promise<ProjectSnapshot | null>;
  remove(id: string): Promise<void>;
}

class IndexedDbBackend implements LibraryBackend {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      // Versión 2: almacén `assets` aparte. Los proyectos guardados con la 1 llevan los assets dentro de `data`;
      // se siguen leyendo (getData) y pasan a `assets` la primera vez que se guardan con ellos.
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'id' });
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

  async put(meta: ProjectSummary, data: ProjectSave): Promise<void> {
    await this.tx<void>([META, DATA, ASSETS], 'readwrite', (tx) => {
      tx.objectStore(META).put(meta);
      if (data.assets) {
        tx.objectStore(DATA).put({ id: meta.id, session: data.session });
        tx.objectStore(ASSETS).put({ id: meta.id, assets: data.assets });
        return null;
      }
      // Sin assets: se conserva lo guardado. Un proyecto de la versión 1 los tiene dentro de `data`: se mantienen ahí.
      const store = tx.objectStore(DATA);
      const old = store.get(meta.id);
      old.onsuccess = () => {
        const legacy = (old.result as { assets?: AssetFile[] } | undefined)?.assets;
        store.put(legacy ? { id: meta.id, session: data.session, assets: legacy } : { id: meta.id, session: data.session });
      };
      return null;
    });
  }

  getAllMeta(): Promise<ProjectSummary[]> {
    return this.tx<ProjectSummary[]>([META], 'readonly', (tx) => tx.objectStore(META).getAll());
  }

  async getData(id: string): Promise<ProjectSnapshot | null> {
    let assetsRow: { assets: AssetFile[] } | undefined;
    const row = await this.tx<{ session: ProjectSessionState; assets?: AssetFile[] } | undefined>([DATA, ASSETS], 'readonly', (tx) => {
      const a = tx.objectStore(ASSETS).get(id);
      a.onsuccess = () => { assetsRow = a.result as { assets: AssetFile[] } | undefined; };
      return tx.objectStore(DATA).get(id);
    });
    return row ? { session: row.session, assets: assetsRow?.assets ?? row.assets ?? [] } : null;
  }

  async remove(id: string): Promise<void> {
    await this.tx<void>([META, DATA, ASSETS], 'readwrite', (tx) => {
      tx.objectStore(META).delete(id);
      tx.objectStore(DATA).delete(id);
      tx.objectStore(ASSETS).delete(id);
      return null;
    });
  }
}

/** Almacenamiento en memoria: lo usan las pruebas y es el respaldo si IndexedDB no existe. */
export class MemoryLibraryBackend implements LibraryBackend {
  private metas = new Map<string, ProjectSummary>();
  private datas = new Map<string, ProjectSnapshot>();

  /** Cuántas veces se han escrito assets (para las pruebas del autoguardado). */
  assetWrites = 0;

  async put(meta: ProjectSummary, data: ProjectSave): Promise<void> {
    this.metas.set(meta.id, { ...meta });
    if (data.assets) this.assetWrites++;
    const assets = data.assets ?? this.datas.get(meta.id)?.assets ?? [];
    this.datas.set(meta.id, structuredClone({ session: data.session, assets }));
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

  /**
   * Guarda (o actualiza) un proyecto. Devuelve false si no se pudo escribir (cuota, modo privado…). Sin
   * `snapshot.assets` se conservan los assets guardados (pasa `assetCount` para el resumen).
   */
  async save(id: string, snapshot: ProjectSave, assetCount = snapshot.assets?.length ?? 0): Promise<boolean> {
    const meta: ProjectSummary = {
      id,
      name: snapshot.session.projectName,
      updatedAt: Date.now(),
      fileCount: Object.keys(snapshot.session.files).length,
      assetCount: snapshot.assets?.length ?? assetCount,
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
