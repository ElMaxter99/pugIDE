import { Injectable, inject, signal } from '@angular/core';
import { EditorState } from '../state/editor.state';
import { TerminalState } from '../state/terminal.state';
import { UiState } from '../state/ui.state';
import { desktopHasSystem, desktopInvoke, onDesktopEvent } from '../utils/desktop.util';
import { getFileType } from '../models/tab.model';
import { OrchestratorService } from './orchestrator.service';
import { PersistenceService } from './persistence.service';
import { WorkspaceService } from './workspace.service';

/** Lo que el proceso principal dice de una ruta abierta desde fuera (ver `desktop/src/open-path.cjs`). */
export interface OpenDescriptor {
  kind: 'folder' | 'file' | 'unsupported' | 'missing';
  path: string;
  name: string;
  /** Plantilla suelta: su carpeta y la ruta dentro de ella (o del espacio que la contiene). */
  folder?: string;
  folderName?: string;
  entry?: string;
  /** Espacio de trabajo que ya contiene la carpeta (se abre sin preguntar). */
  workspaceId?: string | null;
  /** Permiso de un solo uso para crear el espacio en esa carpeta o leer la plantilla. */
  token?: string;
  /** Ruta que ya no existe pero está en «Abrir reciente» (P-46): se ofrece quitarla de la lista. */
  recent?: boolean;
}

export interface OpenToast {
  kind: 'ok' | 'error';
  title: string;
  sub: string;
  /** Ofrecer «Cambiar nombre y color» (un espacio recién creado). */
  rename?: boolean;
  /** Ofrecer «Quitar de la lista» (un reciente que ya no existe): su ruta. */
  forget?: string;
}

/**
 * Abrir archivos .pug y carpetas con PugIDE (P-40, solo escritorio): doble clic o «Abrir con» desde el sistema, y
 * carpetas soltadas en la ventana. Una carpeta se abre como espacio de trabajo; una plantilla suelta pregunta si abrir
 * su carpeta (recomendado) o solo el archivo, salvo que ya esté dentro de un espacio.
 */
@Injectable({ providedIn: 'root' })
export class OpenWithService {
  private readonly workspace = inject(WorkspaceService);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly persistence = inject(PersistenceService);
  private readonly editorState = inject(EditorState);
  private readonly terminal = inject(TerminalState);
  private readonly ui = inject(UiState);

  readonly available = desktopHasSystem();
  /** Plantilla suelta a la espera de que la persona elija (diálogo «Abrir factura.pug»). */
  readonly request = signal<OpenDescriptor | null>(null);
  readonly toast = signal<OpenToast | null>(null);
  /** Ya ha llegado algo del sistema en este arranque: la bienvenida no debe taparlo (se deja para otro día). */
  readonly received = signal(false);
  private started = false;
  private queue: Promise<void> = Promise.resolve();

  /** Lo llama el arranque cuando ya está restaurada la sesión (o el último espacio): recoge lo que llegó del sistema. */
  start(): void {
    if (!this.available || this.started) return;
    this.started = true;
    onDesktopEvent((e) => { if (e.type === 'open-pending') this.drain(); });
    this.drain();
  }

  /** Una carpeta o archivo soltado en la ventana (con su ruta en disco). */
  openDropped(path: string): void {
    this.enqueue(async () => {
      const d = await desktopInvoke<OpenDescriptor>('open:path', { path }).catch(() => null);
      if (d) await this.handle(d);
    });
  }

  /** Respuesta del diálogo «Abrir factura.pug». */
  choose(choice: 'folder' | 'file' | null, remember: boolean): void {
    const d = this.request();
    this.request.set(null);
    if (!d || !choice) return;
    if (remember) this.persistence.saveOpenFileChoice(choice);
    this.enqueue(() => (choice === 'folder' ? this.openFolder(d) : this.openOnlyFile(d)));
  }

  private drain(): void {
    this.enqueue(async () => {
      const list = await desktopInvoke<OpenDescriptor[]>('open:pending').catch(() => []);
      for (const d of Array.isArray(list) ? list : []) await this.handle(d);
    });
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task, task).catch(() => undefined);
  }

  private async handle(d: OpenDescriptor): Promise<void> {
    // Primer uso abriendo un archivo: la bienvenida taparía la pregunta. Se cierra sin darla por vista (saldrá otro día).
    this.received.set(true);
    this.ui.welcomeOpen.set(false);
    if (d.kind === 'missing') {
      this.fail(`No se encuentra ${d.name || d.path}`, d.recent ? `${d.path} · puede que se haya movido o borrado` : 'Puede que se haya movido o borrado.', d.recent ? d.path : undefined);
      return;
    }
    if (d.kind === 'unsupported') { this.fail(`No se puede abrir ${d.name}`, 'PugIDE abre .pug, .jade, carpetas y los archivos de un proyecto (estilos, datos, imágenes).'); return; }
    if (d.kind === 'folder') { await this.openFolder(d); return; }
    if (d.workspaceId) { await this.openFolder(d); return; }
    const choice = this.persistence.loadOpenFileChoice();
    if (choice === 'folder') await this.openFolder(d);
    else if (choice === 'file') await this.openOnlyFile(d);
    else this.request.set(d);
  }

  /** Abre la carpeta (o la de la plantilla) como espacio de trabajo; con una plantilla, la deja en la vista previa. */
  private async openFolder(d: OpenDescriptor): Promise<void> {
    const isFile = d.kind === 'file';
    const name = isFile ? d.folderName || 'Plantillas' : d.name;
    const where = isFile ? d.folder ?? d.path : d.path;
    await this.workspace.refresh();
    const ok = d.workspaceId ? await this.workspace.open(d.workspaceId)
      : d.token ? await this.workspace.create(name, this.workspace.colors()[0] ?? '#ddb7ff', d.token)
      : false;
    if (!ok) { this.fail(`No se pudo abrir «${name}»`, 'Mira el Registro para ver el motivo.'); return; }
    const active = this.workspace.active();
    if (isFile && d.entry) await this.select(d.entry);
    this.toast.set({
      kind: 'ok',
      title: `Espacio «${active?.name ?? name}» abierto`,
      sub: `${active?.path ?? where}${isFile && d.entry ? ` · ${d.name} en la vista previa` : ''}`,
      rename: !d.workspaceId,
    });
  }

  /** «Solo este archivo»: una copia en un proyecto nuevo de la app (los cambios no van al disco). */
  private async openOnlyFile(d: OpenDescriptor): Promise<void> {
    const r = await desktopInvoke<{ name: string; text: string | null; tooBig?: boolean } | null>('open:read-file', { token: d.token }).catch(() => null);
    if (!r || r.text === null) { this.fail(`No se pudo leer ${d.name}`, r?.tooBig ? 'Pesa más de 2 MB.' : 'Puede que se haya movido o que no haya permiso.'); return; }
    if (this.workspace.active()) await this.workspace.close();
    const path = `/${r.name}`;
    this.orchestrator.loadProject(new Map([[path, r.text]]), r.name.replace(/\.(pug|jade)$/i, ''), [], null, {}, { previewEntry: path, activeTabPath: path, openTabPaths: [path] });
    this.terminal.addEntry('info', 'Abrir', `${d.path} abierto como proyecto nuevo de la app (una copia: los cambios no se guardan en el disco).`);
    this.toast.set({ kind: 'ok', title: `${r.name} abierto como proyecto nuevo`, sub: 'Una copia: los cambios no se guardan en el disco.' });
  }

  private async select(entry: string): Promise<void> {
    const content = this.editorState.files().get(entry);
    if (content === undefined) return;
    const name = entry.split('/').pop() ?? entry;
    this.editorState.openFile(entry, name, getFileType(name), content);
    await this.orchestrator.setPreviewEntry(entry);
  }

  /** «Quitar de la lista»: un reciente que ya no existe (no se borra nada del disco). */
  forget(path: string): void {
    void desktopInvoke('open:forget', { path }).catch(() => undefined);
    this.toast.set(null);
  }

  private fail(title: string, sub: string, forget?: string): void {
    this.toast.set({ kind: 'error', title, sub, ...(forget ? { forget } : {}) });
    this.terminal.addEntry('error', 'Abrir', `${title}. ${sub}`);
  }

  openWorkspaces(): void {
    this.toast.set(null);
    this.ui.workspacesOpen.set(true);
  }
}
