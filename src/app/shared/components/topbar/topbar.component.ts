import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '../../../core/state/editor.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { TerminalState } from '../../../core/state/terminal.state';
import { PreferencesState } from '../../../core/services/preferences.state';
import { UiState } from '../../../core/state/ui.state';
import { ProjectState } from '../../../core/state/project.state';
import { ProjectsDialogComponent } from '../projects-dialog/projects-dialog.component';
import { DropdownMenuComponent, MenuItem } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [ProjectsDialogComponent, DropdownMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <h1 class="logo"><a href="/" title="Volver al inicio" (click)="goHome($event)">PugIDE</a></h1>
      </div>
      <div class="topbar-right">
        <div class="topbar-actions">
          <app-dropdown-menu label="Proyecto" icon="folder_open" ariaLabel="Proyecto" testId="menu-proyecto" [items]="projectItems()" (chosen)="onProjectAction($event)" />
          <app-dropdown-menu label="Exportar" icon="download" ariaLabel="Exportar" testId="menu-exportar" align="right" [items]="exportItems()" (chosen)="onExportAction($event)" />
          <button type="button" class="search-field" data-testid="open-palette" data-tour="search" title="Abrir la paleta de comandos (Ctrl+K)" (click)="ui.paletteOpen.set(true)">
            <span aria-hidden="true" class="material-symbols-outlined">search</span>
            <span class="search-text">Buscar comandos y archivos…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <button type="button" class="icon-btn" title="Cambiar tema claro u oscuro" aria-label="Cambiar tema claro u oscuro" (click)="onToggleTheme()">
            <span aria-hidden="true" class="material-symbols-outlined">contrast</span>
          </button>
          <button type="button" class="save-btn" (click)="onSave()">Guardar</button>
        </div>
      </div>
      @if (shareNotice(); as n) {
        <div class="share-notice" [class.warn]="n.warn" role="status">
          <span>{{ n.text }}
            @if (n.offerZip) {
              <button class="notice-link" (click)="projectIo.downloadZip()">Descargar .zip completo</button>
            }
          </span>
          <button class="notice-close" title="Cerrar aviso" (click)="shareNotice.set(null)">&times;</button>
        </div>
      }
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






    .share-notice {
      position: absolute;
      top: 100%;
      right: 24px;
      max-width: 420px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--text-primary);
      background: var(--bg-surface-container-highest, var(--bg-surface));
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 60;
    }

    .share-notice.warn {
      border-color: #e0a030;
    }

    .notice-link {
      display: block;
      margin-top: 6px;
      color: var(--accent-color);
      font-size: 13px;
      text-decoration: underline;
    }

    .notice-close {
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1;
    }

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
  protected shareNotice = signal<{ text: string; warn: boolean; offerZip: boolean } | null>(null);

  goHome(event?: Event): void {
    event?.preventDefault();
    this.router.navigate(['/']);
  }

  onSave(): void {
    this.orchestrator.saveFile();
  }

  onToggleTheme(): void {
    this.preferences.toggleTheme();
  }

  async onShare(): Promise<void> {
    const { url, length, tooLong, included, omitted } = this.projectIo.buildShareLink(location.origin + '/ide');
    let copied = true;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      copied = false;
    }
    let text = copied ? 'Enlace copiado al portapapeles.' : 'No se pudo copiar automáticamente: copia el enlace de la barra de direcciones.';
    if (!copied) history.replaceState(null, '', url);
    if (included.length) text += ` Incluye ${included.length} asset(s) pequeño(s).`;
    if (omitted.length) text += ` No caben en el enlace: ${omitted.join(', ')}.`;
    if (tooLong) {
      text += ` Aviso: el enlace es muy largo (${length} caracteres) y puede no funcionar en algunos navegadores o aplicaciones de mensajería. Considera exportar un .zip.`;
    }
    this.shareNotice.set({ text, warn: tooLong || !copied || omitted.length > 0, offerZip: tooLong || omitted.length > 0 });
    this.terminal.addEntry(tooLong ? 'warning' : 'success', 'Compartir', text);
  }

  onExportHtml(): void {
    this.projectIo.exportHtml();
  }

  protected projectItems = computed<MenuItem[]>(() => [
    { id: 'projects', icon: 'folder_open', label: 'Mis proyectos…', hint: this.projectState.projectName() },
    { id: 'new-template', icon: 'add', label: 'Nuevo proyecto desde plantilla…' },
    { id: 'snapshots', icon: 'photo_camera', label: 'Instantáneas del proyecto…' },
    { id: 'history', icon: 'history', label: 'Historial del archivo…' },
    { separator: true },
    { id: 'import', icon: 'upload', label: 'Importar carpeta o .zip…' },
    { id: 'assets', icon: 'add_photo_alternate', label: 'Subir imágenes, fuentes o estilos…' },
    { id: 'locale', icon: 'translate', label: 'Añadir idioma…' },
    { separator: true },
    { id: 'search', icon: 'search', label: 'Buscar en el proyecto', keys: 'Ctrl+Shift+F' },
    { id: 'shortcuts', icon: 'keyboard', label: 'Atajos de teclado' },
  ]);

  protected exportItems = computed<MenuItem[]>(() => [
    { id: 'share', icon: 'link', label: 'Copiar enlace para compartir' },
    { id: 'html', icon: 'code', label: 'HTML autocontenido' },
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
      case 'history': this.ui.historyOpen.set(true); break;
      case 'import': this.ui.requestPanel('import-project'); break;
      case 'assets': this.ui.requestPanel('upload-assets'); break;
      case 'locale': this.ui.addLocaleOpen.set(true); break;
      case 'search': this.ui.requestEditorCommand('pug.searchInProject'); break;
      case 'shortcuts': this.ui.shortcutsOpen.set(true); break;
    }
  }

  protected onExportAction(id: string): void {
    switch (id) {
      case 'share': void this.onShare(); break;
      case 'html': this.onExportHtml(); break;
      case 'png': void this.projectIo.exportPng(); break;
      case 'print': this.ui.requestPanel('print'); break;
      case 'project': void this.projectIo.exportProject(); break;
    }
  }
}
