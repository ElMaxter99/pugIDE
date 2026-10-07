import { Injectable, signal, computed } from '@angular/core';
import { mimeForPath, refToPath } from '../utils/asset.util';

export interface AssetFile {
  path: string;
  mime: string;
  data: Uint8Array;
}

/**
 * Images and fonts uploaded to the project. Kept apart from the text files so the
 * editor / compiler logic never sees binary content; the preview swaps references
 * to them for in-memory `blob:` URLs.
 */
@Injectable({ providedIn: 'root' })
export class AssetState {
  readonly assets = signal<Map<string, AssetFile>>(new Map());
  /** Local asset references (images / fonts) found in the last render that no uploaded file satisfies. */
  readonly missing = signal<string[]>([]);
  readonly paths = computed(() => [...this.assets().keys()].sort());

  private urls = new Map<string, string>();

  has(path: string): boolean {
    return this.assets().has(path);
  }

  add(path: string, data: Uint8Array, mime = mimeForPath(path)): void {
    this.revoke(path);
    this.assets.update((m) => new Map(m).set(path, { path, mime, data }));
  }

  remove(path: string): void {
    this.revoke(path);
    this.assets.update((m) => { const n = new Map(m); n.delete(path); return n; });
  }

  rename(oldPath: string, newPath: string): void {
    const a = this.assets().get(oldPath);
    if (!a || this.assets().has(newPath)) return;
    this.remove(oldPath);
    this.add(newPath, a.data, mimeForPath(newPath) === 'application/octet-stream' ? a.mime : mimeForPath(newPath));
  }

  replaceAll(list: Iterable<AssetFile>): void {
    for (const p of [...this.urls.keys()]) this.revoke(p);
    this.assets.set(new Map([...list].map((a) => [a.path, a])));
  }

  /** The uploaded file a reference points at: exact root-relative path, else the only asset with that file name. */
  resolve(ref: string): string | null {
    const path = refToPath(ref);
    if (this.assets().has(path)) return path;
    const name = path.split('/').pop()!.toLowerCase();
    const same = this.paths().filter((p) => p.split('/').pop()!.toLowerCase() === name);
    return same.length === 1 ? same[0] : null;
  }

  urlFor(path: string): string | null {
    const a = this.assets().get(path);
    if (!a) return null;
    let url = this.urls.get(path);
    if (!url) {
      url = URL.createObjectURL(new Blob([a.data as BlobPart], { type: a.mime }));
      this.urls.set(path, url);
    }
    return url;
  }

  private revoke(path: string): void {
    const url = this.urls.get(path);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(path);
    }
  }
}
