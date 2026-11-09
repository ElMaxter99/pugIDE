import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  untracked,
  computed,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FileNode } from '../../../core/models/file-node.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { getFileType } from '../../../core/models/tab.model';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { summarizeFolder } from '../../../core/utils/folder-ops.util';
import { contextMenuFor, defaultNewFileDir, deleteDialog, deleteFolderDialog, renameFolderDialog, importDialog, newFileDialog, renameDialog, toProjectPath } from '../../../core/utils/file-actions.util';
import { FileTreeComponent } from './file-tree.component';
import { DialogComponent, DialogConfig } from '../dialogs/dialog.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { ContextMenuAction } from '../../../core/models/index';
import { AssetState } from '../../../core/state/asset.state';
import { PreferencesState } from '../../../core/services/preferences.state';
import { APP_VERSION } from '../../../core/models/version.token';
import { UiState } from '../../../core/state/ui.state';
import { PanelResizerComponent } from '../panel-resizer/panel-resizer.component';
import { LayoutService } from '../../../core/services/layout.service';
import { SmartDataEditorComponent } from '../../../features/smart-data-editor/smart-data-editor.component';

type PendingAction =
  | { type: 'newFile'; dir: string }
  | { type: 'rename'; path: string }
  | { type: 'delete'; path: string }
  | { type: 'renameFolder'; path: string }
  | { type: 'deleteFolder'; path: string }
  | { type: 'importProject' };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [DialogComponent, ContextMenuComponent, FileTreeComponent, SmartDataEditorComponent, PanelResizerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="preferences.sidebarCollapsed()">
      @if (!preferences.sidebarCollapsed()) {
        <app-panel-resizer
          testId="resizer-sidebar"
          label="Ancho del panel lateral"
          edge="right"
          [value]="layout.resolved().sidebar"
          [min]="layout.resolved().limits.sidebar.min"
          [max]="layout.resolved().limits.sidebar.max"
          [grow]="1"
          (sizeChange)="layout.setLive('sidebar', $event)"
          (committed)="layout.commitLive()"
          (restore)="layout.resetSize('sidebar')" />
      }
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
      <div class="rail" role="toolbar" aria-label="Paneles recogidos" aria-orientation="vertical">
        <button type="button" class="rail-btn" data-testid="rail-archivos" (click)="layout.openSidebar('archivos')" title="Mostrar Archivos (Ctrl+B)" aria-label="Mostrar Archivos">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 20px;">folder_open</span>
        </button>
        @if (!layout.dataColumn()) {
          <button type="button" class="rail-btn" data-testid="rail-datos" (click)="layout.openSidebar('datos')" title="Mostrar Datos" aria-label="Mostrar Datos">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 20px;">data_object</span>
          </button>
        }
      </div>
      <div class="sidebar-inner">
        <div class="sidebar-tabs">
        <div class="tabs-list" role="tablist" aria-label="Panel lateral" (keydown)="onTabKey($event)">
          <button type="button" role="tab" class="tab" id="tab-archivos" data-testid="tab-archivos" aria-controls="panel-archivos"
            [class.active]="tab() === 'archivos'" [attr.aria-selected]="tab() === 'archivos'" [attr.tabindex]="tab() === 'archivos' ? 0 : -1"
            (click)="selectTab('archivos')">Archivos</button>
          @if (!layout.dataColumn()) {
            <button type="button" role="tab" class="tab" id="tab-datos" data-testid="tab-datos" aria-controls="panel-datos"
              [class.active]="tab() === 'datos'" [attr.aria-selected]="tab() === 'datos'" [attr.tabindex]="tab() === 'datos' ? 0 : -1"
              (click)="selectTab('datos')">Datos</button>
          }
        </div>
          <span class="tabs-spacer"></span>
          <button type="button" class="add-btn" (click)="layout.toggleSidebar()" title="Recoger el panel lateral (Ctrl+B)" aria-label="Recoger el panel lateral">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">left_panel_close</span>
          </button>
        </div>

        <div class="tab-panel" role="tabpanel" id="panel-archivos" aria-labelledby="tab-archivos" [hidden]="tab() !== 'archivos'">
        <div class="workspace-header">
          <div class="workspace-label-row">
            <div class="workspace-actions">
              <button class="add-btn" (click)="onImportClick()" title="Importar proyecto (carpeta o .zip)" aria-label="Importar proyecto (carpeta o .zip)">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">upload</span>
              </button>
              <button class="add-btn" (click)="onExportClick()" title="Exportar proyecto (carpeta o .zip)" aria-label="Exportar proyecto (carpeta o .zip)">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">download</span>
              </button>
              <button class="add-btn" (click)="pickAssets()" title="Subir imágenes, fuentes o estilos (.css, .scss, .less)" aria-label="Subir imágenes, fuentes o estilos">
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

        <app-file-tree (pickAsset)="pickAssets($event)" (nodeContextMenu)="onNodeContextMenu($event.event, $event.node)" (nodeAction)="onNodeAction($event.action, $event.node)" />
        </div>

        @if (!layout.dataColumn()) {
          <div class="tab-panel data-panel" role="tabpanel" id="panel-datos" aria-labelledby="tab-datos" [hidden]="tab() !== 'datos'">
            <app-smart-data-editor [embedded]="true" />
          </div>
        }
      </div>
    </aside>

  `,
  styles: [`
    :host {
      display: flex;
      height: 100%;
    }

    .sidebar {
      width: 100%;
      min-width: 0;
      position: relative;
      background: var(--bg-surface-container-low);
      border-right: 1px solid var(--border-color);
      height: 100%;
      overflow: hidden;
    }

    /* Recogido: un raíl con un botón por panel (48 px; el ancho lo fija la disposición). */
    .rail { display: none; }
    .sidebar.collapsed .sidebar-inner { display: none; }
    .sidebar.collapsed .rail {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 8px 0;
    }
    .rail-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius);
      color: var(--text-secondary);
    }
    .rail-btn:hover { color: var(--text-primary); background: var(--bg-surface-variant); }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .sidebar-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 8px 0 8px;
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
    }
    .tab {
      padding: 6px 12px;
      min-height: 32px;
      border-bottom: 2px solid transparent;
      color: var(--text-secondary);
      font-size: 13px;
      font-family: inherit;
    }
    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--text-primary); border-bottom-color: var(--accent-color); font-weight: 600; }
    .tabs-list { display: flex; align-items: center; gap: 2px; }
    .tabs-spacer { flex: 1; }

    .tab-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      padding-top: 12px;
      gap: 8px;
      overflow: hidden;
    }
    .tab-panel[hidden] { display: none; }
    .tab-panel.data-panel { padding-top: 0; }

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
  protected layout = inject(LayoutService);
  /** Pestaña visible: con los datos en su propia columna solo existe «Archivos». */
  protected tab = computed<'archivos' | 'datos'>(() => (this.layout.dataColumn() ? 'archivos' : this.preferences.sidebarTab()));
  private ui = inject(UiState);
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

  constructor() {
    // Órdenes de los menús de la barra superior (Importar…, Subir imágenes…).
    effect(() => {
      const req = this.ui.panelRequest();
      if (!req) return;
      untracked(() => {
        if (req.id === 'import-project') this.onImportClick();
        else if (req.id === 'upload-assets') this.pickAssets();
      });
    });
  }

  protected selectTab(tab: 'archivos' | 'datos'): void {
    this.preferences.update({ sidebarTab: tab });
  }

  /** Flechas ← → entre pestañas (patrón de pestañas de WAI-ARIA): mueven la selección y el foco. */
  protected onTabKey(e: KeyboardEvent): void {
    if (this.layout.dataColumn() || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End')) return;
    e.preventDefault();
    const next = e.key === 'ArrowLeft' || e.key === 'Home' ? 'archivos' : 'datos';
    this.selectTab(next);
    (document.getElementById('tab-' + next) as HTMLElement | null)?.focus();
  }

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

  private showRenameFolderDialog(path: string): void {
    const { files, assets } = this.orchestrator.folderContents(path);
    this.pendingAction = { type: 'renameFolder', path };
    this.dialogConfig.set(renameFolderDialog(path, files.length, assets.length));
    this.dialogOpen.set(true);
  }

  private showDeleteFolderDialog(path: string): void {
    const { files, assets } = this.orchestrator.folderContents(path);
    this.pendingAction = { type: 'deleteFolder', path };
    this.dialogConfig.set(deleteFolderDialog(path, summarizeFolder(files, assets)));
    this.dialogOpen.set(true);
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
    } else if (action.type === 'renameFolder') {
      this.orchestrator.renameFolder(action.path, value);
    } else if (action.type === 'deleteFolder') {
      this.orchestrator.deleteFolder(action.path);
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

    const choices = this.orchestrator.previewChoices();
    this.contextMenuItems.set(contextMenuFor(node, { current: choices.current, pinned: choices.pinned, autoName: choices.auto?.split('/').pop() ?? null }));
    this.contextMenuX.set(event.clientX);
    this.contextMenuY.set(event.clientY);
    this.contextMenuOpen.set(true);
  }

  /** F2 / Supr sobre un archivo del árbol. */
  onNodeAction(action: 'rename' | 'delete', node: FileNode): void {
    if (node.type === 'directory') {
      if (action === 'rename') this.showRenameFolderDialog(node.path);
      else this.showDeleteFolderDialog(node.path);
      return;
    }
    if (action === 'rename') this.showRenameDialog(node.path);
    else this.showDeleteDialog(node.path);
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
        if (node.type === 'directory') this.showRenameFolderDialog(node.path);
        else this.showRenameDialog(node.path);
        break;
      case 'duplicate':
        this.orchestrator.duplicateFile(node.path);
        break;
      case 'preview':
        this.orchestrator.setPreviewEntry(node.path);
        break;
      case 'previewAuto':
        this.orchestrator.setPreviewEntry(null);
        break;
      case 'delete':
        if (node.type === 'directory') this.showDeleteFolderDialog(node.path);
        else this.showDeleteDialog(node.path);
        break;
    }
  }
}
