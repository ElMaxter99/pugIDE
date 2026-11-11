import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { OrchestratorService } from './orchestrator.service';
import { EditorState } from '../state/editor.state';
import { ProjectState } from '../state/project.state';
import { TerminalState } from '../state/terminal.state';
import type { AssetFile } from '../state/asset.state';
import { parseDatasetsFile } from '../utils/datasets.util';
import { desktopHasSystem, desktopInvoke, onDesktopEvent } from '../utils/desktop.util';
import { PROJECT_TEMPLATES } from '../utils/templates.util';
import { SyncState, WorkspaceChange, WorkspaceInfo, diffForDisk, emptyChange, externalAction, markSynced } from '../utils/workspace.util';

interface OpenResult {
  ok: boolean; reason?: string;
  files?: Record<string, string>; assets?: AssetFile[]; datasets?: string | null; skippedCount?: number;
  workspace?: { id: string; name: string; color: string; path: string };
}
type DiskEntry = { text?: string; mime?: string; data?: Uint8Array } | null;
export interface WorkspaceConflict { path: string; disk: string | null; }
export interface PickedFolder { token: string; path: string; pugCount: number; tooBig: boolean; }

/**
 * Espacios de trabajo de la app de escritorio (P-26): un espacio es una carpeta del disco. Al abrirlo, sus archivos son
 * el proyecto; lo que se edita se escribe en la carpeta y lo que cambia fuera se recarga. En la web no hace nada.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly orchestrator = inject(OrchestratorService);
  private readonly editorState = inject(EditorState);
  private readonly projectState = inject(ProjectState);
  private readonly terminal = inject(TerminalState);

  /** La app de escritorio ofrece espacios de trabajo. */
  readonly available = desktopHasSystem();
  readonly workspaces = signal<WorkspaceInfo[]>([]);
  readonly colors = signal<string[]>([]);
  readonly active = signal<{ id: string; name: string; color: string; path: string } | null>(null);
  readonly status = signal<'saved' | 'saving' | 'error'>('saved');
  /** Archivos que cambiaron en disco y aquí a la vez: la persona decide. */
  readonly conflicts = signal<WorkspaceConflict[]>([]);
  readonly statusText = computed(() => this.status() === 'saving' ? 'Guardando en disco…' : this.status() === 'error' ? 'No se pudo guardar en disco' : 'Guardado en disco');

  private synced: SyncState = { texts: new Map(), assets: new Map(), datasets: null };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing: Promise<void> = Promise.resolve();
  private lastId: string | null = null;

  constructor() {
    if (!this.available) return;
    onDesktopEvent((e) => {
      if (e.type === 'workspace-changed' && e['id'] === this.active()?.id && Array.isArray(e['paths'])) void this.onDiskChange(e['paths'] as string[]);
    });
    // Cada guardado de la sesión se lleva a la carpeta (con un pequeño margen para agrupar pulsaciones).
    effect(() => {
      this.orchestrator.sessionSaves();
      untracked(() => { if (this.active()) this.scheduleSync(); });
    });
  }

  async refresh(): Promise<WorkspaceInfo[]> {
    if (!this.available) return [];
    try {
      const r = await desktopInvoke<{ workspaces: WorkspaceInfo[]; lastId: string | null; colors: string[] }>('ws:list');
      this.workspaces.set(r.workspaces);
      this.colors.set(r.colors);
      this.lastId = r.lastId;
    } catch { this.workspaces.set([]); }
    return this.workspaces();
  }

  /** El espacio que estaba abierto la última vez, si sigue existiendo. */
  lastWorkspaceId(): string | null {
    const ws = this.workspaces().find((w) => w.id === this.lastId);
    return ws?.exists ? ws.id : null;
  }

  pickFolder(): Promise<PickedFolder | null> {
    return desktopInvoke<PickedFolder | null>('ws:pick-folder').catch(() => null);
  }

  /** Crea el espacio en la carpeta elegida. Con `templateId`, una carpeta sin plantillas empieza con esa plantilla. */
  async create(name: string, color: string, token: string, templateId?: string): Promise<boolean> {
    const r = await desktopInvoke<{ id: string } | null>('ws:create', { name, color, token }).catch(() => null);
    if (!r) return false;
    return this.open(r.id, templateId);
  }

  async open(id: string, templateId?: string): Promise<boolean> {
    await this.flush();
    const r = await desktopInvoke<OpenResult>('ws:open', { id }).catch(() => ({ ok: false, reason: 'error' }) as OpenResult);
    if (!r.ok || !r.workspace) {
      const why = r.reason === 'no-folder' ? 'no se encuentra su carpeta (¿disco desconectado?)'
        : r.reason === 'too-big' ? 'la carpeta tiene demasiados archivos o pesa demasiado (máximo 2000 archivos y 60 MB): elige la carpeta de las plantillas, no la del proyecto entero'
        : 'no se pudo leer la carpeta';
      this.terminal.addEntry('error', 'Espacios', `No se abrió el espacio: ${why}.`);
      await this.refresh();
      return false;
    }
    const ws = r.workspace;
    let files = r.files ?? {};
    const assets = r.assets ?? [];
    const datasets = r.datasets ? parseDatasetsFile(r.datasets) : null;
    const hasTemplates = Object.keys(files).some((p) => /\.(pug|jade)$/i.test(p));
    let data: Record<string, unknown> | null = null;
    if (!hasTemplates) {
      const tpl = PROJECT_TEMPLATES.find((t) => t.id === templateId);
      files = { ...files, ...(tpl ? tpl.files : { '/main.pug': 'doctype html\nhtml(lang="es")\n  head\n    meta(charset="UTF-8")\n    title= titulo\n  body\n    h1= titulo\n' }) };
      data = tpl ? structuredClone(tpl.data) : { titulo: ws.name };
    }
    // Lo que hay en disco es el punto de partida: lo que se añada ahora (una plantilla) se escribe en el primer guardado.
    this.synced = { texts: new Map(Object.entries(r.files ?? {})), assets: new Map(assets.map((a) => [a.path, a.data])), datasets: r.datasets ?? null };
    this.conflicts.set([]);
    this.status.set('saved');
    this.active.set(ws);
    this.orchestrator.loadProject(new Map(Object.entries(files)), ws.name, assets, datasets, datasets ? null : (data ?? {}), { id: `ws-${ws.id}` });
    this.terminal.addEntry('success', 'Espacios', `Espacio «${ws.name}» abierto: ${ws.path}${r.skippedCount ? ` (${r.skippedCount} ${r.skippedCount === 1 ? 'archivo de otro tipo no se muestra' : 'archivos de otro tipo no se muestran'})` : ''}.`);
    await this.refresh();
    this.scheduleSync();
    return true;
  }

  /** Cierra el espacio (lo guardado se queda en su carpeta) y vuelve a los proyectos guardados en la app. */
  async close(): Promise<void> {
    const ws = this.active();
    if (!ws) return;
    await this.flush();
    this.active.set(null);
    this.conflicts.set([]);
    await desktopInvoke('ws:close', { id: ws.id }).catch(() => undefined);
    await this.orchestrator.createProject();
    this.terminal.addEntry('info', 'Espacios', `Espacio «${ws.name}» cerrado. Sus archivos siguen en ${ws.path}.`);
    await this.refresh();
  }

  async rename(id: string, name: string, color: string): Promise<void> {
    await desktopInvoke('ws:update', { id, name, color }).catch(() => undefined);
    const list = await this.refresh();
    const ws = list.find((w) => w.id === id);
    if (ws && this.active()?.id === id) {
      this.active.set({ id, name: ws.name, color: ws.color, path: ws.path });
      this.projectState.projectName.set(ws.name);
    }
  }

  /** Quita el espacio de la lista (no borra nada del disco). */
  async forget(id: string): Promise<void> {
    if (this.active()?.id === id) await this.close();
    await desktopInvoke('ws:remove', { id }).catch(() => undefined);
    await this.refresh();
  }

  async relocate(id: string): Promise<boolean> {
    const picked = await this.pickFolder();
    if (!picked) return false;
    const r = await desktopInvoke<{ ok: boolean }>('ws:relocate', { id, token: picked.token }).catch(() => ({ ok: false }));
    await this.refresh();
    return r.ok;
  }

  reveal(): void {
    const ws = this.active();
    if (ws) void desktopInvoke('ws:reveal', { id: ws.id }).catch(() => undefined);
  }

  // ---- Guardar en disco ----

  private scheduleSync(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.sync(); }, 500);
  }

  /** Escribe ya lo pendiente (antes de cambiar de espacio o de cerrarlo). */
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.active()) await this.sync();
    await this.writing;
  }

  private pendingChange(): WorkspaceChange {
    const c = this.orchestrator.currentSnapshotContent();
    const change = diffForDisk({ files: c.files, assets: c.assets, datasets: c.datasets ? JSON.stringify(c.datasets, null, 2) : null }, this.synced);
    // Un archivo en conflicto no se pisa hasta que la persona decide.
    for (const k of this.conflicts()) { delete change.files[k.path]; change.deleted = change.deleted.filter((p) => p !== k.path); }
    return change;
  }

  private sync(): Promise<void> {
    const ws = this.active();
    if (!ws) return Promise.resolve();
    this.writing = this.writing.then(async () => {
      if (this.active()?.id !== ws.id) return;
      const change = this.pendingChange();
      if (emptyChange(change)) { if (this.status() === 'saving') this.status.set('saved'); return; }
      this.status.set('saving');
      try {
        const r = await desktopInvoke<{ written: string[]; failed: string[] }>('ws:write', { id: ws.id, change });
        markSynced(this.synced, change, r.failed);
        if (r.failed.length) {
          this.status.set('error');
          this.terminal.addEntry('error', 'Espacios', `No se pudo escribir en disco: ${r.failed.slice(0, 5).join(', ')}${r.failed.length > 5 ? '…' : ''}. Comprueba los permisos de la carpeta.`);
        } else {
          this.status.set('saved');
        }
      } catch {
        this.status.set('error');
      }
    });
    return this.writing;
  }

  // ---- Cambios hechos fuera ----

  private async onDiskChange(paths: string[]): Promise<void> {
    const ws = this.active();
    if (!ws) return;
    await this.writing;
    const disk = await desktopInvoke<Record<string, DiskEntry>>('ws:read-paths', { id: ws.id, paths }).catch(() => ({}) as Record<string, DiskEntry>);
    if (this.active()?.id !== ws.id) return;
    const current = this.orchestrator.currentSnapshotContent();
    const texts: Record<string, string | null> = {};
    const assets: Record<string, { mime: string; data: Uint8Array } | null> = {};
    const conflicts = [...this.conflicts()];
    const applied: string[] = [];
    for (const [path, entry] of Object.entries(disk)) {
      if (path === '/.pugide/datasets.json') continue; // los datos mandan desde la app
      const isAsset = !!entry?.data || this.synced.assets.has(path);
      if (isAsset) {
        if (entry?.data) { assets[path] = { mime: entry.mime ?? 'application/octet-stream', data: entry.data }; this.synced.assets.set(path, entry.data); }
        else { assets[path] = null; this.synced.assets.delete(path); }
        applied.push(path);
        continue;
      }
      const diskText = entry?.text ?? null;
      const appText = path in current.files ? current.files[path] : null;
      const action = externalAction(diskText, appText, this.synced.texts.get(path) ?? null);
      if (action === 'ignore') {
        if (diskText !== null) this.synced.texts.set(path, diskText); else this.synced.texts.delete(path);
      } else if (action === 'apply') {
        texts[path] = diskText;
        if (diskText !== null) this.synced.texts.set(path, diskText); else this.synced.texts.delete(path);
        applied.push(path);
      } else if (!conflicts.some((k) => k.path === path)) {
        conflicts.push({ path, disk: diskText });
      } else {
        conflicts.splice(conflicts.findIndex((k) => k.path === path), 1, { path, disk: diskText });
      }
    }
    if (Object.keys(texts).length || Object.keys(assets).length) {
      this.orchestrator.applyExternalChanges(texts, assets);
      this.terminal.addEntry('info', 'Espacios', `${applied.length === 1 ? 'Cambió en disco' : 'Cambiaron en disco'} y se ${applied.length === 1 ? 'recargó' : 'recargaron'}: ${applied.slice(0, 6).join(', ')}${applied.length > 6 ? '…' : ''}.`);
    }
    this.conflicts.set(conflicts);
  }

  /** Conflicto: se queda lo de la app (se escribe en disco) o lo del disco (se carga aquí). */
  async resolveConflict(path: string, keep: 'mine' | 'disk'): Promise<void> {
    const k = this.conflicts().find((c) => c.path === path);
    if (!k) return;
    this.conflicts.update((list) => list.filter((c) => c.path !== path));
    if (keep === 'disk') {
      if (k.disk !== null) this.synced.texts.set(path, k.disk); else this.synced.texts.delete(path);
      this.orchestrator.applyExternalChanges({ [path]: k.disk });
      this.terminal.addEntry('info', 'Espacios', `${path}: se cargó la versión del disco.`);
    } else {
      // Se da por desconocido lo que hay en disco para que el siguiente guardado lo escriba.
      if (this.editorState.files().has(path)) this.synced.texts.delete(path);
      else this.synced.texts.set(path, k.disk ?? ''); // aquí se borró: el guardado lo borra también del disco
      await this.sync();
      this.terminal.addEntry('info', 'Espacios', `${path}: se conservó la versión de PugIDE y se escribió en disco.`);
    }
  }
}
