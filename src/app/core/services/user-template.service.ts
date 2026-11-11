import { Injectable, signal } from '@angular/core';
import type { SnapshotContent } from '../models/project-snapshot.model';
import { IndexedDbSnapshotBackend, MemorySnapshotBackend, SnapshotBackend } from './project-snapshot.service';
import { measureSnapshot, snapshotMeta, sortNewestFirst, WeighedItem } from '../utils/snapshot.util';
import { MAX_USER_TEMPLATES, MAX_USER_TEMPLATE_BYTES, USER_TEMPLATES_KEY, UserTemplateMeta } from '../utils/user-template.util';

export type TemplateSaveOutcome =
  | { ok: true; meta: UserTemplateMeta }
  | { ok: false; reason: 'full'; max: number }
  | { ok: false; reason: 'too-big'; bytes: number; max: number; heaviest: WeighedItem[] }
  | { ok: false; reason: 'unavailable' };

/**
 * Plantillas propias (P-25), en IndexedDB `pug-ide-templates`: todo local. Los fallos de almacenamiento no son fatales
 * (devuelven `unavailable`, lista vacía o `null`).
 */
@Injectable({ providedIn: 'root' })
export class UserTemplateService {
  /** Sustituible en pruebas. */
  backend: SnapshotBackend = typeof indexedDB !== 'undefined' ? new IndexedDbSnapshotBackend('pug-ide-templates') : new MemorySnapshotBackend();
  /** Plantillas propias, la más reciente primero. */
  readonly items = signal<UserTemplateMeta[]>([]);

  private newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async refresh(): Promise<UserTemplateMeta[]> {
    let list: UserTemplateMeta[] = [];
    try { list = sortNewestFirst(await this.backend.listMeta(USER_TEMPLATES_KEY)) as UserTemplateMeta[]; } catch { list = []; }
    this.items.set(list.map((m) => ({ ...m, description: m.description ?? '' })));
    return this.items();
  }

  /** Guarda una plantilla nueva o, con `id`, sustituye el contenido de una que ya existe. */
  async save(name: string, description: string, content: SnapshotContent, id?: string): Promise<TemplateSaveOutcome> {
    const size = measureSnapshot(content, MAX_USER_TEMPLATE_BYTES);
    if (!size.fits) return { ok: false, reason: 'too-big', bytes: size.bytes, max: size.max, heaviest: size.heaviest };
    try {
      const existing = await this.backend.listMeta(USER_TEMPLATES_KEY);
      if (!id && existing.length >= MAX_USER_TEMPLATES) return { ok: false, reason: 'full', max: MAX_USER_TEMPLATES };
      const meta: UserTemplateMeta = { ...snapshotMeta(id ?? this.newId(), USER_TEMPLATES_KEY, name, Date.now(), false, content, size.bytes), description };
      await this.backend.put(meta, content);
      await this.refresh();
      return { ok: true, meta };
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
  }

  async load(id: string): Promise<SnapshotContent | null> {
    try { return (await this.backend.getContent(id)) ?? null; } catch { return null; }
  }

  async rename(id: string, name: string): Promise<boolean> {
    try {
      const meta = (await this.backend.listMeta(USER_TEMPLATES_KEY)).find((m) => m.id === id);
      if (!meta) return false;
      await this.backend.updateMeta({ ...meta, name });
      await this.refresh();
      return true;
    } catch { return false; }
  }

  async remove(id: string): Promise<boolean> {
    try { await this.backend.remove([id]); await this.refresh(); return true; } catch { return false; }
  }
}
