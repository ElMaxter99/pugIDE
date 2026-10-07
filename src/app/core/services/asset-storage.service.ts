import { Injectable } from '@angular/core';
import { AssetFile } from '../state/asset.state';

const DB_NAME = 'pug-ide-assets';
const STORE = 'assets';

/** IndexedDB persistence for uploaded assets (localStorage can't hold megabytes of images). Failures are non-fatal. */
@Injectable({ providedIn: 'root' })
export class AssetStorageService {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'path' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async load(): Promise<AssetFile[]> {
    try {
      const db = await this.open();
      return await new Promise<AssetFile[]>((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result as AssetFile[]);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  /** Returns false when the write failed (quota, private mode…). */
  async save(list: AssetFile[]): Promise<boolean> {
    try {
      const db = await this.open();
      return await new Promise<boolean>((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.clear();
        for (const a of list) store.put(a);
        tx.oncomplete = () => resolve(true);
        tx.onerror = tx.onabort = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
}
