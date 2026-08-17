import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileNode } from '../../../core/models/file-node.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { getFileType } from '../../../core/models/tab.model';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { DialogComponent, DialogConfig } from '../dialogs/dialog.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { ContextMenuAction, PugMixin } from '../../../core/models/index';
import { getFileIcon } from '../../../core/utils/file-icon.util';
import { APP_VERSION } from '../../../core/models/version.token';
import { ParserState } from '../../../core/state/parser.state';
import { FindInFilesComponent } from '../find-in-files/find-in-files.component';

type PendingAction =
  | { type: 'newFile'; dir: string }
  | { type: 'newFolder'; dir: string }
  | { type: 'rename'; path: string }
  | { type: 'delete'; path: string }
  | { type: 'importProject' }
  | { type: 'newSession' };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, DialogComponent, ContextMenuComponent, FindInFilesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <app-find-in-files #findPanel />
      <app-dialog
        [config]="dialogConfig()"
        [isOpen]="dialogOpen()"
        (confirmed)="onDialogConfirm($event)"
        (cancelled)="dialogOpen.set(false)" />
      <app-context-menu
        [items]="contextMenuItems()"
        [isOpen]="contextMenuOpen()"
        [positionX]="contextMenuX()"
        [positionY]="contextMenuY()"
        (actionSelected)="onContextAction($event)" />
      <div class="sidebar-inner">
        <div class="workspace-header">
          <div class="workspace-label-row">
            <span class="workspace-label">Proyecto</span>
            <div class="workspace-actions">
              <button class="add-btn" (click)="onImportClick()" title="Importar proyecto (carpeta o .zip)">
                <span class="material-symbols-outlined" style="font-size: 16px;">upload</span>
              </button>
              <button class="add-btn" (click)="onExportClick()" title="Exportar proyecto (carpeta o .zip)">
                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
              </button>
              <button class="add-btn" (click)="findPanel.open()" title="Buscar en archivos (Ctrl+Shift+F)">
                <span class="material-symbols-outlined" style="font-size: 16px;">search</span>
              </button>
              <button class="add-btn" (click)="showNewFolderDialog()" title="Nueva carpeta">
                <span class="material-symbols-outlined" style="font-size: 16px;">create_new_folder</span>
              </button>
              <button class="add-btn" (click)="showNewFileDialog()" title="Nuevo archivo">
                <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
              </button>
            </div>
          </div>
          <input
            #zipInput
            type="file"
            accept=".zip"
            style="display: none"
            (change)="onZipFileSelected($event)" />
          <div class="workspace-info">
            <div class="workspace-avatar">P</div>
            <div class="workspace-text">
              <p class="workspace-name">{{ projectState.projectName() }}</p>
              <p class="workspace-version">v{{ version }}</p>
            </div>
          </div>
        </div>

        <div class="file-tree">
          @for (node of projectState.fileTree(); track node.path) {
            <ng-container *ngTemplateOutlet="fileNode; context: { $implicit: node, level: 0 }"></ng-container>
          }
        </div>

        <div class="structure-section">
          <div class="structure-header" (click)="structureExpanded.set(!structureExpanded())">
            <span class="material-symbols-outlined expand-icon" [class.rotated]="structureExpanded()">
              keyboard_arrow_down
            </span>
            <span class="workspace-label">ESTRUCTURA</span>
          </div>
          @if (structureExpanded()) {
            <div class="structure-body">
              @if (parserState.extendsPath(); as ext) {
                <div class="structure-row" (click)="openRelative(ext)" title="extends {{ ext }}">
                  <span class="material-symbols-outlined structure-icon">call_merge</span>
                  <span class="structure-text">extends {{ ext }}</span>
                </div>
              }
              @for (inc of parserState.includes(); track inc) {
                <div class="structure-row" (click)="openRelative(inc)" title="include {{ inc }}">
                  <span class="material-symbols-outlined structure-icon">call_split</span>
                  <span class="structure-text">include {{ inc }}</span>
                </div>
              }
              @for (mixin of parserState.mixins(); track mixin.name + mixin.line) {
                <div class="structure-row" (click)="goToMixin(mixin)" title="mixin {{ mixin.name }}">
                  <span class="material-symbols-outlined structure-icon">functions</span>
                  <span class="structure-text">{{ mixin.name }}({{ mixin.args.join(', ') }})</span>
                </div>
              }
              @if (!parserState.extendsPath() && parserState.includes().length === 0 && parserState.mixins().length === 0) {
                <div class="structure-empty">Sin mixins, includes ni extends</div>
              }
            </div>
          }
        </div>

        <div class="sidebar-footer">
          <div class="footer-item" (click)="showNewSessionDialog()">
            <span class="material-symbols-outlined">restart_alt</span>
            <span class="footer-label">NUEVA SESIÓN</span>
          </div>
        </div>
      </div>
    </aside>

    <ng-template #fileNode let-node let-level="level">
      @if (node.type === 'directory') {
        <div
          class="file-row directory-row"
          [style.padding-left.px]="16 + level * 16"
          (click)="onNodeClick(node)"
          (contextmenu)="onNodeContextMenu($event, node)">
          <span class="material-symbols-outlined expand-icon" [class.rotated]="isExpanded(node.path)">
            keyboard_arrow_down
          </span>
          <span class="material-symbols-outlined folder-icon">folder</span>
          <span class="file-name">{{ node.name }}</span>
        </div>
        @if (isExpanded(node.path) && node.children) {
          @for (child of node.children; track child.path) {
            <ng-container *ngTemplateOutlet="fileNode; context: { $implicit: child, level: level + 1 }"></ng-container>
          }
        }
      } @else {
        <div
          class="file-row file-item"
          [style.padding-left.px]="16 + level * 16"
          [class.active]="isActive(node.path)"
          (click)="onNodeClick(node)"
          (contextmenu)="onNodeContextMenu($event, node)">
          <span class="material-symbols-outlined file-icon">{{ fileIcon(node) }}</span>
          <span class="file-name">{{ node.name }}</span>
          @if (projectState.isAutoCreated(node.path)) {
            <span class="auto-created-dot" title="Creado automáticamente porque la plantilla lo referencia"></span>
          }
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      height: 100%;
    }

    .sidebar {
      width: 240px;
      min-width: 240px;
      background: var(--bg-surface-container-low);
      border-right: 1px solid var(--border-color);
      height: 100%;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 16px 0;
      gap: 8px;
    }

    .workspace-header {
      padding: 0 16px;
      margin-bottom: 16px;
    }

    .workspace-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .workspace-label {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius);
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .add-btn:hover {
      background: var(--bg-surface-variant);
    }

    .workspace-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .workspace-avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius);
      background: var(--accent-container);
      color: var(--text-on-primary-container);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .workspace-name {
      font-size: 14px;
      font-weight: 700;
      line-height: 20px;
      color: var(--text-primary);
    }

    .workspace-version {
      font-size: 11px;
      line-height: 16px;
      color: var(--text-secondary);
    }

    .file-tree {
      flex: 1;
      overflow-y: auto;
      margin-top: 16px;
    }

    .file-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 16px;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-secondary);
      transition: all 0.1s;
    }

    .file-row:hover {
      color: var(--text-primary);
    }

    .file-row.active {
      background: rgba(221, 183, 255, 0.08);
      color: var(--accent-color);
      border-right: 2px solid var(--accent-color);
    }

    .expand-icon {
      font-size: 16px;
      transition: transform 0.15s;
      flex-shrink: 0;
      transform: rotate(-90deg);
    }

    .expand-icon.rotated {
      transform: rotate(0deg);
    }

    .folder-icon {
      font-size: 16px;
      color: var(--tertiary-color);
      flex-shrink: 0;
    }

    .file-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .file-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .auto-created-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-color);
      box-shadow: 0 0 4px var(--accent-color);
      flex-shrink: 0;
      margin-right: 4px;
    }

    .structure-section {
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
      flex-shrink: 0;
    }

    .structure-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 16px;
      cursor: pointer;
    }

    .structure-body {
      display: flex;
      flex-direction: column;
      max-height: 160px;
      overflow-y: auto;
      padding-bottom: 4px;
    }

    .structure-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 16px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .structure-row:hover {
      color: var(--text-primary);
      background: var(--bg-surface-variant);
    }

    .structure-icon {
      font-size: 14px;
      flex-shrink: 0;
      color: var(--text-tertiary);
    }

    .structure-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .structure-empty {
      padding: 4px 16px;
      font-size: 11px;
      color: var(--text-tertiary);
      font-style: italic;
    }

    .sidebar-footer {
      margin-top: auto;
      border-top: 1px solid var(--border-color);
      padding-top: 8px;
    }

    .footer-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .footer-item:hover {
      background: var(--bg-surface-variant);
    }

    .footer-item .material-symbols-outlined {
      font-size: 20px;
    }

    .footer-label {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      font-weight: 500;
    }
  `],
})
export class SidebarComponent {
  protected projectState = inject(ProjectState);
  protected editorState = inject(EditorState);
  protected parserState = inject(ParserState);
  private orchestrator = inject(OrchestratorService);
  protected projectIo = inject(ProjectIoService);
  protected version = inject(APP_VERSION);

  protected structureExpanded = signal(false);

  @ViewChild('zipInput') private zipInput!: ElementRef<HTMLInputElement>;

  protected dialogOpen = signal(false);
  protected dialogConfig = signal<DialogConfig>({
    title: 'Nuevo archivo',
    message: 'Introduce el nombre del archivo (ej. components/card.pug)',
    confirmText: 'Crear',
    cancelText: 'Cancelar',
    showInput: true,
    inputLabel: 'Nombre del archivo',
    inputValue: '',
  });
  private pendingAction: PendingAction | null = null;

  protected contextMenuOpen = signal(false);
  protected contextMenuX = signal(0);
  protected contextMenuY = signal(0);
  protected contextMenuItems = signal<ContextMenuAction[]>([]);
  private contextMenuTarget: FileNode | null = null;

  fileIcon(node: FileNode): string {
    return getFileIcon(getFileType(node.name));
  }

  onNodeClick(node: FileNode): void {
    if (node.type === 'directory') {
      this.projectState.toggleDir(node.path);
    } else {
      this.openFile(node);
    }
  }

  showNewFileDialog(dir?: string): void {
    const baseDir = dir ?? (() => {
      const activePath = this.editorState.activeTab()?.path ?? '/main.pug';
      return activePath.substring(0, activePath.lastIndexOf('/') + 1);
    })();
    this.pendingAction = { type: 'newFile', dir: baseDir };
    this.dialogConfig.set({
      title: 'Nuevo archivo',
      message: 'Introduce el nombre del archivo (ej. components/card.pug)',
      confirmText: 'Crear',
      cancelText: 'Cancelar',
      showInput: true,
      inputLabel: 'Nombre del archivo',
      inputValue: baseDir + 'new-file.pug',
    });
    this.dialogOpen.set(true);
  }

  showNewFolderDialog(dir?: string): void {
    const baseDir = dir ?? (() => {
      const activePath = this.editorState.activeTab()?.path ?? '/main.pug';
      return activePath.substring(0, activePath.lastIndexOf('/') + 1);
    })();
    this.pendingAction = { type: 'newFolder', dir: baseDir };
    this.dialogConfig.set({
      title: 'Nueva carpeta',
      message: 'Introduce el nombre de la carpeta',
      confirmText: 'Crear',
      cancelText: 'Cancelar',
      showInput: true,
      inputLabel: 'Nombre de la carpeta',
      inputValue: '',
    });
    this.dialogOpen.set(true);
  }

  private showRenameDialog(path: string): void {
    this.pendingAction = { type: 'rename', path };
    const currentName = path.split('/').pop() ?? path;
    this.dialogConfig.set({
      title: 'Renombrar',
      message: `Introduce un nuevo nombre para ${currentName}`,
      confirmText: 'Renombrar',
      cancelText: 'Cancelar',
      showInput: true,
      inputLabel: 'Nuevo nombre',
      inputValue: currentName,
    });
    this.dialogOpen.set(true);
  }

  onExportClick(): void {
    this.projectIo.exportProject();
  }

  onImportClick(): void {
    this.pendingAction = { type: 'importProject' };
    this.dialogConfig.set({
      title: 'Importar proyecto',
      message: this.projectIo.supportsFileSystemAccess
        ? 'Elige una carpeta para importar. Esto reemplaza todos los archivos abiertos actualmente en el editor.'
        : 'Elige un archivo .zip para importar. Esto reemplaza todos los archivos abiertos actualmente en el editor.',
      confirmText: 'Continuar',
      cancelText: 'Cancelar',
      showInput: false,
      type: 'warning',
    });
    this.dialogOpen.set(true);
  }

  async onZipFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    await this.projectIo.importFromZipFile(file);
  }

  showNewSessionDialog(): void {
    this.pendingAction = { type: 'newSession' };
    this.dialogConfig.set({
      title: 'Nueva sesión',
      message: 'Esto descarta el proyecto actual y empieza uno en blanco. Los cambios sin exportar se perderán.',
      confirmText: 'Empezar de nuevo',
      cancelText: 'Cancelar',
      showInput: false,
      type: 'warning',
    });
    this.dialogOpen.set(true);
  }

  private showDeleteDialog(path: string): void {
    this.pendingAction = { type: 'delete', path };
    this.dialogConfig.set({
      title: 'Eliminar archivo',
      message: `¿Seguro que quieres eliminar ${path}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      showInput: false,
      type: 'warning',
    });
    this.dialogOpen.set(true);
  }

  onDialogConfirm(value: string): void {
    this.dialogOpen.set(false);
    const action = this.pendingAction;
    this.pendingAction = null;
    if (!action) return;

    if (action.type === 'newFile') {
      const name = value.trim();
      if (!name) return;
      const path = name.startsWith('/') ? name : '/' + name;
      const filename = path.split('/').pop() ?? name;
      if (this.editorState.files().has(path)) {
        this.editorState.openFile(path, filename, getFileType(filename), '');
        return;
      }
      this.orchestrator.addFile(path, filename);
    } else if (action.type === 'newFolder') {
      const name = value.trim().replace(/^\/+|\/+$/g, '');
      if (!name) return;
      const dir = action.dir.endsWith('/') ? action.dir : action.dir + '/';
      const placeholderPath = `${dir}${name}/.gitkeep`;
      if (this.editorState.files().has(placeholderPath)) return;
      this.editorState.files.update((f) => { f.set(placeholderPath, ''); return f; });
      this.projectState.setProject(this.projectState.projectName(), this.editorState.files());
    } else if (action.type === 'rename') {
      const name = value.trim();
      if (!name) return;
      const dir = action.path.substring(0, action.path.lastIndexOf('/') + 1);
      const newPath = name.startsWith('/') ? name : dir + name;
      this.orchestrator.renameFile(action.path, newPath);
    } else if (action.type === 'delete') {
      this.orchestrator.deleteFile(action.path);
    } else if (action.type === 'importProject') {
      if (this.projectIo.supportsFileSystemAccess) {
        this.projectIo.importFromDirectory();
      } else {
        this.zipInput.nativeElement.click();
      }
    } else if (action.type === 'newSession') {
      this.orchestrator.resetToEmptyProject();
    }
  }

  onNodeContextMenu(event: MouseEvent, node: FileNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuTarget = node;

    const items: ContextMenuAction[] = [];
    if (node.type === 'directory') {
      items.push(
        { label: 'Nuevo archivo', icon: 'note_add', action: 'newFile' },
        { label: 'Nueva carpeta', icon: 'create_new_folder', action: 'newFolder' },
      );
    } else {
      items.push(
        { label: 'Renombrar', icon: 'edit', action: 'rename' },
        { label: 'Duplicar', icon: 'content_copy', action: 'duplicate' },
        { label: '', action: '', separator: true },
        { label: 'Eliminar', icon: 'delete', action: 'delete' },
      );
    }
    this.contextMenuItems.set(items);
    this.contextMenuX.set(event.clientX);
    this.contextMenuY.set(event.clientY);
    this.contextMenuOpen.set(true);
  }

  onContextAction(action: string): void {
    this.contextMenuOpen.set(false);
    const node = this.contextMenuTarget;
    this.contextMenuTarget = null;
    if (!node || !action) return;

    switch (action) {
      case 'newFile':
        this.showNewFileDialog(node.path + '/');
        break;
      case 'newFolder':
        this.showNewFolderDialog(node.path + '/');
        break;
      case 'rename':
        this.showRenameDialog(node.path);
        break;
      case 'duplicate':
        this.orchestrator.duplicateFile(node.path);
        break;
      case 'delete':
        this.showDeleteDialog(node.path);
        break;
    }
  }

  private openFile(node: FileNode): void {
    if (node.type === 'file') {
      const type = getFileType(node.name);
      this.editorState.openFile(node.path, node.name, type, node.content ?? '');
      this.projectState.clearAutoCreated(node.path);
    }
  }

  openRelative(rawPath: string): void {
    const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;
    const name = path.split('/').pop() ?? 'file';
    const files = this.editorState.files();
    if (!files.has(path)) {
      this.orchestrator.addFile(path, name);
      return;
    }
    this.editorState.openFile(path, name, getFileType(name), files.get(path) ?? '');
    this.projectState.clearAutoCreated(path);
  }

  goToMixin(mixin: PugMixin): void {
    const path = mixin.filename ?? this.editorState.activeTab()?.path;
    if (!path) return;
    this.editorState.requestGoToLine(path, mixin.line);
  }

  isActive(path: string): boolean {
    return this.editorState.activeTab()?.path === path;
  }

  isExpanded(path: string): boolean {
    return this.projectState.isExpanded(path);
  }
}
