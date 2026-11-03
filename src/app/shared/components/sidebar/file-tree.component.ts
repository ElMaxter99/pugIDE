import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FileNode } from '../../../core/models/file-node.model';
import { getFileType } from '../../../core/models/tab.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { AssetState } from '../../../core/state/asset.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { openInHost } from '../../../core/render/preview-host';
import { isFontPath } from '../../../core/utils/asset.util';
import { getFileIcon } from '../../../core/utils/file-icon.util';

/** Árbol de archivos del proyecto: abrir, plegar carpetas, soltar assets y lista de archivos que faltan. */
@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (assetState.missing().length > 0) {
      <div class="missing-assets">
        <p class="missing-title">
          <span class="material-symbols-outlined" style="font-size: 14px;">broken_image</span>
          Faltan {{ assetState.missing().length }} archivo(s)
        </p>
        @for (path of assetState.missing(); track path) {
          <button class="missing-row" [title]="'Subir ' + path" (click)="pickAsset.emit(path)">
            <span class="missing-path">{{ path }}</span>
            <span class="material-symbols-outlined" style="font-size: 14px;">upload_file</span>
          </button>
        }
      </div>
    }

    <div
      class="file-tree"
      [class.drop-active]="dragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)">
      @for (node of projectState.fileTree(); track node.path) {
        <ng-container *ngTemplateOutlet="fileNode; context: { $implicit: node, level: 0 }"></ng-container>
      }
    </div>

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
        </div>
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .missing-assets {
      margin: 0 12px 8px;
      padding: 8px;
      border: 1px solid var(--warning-color, #e5a50a);
      border-radius: var(--radius);
      background: var(--bg-surface-container);
    }
    .missing-title {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
      color: var(--warning-color, #e5a50a);
    }
    .missing-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
      padding: 2px 4px;
      color: var(--text-secondary);
      border-radius: 3px;
      text-align: left;
    }
    .missing-row:hover { background: var(--bg-surface-variant); color: var(--text-primary); }
    .missing-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); }
    .file-tree.drop-active { outline: 2px dashed var(--accent-color); outline-offset: -4px; }
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
  `],
})
export class FileTreeComponent {
  protected projectState = inject(ProjectState);
  private editorState = inject(EditorState);
  protected assetState = inject(AssetState);
  private orchestrator = inject(OrchestratorService);
  protected dragOver = signal(false);

  /** Se pide subir el archivo que falta en esa ruta. */
  readonly pickAsset = output<string>();
  readonly nodeContextMenu = output<{ event: MouseEvent; node: FileNode }>();

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) await this.orchestrator.addAssets(files);
  }

  protected fileIcon(node: FileNode): string {
    if (node.isAsset) return isFontPath(node.name) ? 'font_download' : 'image';
    return getFileIcon(getFileType(node.name));
  }

  protected onNodeClick(node: FileNode): void {
    if (node.type === 'directory') {
      this.projectState.toggleDir(node.path);
    } else if (node.isAsset) {
      const url = this.assetState.urlFor(node.path);
      if (!url) return;
      // Un SVG abierto como documento ejecutaría sus scripts con los permisos de la app: las imágenes se ven en un <img>.
      if (this.assetState.assets().get(node.path)?.mime.startsWith('image/')) openInHost({ kind: 'image', url });
      else window.open(url, '_blank');
    } else {
      this.editorState.openFile(node.path, node.name, getFileType(node.name), node.content ?? '');
    }
  }

  protected onNodeContextMenu(event: MouseEvent, node: FileNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.nodeContextMenu.emit({ event, node });
  }

  protected isActive(path: string): boolean {
    return this.editorState.activeTab()?.path === path;
  }

  protected isExpanded(path: string): boolean {
    return this.projectState.isExpanded(path);
  }
}
