import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { ViewportState } from '../../../core/state/viewport.state';
import { Router } from '@angular/router';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { TerminalState } from '../../../core/state/terminal.state';
import { PreferencesState } from '../../../core/services/preferences.state';
import { UiState } from '../../../core/state/ui.state';
import { ProjectState } from '../../../core/state/project.state';
import { ProjectsDialogComponent } from '../projects-dialog/projects-dialog.component';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { shortPath } from '../../../core/utils/workspace.util';
import { DropdownMenuComponent, MenuItem } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ProjectsDialogComponent, DropdownMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar" [class.compact]="viewport.compact()">
      <div class="topbar-left">
        <h1 class="logo"><a href="/" title="Volver al inicio" aria-label="PugIDE" (click)="goHome($event)">{{ viewport.compact() ? 'P' : 'PugIDE' }}</a></h1>
        @if (workspace.available) {
          @if (workspace.active(); as ws) {
            <span class="ws-dot" [style.background]="ws.color" aria-hidden="true"></span>
            <app-dropdown-menu [label]="ws.name" ariaLabel="Espacio de trabajo" testId="menu-espacio" [items]="workspaceItems()" (chosen)="onWorkspaceAction($event)" />
            @if (!viewport.compact()) {
              <span class="ws-path" [title]="ws.path">{{ shortPath(ws.path) }}</span>
              <span class="ws-status" [class.err]="workspace.status() === 'error'" role="status" data-testid="workspace-status">{{ workspace.statusText() }}</span>
            }
          } @else {
            <button type="button" class="ws-open" data-testid="workspaces-open" (click)="ui.workspacesOpen.set(true)">Espacios de trabajo…</button>
          }
        }
      </div>
      <div class="topbar-right">
        <div class="topbar-actions">
          <app-dropdown-menu label="Proyecto" icon="folder_open" ariaLabel="Proyecto" [iconOnly]="viewport.compact()" [caret]="!viewport.compact()" testId="menu-proyecto" [items]="projectItems()" (chosen)="onProjectAction($event)" />
          <app-dropdown-menu label="Exportar" icon="download" ariaLabel="Exportar" [iconOnly]="viewport.compact()" [caret]="!viewport.compact()" testId="menu-exportar" align="right" [items]="exportItems()" (chosen)="onExportAction($event)" />
          <button type="button" class="search-field" [class.compact]="viewport.compact()" data-testid="open-palette" data-tour="search" title="Abrir la paleta de comandos (Ctrl+K)" (click)="ui.paletteOpen.set(true)">
            <span aria-hidden="true" class="material-symbols-outlined">search</span>
            @if (!viewport.compact()) {
              <span class="search-text">Buscar comandos y archivos…</span>
              <kbd>Ctrl K</kbd>
            } @else {
              <span class="sr-only">Buscar comandos y archivos</span>
            }
          </button>
          <app-dropdown-menu label="Tema" icon="contrast" ariaLabel="Cambiar tema claro u oscuro" [iconOnly]="true" testId="menu-tema" align="right" [items]="themeItems()" (chosen)="onThemeChoice($event)" />
          <button type="button" class="save-btn" (click)="onSave()">Guardar</button>
        </div>
      </div>
    </header>
    <app-projects-dialog [isOpen]="ui.projectsOpen()" (closed)="ui.projectsOpen.set(false)" />
  `,
  styles: [`
    .topbar {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
      padding: 0 24px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      z-index: 50;
      flex-shrink: 0;
    }

    /* Ventana estrecha (P-19): barra más baja, logo reducido y huecos más pequeños, para que «Guardar» y el tema sigan a la vista. */
    .topbar.compact { height: 56px; padding: 0 12px; }
    .topbar.compact .logo { font-size: 24px; }
    .topbar.compact .topbar-left, .topbar.compact .topbar-right, .topbar.compact .topbar-actions { gap: 6px; }

    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--accent-color);
      line-height: 40px;
      margin: 0;
    }

    .logo a {
      color: inherit;
      text-decoration: none;
      cursor: pointer;
    }

    .logo a:focus-visible {
      outline: 2px solid var(--accent-color);
      outline-offset: 4px;
      border-radius: 4px;
    }

    .ws-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .ws-path { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
    .ws-status { font-size: 12px; color: var(--success-color); white-space: nowrap; }
    .ws-status.err { color: var(--error-color); }
    /* En ventanas medianas la ruta y el «Guardado en disco» ceden el sitio a los menús; un fallo al guardar se ve siempre. */
    @media (max-width: 1640px) { .ws-path { display: none; } }
    @media (max-width: 1420px) { .ws-status:not(.err) { display: none; } }
    .ws-open { height: 32px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 13px; color: var(--text-primary); }
    .ws-open:hover { background: var(--bg-hover); }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .icon-btn:hover {
      background: var(--bg-surface-container-highest);
      color: var(--text-primary);
    }

    .icon-btn:active {
      transform: scale(0.95);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--border-color);
      margin: 0 4px;
    }

    .search-field.compact { min-width: 0; width: 36px; padding: 0; justify-content: center; }

    .search-field {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 280px;
      height: 36px;
      padding: 0 8px 0 12px;
      font-size: 13px;
      color: var(--text-secondary);
      background: var(--bg-surface-container-low, transparent);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      cursor: pointer;
    }

    .search-field:hover { color: var(--text-primary); background: var(--bg-surface-container-highest); }
    .search-text { flex: 1; text-align: left; }
    .search-field kbd { font-family: var(--font-mono); font-size: 11px; padding: 1px 6px; color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; }






    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    .save-btn {
      padding: 0 16px;
      height: 36px;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-on-primary);
      background: var(--accent-color);
      border-radius: var(--radius);
      box-shadow: 0 4px 12px rgba(221, 183, 255, 0.3);
      transition: all 0.15s;
    }

    .save-btn:hover {
      filter: brightness(1.1);
    }

    .save-btn:active {
      transform: scale(0.95);
    }
  `],
})
export class TopbarComponent {
  protected editorState = inject(EditorState);
  protected preferences = inject(PreferencesState);
  private orchestrator = inject(OrchestratorService);
  private router = inject(Router);
  protected projectIo = inject(ProjectIoService);
  private terminal = inject(TerminalState);
  protected projectState = inject(ProjectState);
  protected ui = inject(UiState);

  goHome(event?: Event): void {
    event?.preventDefault();
    this.router.navigate(['/']);
  }

  onSave(): void {
    this.orchestrator.saveFile();
  }

  protected readonly themeItems = computed<MenuItem[]>(() => {
    const t = this.preferences.theme();
    return [
      { id: 'auto', label: 'Automático', hint: 'Sigue el tema de tu sistema', checked: t === 'auto', radio: true },
      { id: 'dark', label: 'Oscuro', checked: t === 'dark', radio: true },
      { id: 'light', label: 'Claro', checked: t === 'light', radio: true },
    ];
  });

  onThemeChoice(id: string): void {
    if (id === 'auto' || id === 'dark' || id === 'light') this.preferences.update({ theme: id });
  }

  /** «Copiar enlace para compartir»: abre «Compartir proyecto» (P-15) con sus opciones. */
  onShare(): void {
    this.ui.shareCreateOpen.set(true);
  }

  onExportHtml(): void {
    this.projectIo.exportHtml();
  }

  protected viewport = inject(ViewportState);

  protected projectItems = computed<MenuItem[]>(() => [
    { id: 'projects', icon: 'folder_open', label: 'Mis proyectos…', hint: this.projectState.projectName() },
    { id: 'new-template', icon: 'add', label: 'Nuevo proyecto desde plantilla…' },
    { id: 'import-project', icon: 'drive_folder_upload', label: 'Importar proyecto (carpeta o .zip)…' },
    { id: 'save-template', icon: 'bookmark_add', label: 'Guardar como plantilla…' },
    { id: 'snapshots', icon: 'photo_camera', label: 'Instantáneas del proyecto…' },
    { id: 'history', icon: 'history', label: 'Historial del archivo…' },
    { separator: true },
    { id: 'import', icon: 'upload', label: 'Importar archivos…' },
    { id: 'locale', icon: 'translate', label: 'Añadir idioma…' },
    { separator: true },
    { id: 'search', icon: 'search', label: 'Buscar en el proyecto', keys: 'Ctrl+Shift+F' },
    { id: 'shortcuts', icon: 'keyboard', label: 'Atajos de teclado' },
  ]);

  protected readonly workspace = inject(WorkspaceService);
  protected readonly shortPath = shortPath;
  protected workspaceItems = computed<MenuItem[]>(() => [
    { id: 'switch', icon: 'swap_horiz', label: 'Cambiar de espacio…' },
    { id: 'reveal', icon: 'folder_open', label: 'Mostrar la carpeta' },
    { separator: true },
    { id: 'close', icon: 'close', label: 'Cerrar el espacio' },
  ]);

  protected onWorkspaceAction(id: string): void {
    if (id === 'switch') this.ui.workspacesOpen.set(true);
    else if (id === 'reveal') this.workspace.reveal();
    else if (id === 'close') void this.workspace.close();
  }

  protected exportItems = computed<MenuItem[]>(() => [
    { id: 'share', icon: 'link', label: 'Copiar enlace para compartir' },
    { id: 'html', icon: 'code', label: 'HTML autocontenido' },
    { id: 'email', icon: 'mail', label: 'HTML para correo…' },
    { id: 'all', icon: 'library_books', label: 'Todas las plantillas (.zip)…' },
    { id: 'png', icon: 'photo_camera', label: 'Captura PNG del preview' },
    { id: 'print', icon: 'picture_as_pdf', label: 'Imprimir o guardar como PDF' },
    { separator: true },
    { id: 'project', icon: 'download', label: 'Proyecto en carpeta o .zip' },
  ]);

  protected onProjectAction(id: string): void {
    switch (id) {
      case 'projects':
      case 'new-template': this.ui.projectsOpen.set(true); break;
      case 'snapshots': this.ui.snapshotsOpen.set(true); break;
      case 'save-template': this.ui.saveTemplateOpen.set(true); break;
      case 'history': this.ui.historyOpen.set(true); break;
      case 'import-project': this.ui.projectsImportMenu.set(true); this.ui.projectsOpen.set(true); break;
      case 'import': this.ui.importFiles.set({ target: '/' }); break;
      case 'locale': this.ui.addLocaleOpen.set(true); break;
      case 'search': this.ui.requestEditorCommand('pug.searchInProject'); break;
      case 'shortcuts': this.ui.shortcutsOpen.set(true); break;
    }
  }

  protected onExportAction(id: string): void {
    switch (id) {
      case 'share': this.onShare(); break;
      case 'html': this.onExportHtml(); break;
      case 'email': this.ui.emailExportOpen.set(true); break;
      case 'all': this.ui.exportAllOpen.set(true); break;
      case 'png': void this.projectIo.exportPng(); break;
      case 'print': this.ui.requestPanel('print'); break;
      case 'project': void this.projectIo.exportProject(); break;
    }
  }
}
