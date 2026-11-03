import { bytesToDataUri } from '../utils/export-html.util';
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
  private blobs = new Map<string, Blob>();

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

  private dataUris = new Map<string, { data: Uint8Array; uri: string }>();

  /**
   * URL `blob:` -> data URI de cada asset. El preview se ejecuta en un iframe de origen opaco, que no puede
   * cargar los `blob:` de la app; el export y la captura los necesitan autocontenidos. Se memoiza por contenido.
   */
  blobToDataUri(): Map<string, string> {
    const map = new Map<string, string>();
    for (const a of this.assets().values()) {
      const url = this.urlFor(a.path);
      if (!url) continue;
      let hit = this.dataUris.get(a.path);
      if (!hit || hit.data !== a.data) {
        hit = { data: a.data, uri: bytesToDataUri(a.data, a.mime) };
        this.dataUris.set(a.path, hit);
      }
      map.set(url, hit.uri);
    }
    for (const p of [...this.dataUris.keys()]) if (!this.assets().has(p)) this.dataUris.delete(p);
    return map;
  }

  /**
   * `blob:` de cada asset junto con su `Blob`. El preview los recibe una vez (un `Blob` se transfiere por
   * `postMessage` sin copiarlo ni codificarlo) y crea sus propias URL dentro del iframe aislado.
   */
  blobEntries(): { url: string; blob: Blob }[] {
    const out: { url: string; blob: Blob }[] = [];
    for (const a of this.assets().values()) {
      const url = this.urlFor(a.path);
      const blob = this.blobs.get(a.path);
      if (url && blob) out.push({ url, blob });
    }
    return out;
  }

  urlFor(path: string): string | null {
    const a = this.assets().get(path);
    if (!a) return null;
    let url = this.urls.get(path);
    if (!url) {
      const blob = new Blob([a.data as BlobPart], { type: a.mime });
      url = URL.createObjectURL(blob);
      this.urls.set(path, url);
      this.blobs.set(path, blob);
    }
    return url;
  }

  private revoke(path: string): void {
    const url = this.urls.get(path);
    if (url) {
      URL.revokeObjectURL(url);
      this.urls.delete(path);
    }
    this.blobs.delete(path);
  }
}
