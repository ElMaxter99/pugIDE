import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FileNode } from '../../../core/models/file-node.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { getFileType } from '../../../core/models/tab.model';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { contextMenuFor, defaultNewFileDir, deleteDialog, importDialog, newFileDialog, renameDialog, toProjectPath } from '../../../core/utils/file-actions.util';
import { FileTreeComponent } from './file-tree.component';
import { DialogComponent, DialogConfig } from '../dialogs/dialog.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { ContextMenuAction } from '../../../core/models/index';
import { AssetState } from '../../../core/state/asset.state';
import { PreferencesState } from '../../../core/services/preferences.state';
import { APP_VERSION } from '../../../core/models/version.token';

type PendingAction =
  | { type: 'newFile'; dir: string }
  | { type: 'rename'; path: string }
  | { type: 'delete'; path: string }
  | { type: 'importProject' };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [DialogComponent, ContextMenuComponent, FileTreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="preferences.sidebarCollapsed()">
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
      <button class="rail-btn" (click)="preferences.toggleSidebar()" title="Mostrar Archivos" aria-label="Mostrar Workspace">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">left_panel_open</span>
        <span class="rail-label">Archivos</span>
      </button>
      <div class="sidebar-inner">
        <div class="workspace-header">
          <div class="workspace-label-row">
            <span class="workspace-label">Archivos</span>
            <div class="workspace-actions">
              <button class="add-btn" (click)="preferences.toggleSidebar()" title="Colapsar Archivos" aria-label="Colapsar Workspace">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">left_panel_close</span>
              </button>
              <button class="add-btn" (click)="onImportClick()" title="Importar proyecto (carpeta o .zip)" aria-label="Importar proyecto (carpeta o .zip)">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">upload</span>
              </button>
              <button class="add-btn" (click)="onExportClick()" title="Exportar proyecto (carpeta o .zip)" aria-label="Exportar proyecto (carpeta o .zip)">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">download</span>
              </button>
              <button class="add-btn" (click)="pickAssets()" title="Subir imágenes, fuentes o estilos (.css, .scss, .less)">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">add_photo_alternate</span>
              </button>
              @if (orchestrator.fileUndoLabel(); as undoLabel) {
                <button class="add-btn" (click)="orchestrator.undoFileOp()" [title]="undoLabel" [attr.aria-label]="undoLabel">
                  <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">undo</span>
                </button>
              }
              <button class="add-btn" (click)="showNewFileDialog()" title="Nuevo archivo" aria-label="Nuevo archivo">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">add</span>
              </button>
            </div>
          </div>
          <input
            #zipInput
            type="file"
            accept=".zip"
            style="display: none"
            (change)="onZipFileSelected($event)" />
          <input
            #assetInput
            type="file"
            multiple
            accept="image/*,.svg,.woff,.woff2,.ttf,.otf,.eot,.css,.scss,.sass,.less"
            style="display: none"
            (change)="onAssetsSelected($event)" />
          <div class="workspace-info">
            <div class="workspace-avatar">P</div>
            <div class="workspace-text">
              <p class="workspace-name">{{ projectState.projectName() }}</p>
              <p class="workspace-version">v{{ version }}</p>
            </div>
          </div>
        </div>

        <app-file-tree (pickAsset)="pickAssets($event)" (nodeContextMenu)="onNodeContextMenu($event.event, $event.node)" />
      </div>
    </aside>

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

    .sidebar.collapsed {
      width: 40px;
      min-width: 40px;
    }
    .sidebar.collapsed .sidebar-inner { display: none; }
    .rail-btn { display: none; }
    .sidebar.collapsed .rail-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 0;
      color: var(--text-secondary);
    }
    .rail-btn:hover { color: var(--text-primary); background: var(--bg-surface-variant); }
    .rail-label {
      writing-mode: vertical-rl;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
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
  protected orchestrator = inject(OrchestratorService);
  protected projectIo = inject(ProjectIoService);
  protected version = inject(APP_VERSION);
  protected assetState = inject(AssetState);
  protected preferences = inject(PreferencesState);
  private assetTarget: string | undefined;

  @ViewChild('zipInput') private zipInput!: ElementRef<HTMLInputElement>;
  @ViewChild('assetInput') private assetInput!: ElementRef<HTMLInputElement>;

  protected dialogOpen = signal(false);
  protected dialogConfig = signal<DialogConfig>(newFileDialog('/'));
  private pendingAction: PendingAction | null = null;

  protected contextMenuOpen = signal(false);
  protected contextMenuX = signal(0);
  protected contextMenuY = signal(0);
  protected contextMenuItems = signal<ContextMenuAction[]>([]);
  private contextMenuTarget: FileNode | null = null;

  /** `target`: exact path a missing reference asks for; without it the file is matched by name or goes to /assets/. */
  pickAssets(target?: string): void {
    this.assetTarget = target;
    this.assetInput.nativeElement.multiple = !target;
    this.assetInput.nativeElement.click();
  }

  async onAssetsSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const target = this.assetTarget;
    this.assetTarget = undefined;
    if (files.length > 0) await this.orchestrator.addAssets(files, target);
  }

  showNewFileDialog(dir?: string): void {
    const baseDir = dir ?? defaultNewFileDir(this.editorState.activeTab()?.path);
    this.pendingAction = { type: 'newFile', dir: baseDir };
    this.dialogConfig.set(newFileDialog(baseDir));
    this.dialogOpen.set(true);
  }

  private showRenameDialog(path: string): void {
    this.pendingAction = { type: 'rename', path };
    this.dialogConfig.set(renameDialog(path));
    this.dialogOpen.set(true);
  }

  onExportClick(): void {
    this.projectIo.exportProject();
  }

  onImportClick(): void {
    this.pendingAction = { type: 'importProject' };
    this.dialogConfig.set(importDialog(this.projectIo.supportsFileSystemAccess));
    this.dialogOpen.set(true);
  }

  async onZipFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    await this.projectIo.importFromZipFile(file);
  }

  private showDeleteDialog(path: string): void {
    this.pendingAction = { type: 'delete', path };
    this.dialogConfig.set(deleteDialog(path));
    this.dialogOpen.set(true);
  }

  onDialogConfirm(value: string): void {
    this.dialogOpen.set(false);
    const action = this.pendingAction;
    this.pendingAction = null;
    if (!action) return;

    if (action.type === 'newFile') {
      const path = toProjectPath(value);
      if (!path) return;
      const filename = path.split('/').pop() ?? path;
      if (this.editorState.files().has(path)) {
        this.editorState.openFile(path, filename, getFileType(filename), '');
        return;
      }
      this.orchestrator.addFile(path, filename);
    } else if (action.type === 'rename') {
      const newPath = toProjectPath(value);
      if (!newPath) return;
      this.orchestrator.renameFile(action.path, newPath);
    } else if (action.type === 'delete') {
      this.orchestrator.deleteFile(action.path);
    } else if (action.type === 'importProject') {
      if (this.projectIo.supportsFileSystemAccess) {
        this.projectIo.importFromDirectory();
      } else {
        this.zipInput.nativeElement.click();
      }
    }
  }

  onNodeContextMenu(event: MouseEvent, node: FileNode): void {
    this.contextMenuTarget = node;

    this.contextMenuItems.set(contextMenuFor(node));
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
}
