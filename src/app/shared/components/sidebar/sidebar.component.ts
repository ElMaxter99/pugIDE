import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileNode } from '../../../core/models/file-node.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { getFileType } from '../../../core/models/tab.model';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { DialogComponent, DialogConfig } from '../dialogs/dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, DialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <app-dialog
        [config]="dialogConfig()"
        [isOpen]="dialogOpen()"
        (confirmed)="onDialogConfirm($event)"
        (cancelled)="dialogOpen.set(false)" />
      <div class="sidebar-inner">
        <div class="workspace-header">
          <div class="workspace-label-row">
            <span class="workspace-label">Workspace</span>
            <button class="add-btn" (click)="showNewFileDialog()" title="New file">
              <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
            </button>
          </div>
          <div class="workspace-info">
            <div class="workspace-avatar">P</div>
            <div class="workspace-text">
              <p class="workspace-name">{{ projectState.projectName() }}</p>
              <p class="workspace-version">v1.2.4</p>
            </div>
          </div>
        </div>

        <nav class="panel-tabs">
          @for (panel of panels; track panel.id) {
            <div
              class="panel-tab"
              [class.active]="activePanel() === panel.id"
              (click)="activePanel.set(panel.id)">
              <span class="material-symbols-outlined">{{ panel.icon }}</span>
              <span class="panel-tab-label">{{ panel.label }}</span>
            </div>
          }
        </nav>

        <div class="file-tree">
          @for (node of projectState.fileTree(); track node.path) {
            <ng-container *ngTemplateOutlet="fileNode; context: { $implicit: node, level: 0 }"></ng-container>
          }
        </div>
      </div>
    </aside>

    <ng-template #fileNode let-node let-level="level">
      @if (node.type === 'directory') {
        <div
          class="file-row directory-row"
          [style.padding-left.px]="16 + level * 16"
          (click)="onNodeClick(node)">
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
          (click)="onNodeClick(node)">
          <span class="material-symbols-outlined file-icon">description</span>
          <span class="file-name">{{ node.name }}</span>
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

    .panel-tabs {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-tab {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .panel-tab:hover {
      background: var(--bg-surface-variant);
    }

    .panel-tab.active {
      background: var(--bg-surface-container-highest);
      color: var(--accent-color);
      border-left: 2px solid var(--accent-color);
    }

    .panel-tab .material-symbols-outlined {
      font-size: 20px;
    }

    .panel-tab-label {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 16px;
      letter-spacing: 0.05em;
      font-weight: 500;
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
  private orchestrator = inject(OrchestratorService);

  activePanel = signal<'files' | 'git'>('files');

  protected dialogOpen = signal(false);
  protected dialogConfig = signal<DialogConfig>({
    title: 'New File',
    message: 'Enter filename (e.g. components/card.pug)',
    confirmText: 'Create',
    cancelText: 'Cancel',
    showInput: true,
    inputLabel: 'Filename',
    inputValue: '',
  });

  panels = [
    { id: 'files' as const, icon: 'folder', label: 'Explorer' },
    { id: 'git' as const, icon: 'account_tree', label: 'Source Control' },
  ];

  onNodeClick(node: FileNode): void {
    if (node.type === 'directory') {
      this.projectState.toggleDir(node.path);
    } else {
      this.openFile(node);
    }
  }

  showNewFileDialog(): void {
    const activePath = this.editorState.activeTab()?.path ?? '/main.pug';
    const dir = activePath.substring(0, activePath.lastIndexOf('/') + 1);
    this.dialogConfig.update((c) => ({
      ...c,
      inputValue: dir + 'new-file.pug',
    }));
    this.dialogOpen.set(true);
  }

  onDialogConfirm(value: string): void {
    this.dialogOpen.set(false);
    const name = value.trim();
    if (!name) return;

    const path = name.startsWith('/') ? name : '/' + name;
    const filename = path.split('/').pop() ?? name;

    if (this.editorState.files().has(path)) {
      this.editorState.openFile(path, filename, getFileType(filename), '');
      return;
    }

    this.orchestrator.addFile(path, filename);
  }

  private openFile(node: FileNode): void {
    if (node.type === 'file') {
      const type = getFileType(node.name);
      this.editorState.openFile(node.path, node.name, type, node.content ?? '');
    }
  }

  isActive(path: string): boolean {
    return this.editorState.activeTab()?.path === path;
  }

  isExpanded(path: string): boolean {
    return this.projectState.isExpanded(path);
  }
}
