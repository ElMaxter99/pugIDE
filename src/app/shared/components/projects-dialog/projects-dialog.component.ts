import { Component, ChangeDetectionStrategy, ElementRef, inject, input, output, signal, effect, untracked, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectLibraryService, ProjectSummary } from '../../../core/services/project-library.service';
import { ProjectState } from '../../../core/state/project.state';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';

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
            <h3>Mis proyectos</h3>
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
          <div class="footer">
            <select class="template-select" aria-label="Plantilla del proyecto nuevo" #tpl>
              <option value="">Proyecto vacío</option>
              @for (t of templates; track t.id) {
                <option [value]="t.id" [title]="t.description">{{ t.name }}</option>
              }
            </select>
            <button class="btn primary" (click)="create(tpl.value)">Nuevo proyecto</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(640px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
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
    .footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 20px 16px; }
  `],
})
export class ProjectsDialogComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();

  private orchestrator = inject(OrchestratorService);
  private library = inject(ProjectLibraryService);
  private projectState = inject(ProjectState);

  protected templates = PROJECT_TEMPLATES;
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
          setTimeout(() => this.dialog()?.nativeElement.focus());
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
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
