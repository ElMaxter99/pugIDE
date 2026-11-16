import { Injectable, inject } from '@angular/core';
import type { SnapshotContent } from '../models/project-snapshot.model';
import { ProjectState } from '../state/project.state';
import { TerminalState } from '../state/terminal.state';
import { desktopInvoke } from '../utils/desktop.util';
import { moveChange, projectPaths, renamesFor } from '../utils/move-to-folder.util';
import { OrchestratorService } from './orchestrator.service';
import { ProjectLibraryService } from './project-library.service';
import { WorkspaceService } from './workspace.service';

export interface FolderCheck { path: string; fileCount: number; conflicts: string[] }
export type MoveOutcome =
  | { ok: true; path: string; written: number; renamed: number }
  | { ok: false; reason: 'read' | 'create' | 'write'; message: string; written: string[] };

/**
 * «Pasar a una carpeta…» (P-41, solo escritorio): escribe un proyecto de «Mis proyectos» (archivos, imágenes, fuentes
 * y juegos de datos) en una carpeta del disco y la abre como espacio de trabajo. Nunca sobrescribe nada de la carpeta:
 * si un nombre coincide, el del proyecto se guarda como «main (2).pug». Opcionalmente quita la copia de la app.
 */
@Injectable({ providedIn: 'root' })
export class MoveToFolderService {
  private readonly library = inject(ProjectLibraryService);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly projectState = inject(ProjectState);
  private readonly workspace = inject(WorkspaceService);
  private readonly terminal = inject(TerminalState);

  /** Contenido del proyecto: el abierto, tal como está ahora; otro, el guardado en la biblioteca. */
  async content(projectId: string): Promise<SnapshotContent | null> {
    if (projectId === this.projectState.projectId()) return this.orchestrator.currentSnapshotContent();
    const snap = await this.library.load(projectId);
    if (!snap) return null;
    return { files: snap.session.files, assets: snap.assets.map((a) => ({ path: a.path, mime: a.mime, data: a.data })), datasets: snap.session.datasets };
  }

  /** Qué hay en la carpeta elegida y qué nombres del proyecto ya existen en ella. */
  check(token: string, content: SnapshotContent): Promise<FolderCheck | null> {
    return desktopInvoke<FolderCheck | null>('ws:folder-check', { token, paths: projectPaths(content) }).catch(() => null);
  }

  async run(opts: { projectId: string; projectName: string; workspaceName: string; color: string; token: string; keepCopy: boolean }): Promise<MoveOutcome> {
    const content = await this.content(opts.projectId);
    if (!content) return { ok: false, reason: 'read', message: 'No se pudo leer el proyecto guardado.', written: [] };
    const check = await this.check(opts.token, content);
    if (!check) return { ok: false, reason: 'create', message: 'La carpeta elegida ya no está disponible. Elígela otra vez.', written: [] };
    const renames = renamesFor(projectPaths(content), check.conflicts);
    const known = new Set((await this.workspace.refresh()).map((w) => w.id));
    const created = await desktopInvoke<{ id: string } | null>('ws:create', { name: opts.workspaceName, color: opts.color, token: opts.token }).catch(() => null);
    if (!created) return { ok: false, reason: 'create', message: 'No se pudo crear el espacio de trabajo en esa carpeta.', written: [] };
    const change = moveChange(content, renames);
    const r = await desktopInvoke<{ written: string[]; failed: string[] }>('ws:write', { id: created.id, change }).catch(() => ({ written: [] as string[], failed: ['?'] }));
    if (r.failed.length) {
      // La lista de espacios no se queda con uno a medias (salvo que esa carpeta ya fuera un espacio).
      if (!known.has(created.id)) await desktopInvoke('ws:remove', { id: created.id }).catch(() => undefined);
      const why = `No se pudo terminar: sin permiso para escribir en ${check.path}. No se ha cambiado nada en «Mis proyectos».`;
      this.terminal.addEntry('error', 'Espacios', `${why}${r.written.length ? ` Se llegaron a escribir: ${r.written.slice(0, 8).join(', ')}${r.written.length > 8 ? '…' : ''}.` : ''}`);
      return { ok: false, reason: 'write', message: why, written: r.written };
    }
    const files = Object.keys(change.files).length;
    const assets = change.assets.length;
    this.terminal.addEntry('success', 'Espacios', `«${opts.projectName}»: ${files} ${files === 1 ? 'archivo' : 'archivos'}${assets ? ` y ${assets} ${assets === 1 ? 'imagen o fuente' : 'imágenes o fuentes'}` : ''} escritos en ${check.path}${renames.size ? ` (${renames.size} con otro nombre porque ya existían: ${[...renames.values()].slice(0, 4).join(', ')})` : ''}.`);
    await this.workspace.open(created.id);
    if (!opts.keepCopy) await this.library.remove(opts.projectId);
    return { ok: true, path: check.path, written: r.written.length, renamed: renames.size };
  }
}
