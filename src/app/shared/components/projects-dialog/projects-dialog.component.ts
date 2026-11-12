import { Component, ChangeDetectionStrategy, ElementRef, inject, input, output, signal, effect, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectLibraryService, ProjectSummary } from '../../../core/services/project-library.service';
import { ProjectState } from '../../../core/state/project.state';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';
import { UiState } from '../../../core/state/ui.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UserTemplateService } from '../../../core/services/user-template.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { formatBytes } from '../../../core/utils/snapshot.util';
import { UserTemplateMeta, cleanTemplateName, packTemplate, unpackTemplate } from '../../../core/utils/user-template.util';

/** Lista de proyectos guardados en el navegador: abrir, crear, renombrar, duplicar y borrar. */
@Component({
  selector: 'app-projects-dialog',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="overlay" (click)="closed.emit()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Mis proyectos" tabindex="-1"
          (click)="$event.stopPropagation()" (keydown.escape)="closed.emit()" (keydown)="onKeydown($event)">
          <div class="header">
            <h2>Mis proyectos</h2>
            <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="closed.emit()">&times;</button>
          </div>
          <p class="hint">Se guardan solo en este navegador (IndexedDB). Exporta un .zip si quieres una copia fuera.</p>
          <ul class="list">
            @for (p of projects(); track p.id) {
              <li class="row" [class.current]="p.id === currentId()">
                <div class="info">
                  @if (renamingId() === p.id) {
                    <input class="name-input" [value]="p.name" #nameInput
                      (keydown.enter)="rename(p, nameInput.value)" (keydown.escape)="renamingId.set(null)"
                      (blur)="rename(p, nameInput.value)" autofocus />
                  } @else {
                    <span class="name">{{ p.id === currentId() ? currentName() : p.name }}</span>
                    @if (p.id === currentId()) { <span class="badge">abierto</span> }
                  }
                  <span class="meta">{{ p.fileCount }} archivo(s) · {{ p.assetCount }} asset(s) · {{ p.updatedAt | date: 'short' }}</span>
                </div>
                <div class="actions">
                  @if (p.id !== currentId()) {
                    <button class="btn" (click)="open(p)">Abrir</button>
                  }
                  <button class="btn" (click)="renamingId.set(p.id)">Renombrar</button>
                  <button class="btn" (click)="duplicate(p)">Duplicar</button>
                  @if (confirmDeleteId() === p.id) {
                    <button class="btn danger" (click)="remove(p)">Confirmar</button>
                  } @else {
                    <button class="btn" (click)="confirmDeleteId.set(p.id)">Borrar</button>
                  }
                </div>
              </li>
            } @empty {
              <li class="empty">{{ loading() ? 'Cargando…' : 'Aún no hay proyectos guardados.' }}</li>
            }
          </ul>
          <div class="tpl-head">
            <h3>Mis plantillas · {{ userTemplates().length }}</h3>
            <button class="btn" data-testid="template-import" (click)="file.click()">Importar plantilla (.zip)…</button>
            <button class="btn" data-testid="template-save-current" (click)="ui.saveTemplateOpen.set(true)">Guardar el proyecto abierto como plantilla…</button>
            <input #file type="file" accept=".zip,application/zip" hidden data-testid="template-import-input" (change)="importTemplate($any($event.target))" />
          </div>
          <ul class="list tpl-list" data-testid="user-templates">
            @for (t of userTemplates(); track t.id) {
              <li class="row">
                <div class="info">
                  @if (renamingTplId() === t.id) {
                    <input class="name-input" [value]="t.name" #tplName aria-label="Nombre de la plantilla"
                      (keydown.enter)="renameTemplate(t, tplName.value)" (keydown.escape)="renamingTplId.set(null)" (blur)="renameTemplate(t, tplName.value)" autofocus />
                  } @else {
                    <span class="name">{{ t.name }}</span>
                  }
                  @if (t.description) { <span class="meta">{{ t.description }}</span> }
                  <span class="meta">{{ t.fileCount }} archivo(s) · {{ t.assetCount }} asset(s) · {{ size(t.bytes) }} · {{ t.at | date: 'short' }}</span>
                </div>
                <div class="actions">
                  <button class="btn primary small" [attr.data-testid]="'template-use-' + t.name" (click)="useTemplate(t)">Usar</button>
                  <button class="btn" (click)="renamingTplId.set(t.id)">Renombrar</button>
                  <button class="btn" title="Sustituye el contenido de la plantilla por el del proyecto abierto" (click)="updateTemplate(t)">Actualizar</button>
                  <button class="btn" (click)="exportTemplate(t)">Exportar</button>
                  @if (confirmDeleteTplId() === t.id) {
                    <button class="btn danger" (click)="removeTemplate(t)">Confirmar</button>
                  } @else {
                    <button class="btn" (click)="confirmDeleteTplId.set(t.id)">Borrar</button>
                  }
                </div>
              </li>
            } @empty {
              <li class="empty small-empty">Aún no tienes plantillas propias. Guarda el proyecto abierto como plantilla para reutilizarlo como punto de partida.</li>
            }
          </ul>
          @if (tplMessage(); as m) { <p class="hint msg" role="status">{{ m }}</p> }
          <div class="footer">
            <span class="footer-label">De PugIDE:</span>
            <select class="template-select" aria-label="Plantilla del proyecto nuevo" #tpl>
              <option value="">Proyecto vacío</option>
              @for (t of templates; track t.id) {
                <option [value]="t.id" [title]="t.description">{{ t.name }}</option>
              }
            </select>
            <button class="btn primary" (click)="create(tpl.value)">Nuevo proyecto</button>
            <span class="import-wrap">
              <button class="btn" data-testid="import-project" aria-haspopup="menu" [attr.aria-expanded]="importMenu()" (click)="importMenu.set(!importMenu())">
                <span aria-hidden="true" class="material-symbols-outlined">drive_folder_upload</span>Importar proyecto…
              </button>
              @if (importMenu()) {
                <div class="import-menu" role="menu" aria-label="Importar proyecto" (keydown.escape)="$event.stopPropagation(); importMenu.set(false)">
                  <button class="menu-item" role="menuitem" data-testid="import-project-folder" (click)="importMenu.set(false); projFolder.click()">
                    <span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Desde una carpeta…</button>
                  <button class="menu-item" role="menuitem" data-testid="import-project-zip" (click)="importMenu.set(false); projZip.click()">
                    <span aria-hidden="true" class="material-symbols-outlined">folder_zip</span>Desde un archivo .zip…</button>
                  <p class="menu-note">Crea un proyecto nuevo. «{{ currentName() }}» sigue guardado aquí.</p>
                </div>
              }
              <input #projFolder type="file" webkitdirectory hidden data-testid="import-project-folder-input" (change)="onProjectPicked($any($event.target), 'folder')" />
              <input #projZip type="file" accept=".zip,application/zip" hidden data-testid="import-project-zip-input" (change)="onProjectPicked($any($event.target), 'zip')" />
            </span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .hint { margin: 0; padding: 0 20px 12px; font-size: 12px; color: var(--text-secondary); }
    .list { list-style: none; margin: 0; padding: 0 12px; overflow-y: auto; }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 8px; border-radius: 6px; flex-wrap: wrap; }
    .row:hover { background: var(--bg-hover); }
    .row.current { border: 1px solid var(--accent-color); }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .name { font-size: 14px; color: var(--text-primary); font-weight: 600; overflow-wrap: anywhere; }
    .badge { align-self: flex-start; font-size: 11px; color: var(--accent-color); }
    .meta { font-size: 12px; color: var(--text-secondary); }
    .name-input { font-size: 14px; padding: 4px 6px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .btn { padding: 4px 10px; font-size: 12px; color: var(--text-primary); background: var(--bg-surface-container-highest, var(--bg-hover)); border-radius: 4px; }
    .btn:hover { filter: brightness(1.15); }
    .btn.primary { background: var(--accent-color); color: var(--text-on-primary); font-weight: 700; padding: 6px 14px; font-size: 13px; }
    .btn.danger { background: #b3261e; color: #fff; }
    .empty { padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px; }
    .template-select { font-size: 13px; padding: 5px 8px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; }
    .tpl-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 20px 4px; border-top: 1px solid var(--border-color); margin-top: 8px; }
    h3 { margin: 0 auto 0 0; font-size: 13px; font-weight: 600; color: var(--text-primary); }
    .tpl-list { flex-shrink: 0; max-height: 34vh; }
    .btn.small { padding: 4px 12px; font-size: 12px; }
    .small-empty { padding: 10px 8px; text-align: left; }
    .msg { padding-top: 6px; }
    .footer-label { font-size: 12px; color: var(--text-secondary); }
    .import-wrap { position: relative; margin-left: 4px; }
    .import-wrap .btn { display: inline-flex; align-items: center; gap: 6px; }
    .import-wrap .material-symbols-outlined { font-size: 16px; }
    .import-menu { position: absolute; bottom: calc(100% + 6px); right: 0; width: 280px; padding: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); z-index: 2; }
    .menu-item { display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; padding: 0 10px; border: 0; border-radius: 4px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .menu-item:hover, .menu-item:focus-visible { background: var(--bg-surface-container-high); outline: none; }
    .menu-note { margin: 6px 10px 4px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); }
    .footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 20px 16px; }
  `],
})
export class ProjectsDialogComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();

  private orchestrator = inject(OrchestratorService);
  private library = inject(ProjectLibraryService);
  private projectState = inject(ProjectState);

  protected readonly ui = inject(UiState);
  private userTemplateStore = inject(UserTemplateService);
  private terminal = inject(TerminalState);
  private projectIo = inject(ProjectIoService);
  /** Menú «Importar proyecto…» (P-29): desde una carpeta o desde un .zip. */
  protected readonly importMenu = signal(false);
  protected templates = PROJECT_TEMPLATES;
  protected userTemplates = this.userTemplateStore.items;
  protected renamingTplId = signal<string | null>(null);
  protected confirmDeleteTplId = signal<string | null>(null);
  protected tplMessage = signal<string | null>(null);
  protected size = formatBytes;
  protected projects = signal<ProjectSummary[]>([]);
  protected loading = signal(false);
  protected renamingId = signal<string | null>(null);
  protected confirmDeleteId = signal<string | null>(null);
  protected currentId = this.projectState.projectId;
  protected currentName = this.projectState.projectName;

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.restoreFocus = rememberFocus();
          void this.refresh();
          void this.userTemplateStore.refresh();
          this.tplMessage.set(null);
          // Solo se despliega si se pidió; no se cierra aquí, para no pisar un clic hecho nada más abrirse el diálogo.
          if (this.ui.projectsImportMenu()) this.importMenu.set(true);
          this.ui.projectsImportMenu.set(false);
          setTimeout(() => this.dialog()?.nativeElement.focus());
        });
      } else {
        untracked(() => this.importMenu.set(false));
        if (this.restoreFocus) {
          this.restoreFocus();
          this.restoreFocus = null;
        }
      }
    });
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }

  private async refresh(): Promise<void> {
    this.loading.set(true);
    await this.orchestrator.saveToLibrary(); // el proyecto abierto aparece con su estado actual
    this.projects.set(await this.library.list());
    this.loading.set(false);
  }

  protected async open(p: ProjectSummary): Promise<void> {
    if (await this.orchestrator.openProject(p.id)) this.closed.emit();
  }

  protected async create(templateId: string): Promise<void> {
    await this.orchestrator.createProject(undefined, templateId || undefined);
    this.closed.emit();
  }

  protected async useTemplate(t: UserTemplateMeta): Promise<void> {
    if (await this.orchestrator.createFromUserTemplate(t.id)) this.closed.emit();
  }

  protected async renameTemplate(t: UserTemplateMeta, value: string): Promise<void> {
    if (this.renamingTplId() !== t.id) return;
    this.renamingTplId.set(null);
    const name = cleanTemplateName(value);
    if (name && name !== t.name) await this.userTemplateStore.rename(t.id, name);
  }

  protected async updateTemplate(t: UserTemplateMeta): Promise<void> {
    const r = await this.orchestrator.saveAsTemplate(t.name, t.description, { data: true, assets: true, locales: true }, t.id);
    this.tplMessage.set(r.ok ? `«${t.name}» actualizada con el proyecto abierto.` : `No se pudo actualizar «${t.name}».`);
  }

  protected async exportTemplate(t: UserTemplateMeta): Promise<void> {
    const content = await this.userTemplateStore.load(t.id);
    if (!content) { this.tplMessage.set('La plantilla ya no existe.'); return; }
    const url = URL.createObjectURL(new Blob([packTemplate(t, content) as BlobPart], { type: 'application/zip' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${t.name.replace(/[\\/:*?"<>|]+/g, '-')}-plantilla.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.terminal.addEntry('success', 'Plantillas', `Plantilla «${t.name}» exportada como ${a.download}.`);
  }

  protected async removeTemplate(t: UserTemplateMeta): Promise<void> {
    this.confirmDeleteTplId.set(null);
    await this.userTemplateStore.remove(t.id);
    this.terminal.addEntry('info', 'Plantillas', `Plantilla «${t.name}» borrada.`);
  }

  /**
   * Crea un proyecto nuevo con la carpeta o el .zip elegidos; el abierto se queda guardado en la lista. Las entradas son
   * fijas (no se crean al vuelo) y el diálogo se cierra cuando ya se ha elegido algo: si se cancela el selector, sigue abierto.
   */
  protected async onProjectPicked(input: HTMLInputElement, kind: 'folder' | 'zip'): Promise<void> {
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;
    this.closed.emit();
    if (kind === 'zip') await this.projectIo.importFromZipFile(files[0]);
    else await this.projectIo.importProjectFromFolder(files);
  }

  protected async importTemplate(input: HTMLInputElement): Promise<void> {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    const r = unpackTemplate(new Uint8Array(await f.arrayBuffer()), f.name.replace(/(-plantilla)?\.zip$/i, '') || 'Plantilla');
    if (!r.ok) { this.tplMessage.set(r.reason); return; }
    const saved = await this.userTemplateStore.save(r.name, r.description, r.content);
    this.tplMessage.set(saved.ok ? `Plantilla «${r.name}» importada.` : saved.reason === 'full' ? `Ya tienes ${saved.max} plantillas: borra alguna.` : saved.reason === 'too-big' ? 'La plantilla supera los 25 MB.' : 'No se pudo guardar en el navegador.');
    if (saved.ok) this.terminal.addEntry('success', 'Plantillas', `Plantilla «${r.name}» importada (${saved.meta.fileCount} archivos).`);
  }

  protected async rename(p: ProjectSummary, value: string): Promise<void> {
    if (this.renamingId() !== p.id) return;
    this.renamingId.set(null);
    if (value.trim() && value.trim() !== p.name) {
      await this.orchestrator.renameProject(p.id, value);
      await this.refresh();
    }
  }

  protected async duplicate(p: ProjectSummary): Promise<void> {
    await this.orchestrator.duplicateProject(p.id);
    await this.refresh();
  }

  protected async remove(p: ProjectSummary): Promise<void> {
    this.confirmDeleteId.set(null);
    await this.orchestrator.deleteProject(p.id);
    await this.refresh();
  }
}
