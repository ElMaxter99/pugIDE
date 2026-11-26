import { Component, ChangeDetectionStrategy, ElementRef, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FileNode } from '../../../core/models/file-node.model';
import { getFileType } from '../../../core/models/tab.model';
import { ProjectState } from '../../../core/state/project.state';
import { EditorState } from '../../../core/state/editor.state';
import { AssetState } from '../../../core/state/asset.state';
import { PreviewState } from '../../../core/state/preview.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import type { EntryLike } from '../../../core/utils/drop-import.util';
import { openInHost } from '../../../core/render/preview-host';
import { isFontPath } from '../../../core/utils/asset.util';
import { missingStartsOpen, splitAssetPath, summarizeMissing } from '../../../core/utils/missing-assets.util';
import { getFileIcon } from '../../../core/utils/file-icon.util';

/** Árbol de archivos del proyecto: abrir, plegar carpetas, soltar assets y lista de archivos que faltan. */
@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (assetState.missing().length > 0) {
      <div class="missing-assets" data-testid="missing-assets">
        <button
          type="button"
          class="missing-head"
          data-testid="missing-toggle"
          aria-controls="missing-list"
          [attr.aria-expanded]="missingOpen()"
          [title]="missingOpen() ? 'Plegar la lista' : 'Desplegar la lista'"
          (click)="toggleMissing()">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">broken_image</span>
          <span class="missing-head-text">
            <span class="missing-title" data-testid="missing-title">Faltan {{ assetState.missing().length }} archivo(s)</span>
            @if (missingSummary()) { <span class="missing-summary" data-testid="missing-summary">{{ missingSummary() }}</span> }
          </span>
          <span aria-hidden="true" class="material-symbols-outlined missing-chevron">{{ missingOpen() ? 'keyboard_arrow_up' : 'chevron_right' }}</span>
        </button>
        @if (missingOpen()) {
          <div id="missing-list" class="missing-list" data-testid="missing-list" role="group" aria-label="Archivos que faltan" tabindex="0">
            @for (path of assetState.missing(); track path) {
              <button type="button" class="missing-row" [title]="'Subir ' + path" (click)="pickAsset.emit(path)">
                <span class="missing-path">
                  <span class="missing-dir"><bdi>{{ split(path).dir }}</bdi></span>
                  <span class="missing-file">{{ split(path).name }}</span>
                </span>
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">upload_file</span>
              </button>
            }
          </div>
        }
      </div>
    }

    <div
      class="file-tree"
      role="tree"
      aria-label="Archivos del proyecto"
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
          role="treeitem"
          [attr.aria-level]="level + 1"
          [attr.aria-expanded]="isExpanded(node.path)"
          [attr.tabindex]="rowTabindex(node.path)"
          [attr.data-path]="node.path"
          [style.padding-left.px]="16 + level * 16"
          (click)="onNodeClick(node)"
          (focus)="focusPath.set(node.path)"
          (keydown)="onRowKeydown($event, node)"
          (contextmenu)="onNodeContextMenu($event, node)">
          <span aria-hidden="true" class="material-symbols-outlined expand-icon" [class.rotated]="isExpanded(node.path)">
            keyboard_arrow_down
          </span>
          <span aria-hidden="true" class="material-symbols-outlined folder-icon">folder</span>
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
          role="treeitem"
          [attr.aria-level]="level + 1"
          [attr.aria-selected]="isActive(node.path)"
          [attr.tabindex]="rowTabindex(node.path)"
          [attr.data-path]="node.path"
          [style.padding-left.px]="16 + level * 16"
          [class.active]="isActive(node.path)"
          (click)="onNodeClick(node)"
          (dblclick)="onNodeDblClick(node)"
          (focus)="focusPath.set(node.path)"
          (keydown)="onRowKeydown($event, node)"
          (contextmenu)="onNodeContextMenu($event, node)">
          <span aria-hidden="true" class="material-symbols-outlined file-icon">{{ fileIcon(node) }}</span>
          <span class="file-name">{{ node.name }}</span>
          @if (node.path === previewState.entryPath()) {
            <span class="preview-mark" [class.pinned]="previewState.pinnedEntry() === node.path" data-testid="preview-mark"
                  [attr.title]="previewState.pinnedEntry() === node.path ? 'Vista previa (elegida)' : 'Vista previa (automática)'">
              <span aria-hidden="true" class="material-symbols-outlined">visibility</span>
              @if (previewState.pinnedEntry() === node.path) { <span aria-hidden="true" class="preview-mark-text">Vista previa</span> }
              <span class="sr-only">{{ previewState.pinnedEntry() === node.path ? ', vista previa elegida' : ', vista previa automática' }}</span>
            </span>
          }
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
      flex: none;
      margin: 0 12px 8px;
      padding: 8px;
      border: 1px solid var(--warning-color, #e5a50a);
      border-radius: var(--radius);
      background: var(--bg-surface-container);
    }
    .missing-head {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 0;
      color: var(--warning-color, #e5a50a);
      border-radius: 4px;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
    }
    .missing-head:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; }
    .missing-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .missing-title { font-weight: 600; }
    .missing-summary { font-size: 11px; color: var(--text-secondary); }
    .missing-chevron { font-size: 16px; }
    /* Unas 7 filas y, más allá, scroll dentro de la caja; en ventanas bajas, nunca más de un tercio del alto (P-50). */
    .missing-list {
      margin-top: 4px;
      max-height: min(168px, 33vh);
      overflow-y: auto;
      padding-right: 2px;
      scrollbar-width: thin;
    }
    .missing-list:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; border-radius: 3px; }
    .missing-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      width: 100%;
      padding: 2px 4px;
      color: var(--text-secondary);
      border-radius: 3px;
      font-size: 12px;
      text-align: left;
    }
    .missing-row:hover { background: var(--bg-surface-variant); color: var(--text-primary); }
    /* El nombre con su extensión no se corta nunca: lo que se acorta es la carpeta, por el principio. */
    .missing-path { display: flex; flex: 1; min-width: 0; font-family: var(--font-mono); }
    .missing-dir {
      flex: 0 1000 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      direction: rtl;
      text-align: left;
      color: var(--text-tertiary, var(--text-secondary));
    }
    .missing-file { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary); }
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

    .file-row:focus-visible {
      outline: 2px solid var(--accent-color);
      outline-offset: -2px;
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

    .preview-mark { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; color: var(--text-tertiary); font-size: 11px; }
    .preview-mark .material-symbols-outlined { font-size: 14px; }
    .preview-mark.pinned { color: var(--accent-color); }
    .preview-mark-text { font-weight: 600; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
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
  protected previewState = inject(PreviewState);
  private orchestrator = inject(OrchestratorService);
  private projectIo = inject(ProjectIoService);
  protected dragOver = signal(false);

  /** Elección de la persona sobre la lista de archivos que faltan; `null` = la regla por defecto (plegada si son más de 6). */
  private missingChoice = signal<boolean | null>(null);
  protected missingOpen = computed(() => this.missingChoice() ?? missingStartsOpen(this.assetState.missing().length));
  protected missingSummary = computed(() => summarizeMissing(this.assetState.missing()));
  protected split = splitAssetPath;
  private lastMissingCount = 0;
  /** Fila que tiene (o tuvo) el foco: el árbol es una sola parada de Tab y las flechas mueven el foco entre filas. */
  protected focusPath = signal<string | null>(null);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    // La elección se recuerda mientras dure la sesión, pero vuelve a la regla por defecto si la lista crece (otro CSS importado) o se vacía.
    effect(() => {
      const n = this.assetState.missing().length;
      untracked(() => {
        if (n === 0 || n > this.lastMissingCount) this.missingChoice.set(null);
        this.lastMissingCount = n;
      });
    });
  }

  protected toggleMissing(): void {
    this.missingChoice.set(!this.missingOpen());
  }

  /** Se pide subir el archivo que falta en esa ruta. */
  readonly pickAsset = output<string>();
  readonly nodeContextMenu = output<{ event: MouseEvent; node: FileNode }>();
  /** F2 renombra y Supr borra el archivo con el foco (los mismos diálogos que el menú contextual). */
  readonly nodeAction = output<{ action: 'rename' | 'delete'; node: FileNode }>();

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOver.set(false);
    // Las entradas y los archivos hay que sacarlos del evento antes de cualquier `await`: después el navegador los invalida.
    const dt = event.dataTransfer;
    const entries = Array.from(dt?.items ?? [])
      .filter((i) => i.kind === 'file')
      .map((i) => i.webkitGetAsEntry?.() as EntryLike | null | undefined)
      .filter((e): e is EntryLike => !!e);
    const files = Array.from(dt?.files ?? []);
    if (files.length === 0 && entries.length === 0) return;
    // Soltado sobre una carpeta (o un archivo dentro de ella): esa carpeta es el destino.
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-path]');
    const path = row?.dataset['path'] ?? '';
    const target = row?.classList.contains('directory-row') ? path : path.slice(0, path.lastIndexOf('/')) || '/';
    await this.projectIo.importDropped(entries, files, target);
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

  /** Doble clic en una plantilla Pug/Jade: se previsualiza ese archivo (lo mismo que «Previsualizar este archivo» del menú). */
  protected onNodeDblClick(node: FileNode): void {
    if (node.type !== 'file' || node.isAsset || !/\.(pug|jade)$/i.test(node.path)) return;
    void this.orchestrator.setPreviewEntry(node.path);
  }

  protected onNodeContextMenu(event: MouseEvent, node: FileNode): void {
    event.preventDefault();
    event.stopPropagation();
    this.nodeContextMenu.emit({ event, node });
  }

  /** Solo una fila es parada de Tab: la última enfocada, si no el archivo abierto, si no la primera. */
  protected rowTabindex(path: string): number {
    const paths = this.rowPaths();
    const wanted = this.focusPath() && paths.includes(this.focusPath()!) ? this.focusPath()
      : paths.includes(this.editorState.activeTab()?.path ?? '') ? this.editorState.activeTab()!.path : paths[0];
    return path === wanted ? 0 : -1;
  }

  private rowPaths(): string[] {
    const out: string[] = [];
    const walk = (nodes: FileNode[]): void => {
      for (const n of nodes) {
        out.push(n.path);
        if (n.type === 'directory' && n.children && this.isExpanded(n.path)) walk(n.children);
      }
    };
    walk(this.projectState.fileTree());
    return out;
  }

  /** Enter/Espacio abren; flechas arriba/abajo mueven el foco; derecha/izquierda despliegan y pliegan; F2 renombra, Supr borra, y la tecla de menú o Mayús+F10 abren el menú contextual. */
  protected onRowKeydown(event: KeyboardEvent, node: FileNode): void {
    const rows = Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.file-row'));
    const index = rows.findIndex((r) => r.dataset['path'] === node.path);
    const move = (to: number): void => {
      const target = rows[Math.max(0, Math.min(rows.length - 1, to))];
      if (target) { event.preventDefault(); target.focus(); }
    };
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.onNodeClick(node);
        break;
      case 'ArrowDown': move(index + 1); break;
      case 'ArrowUp': move(index - 1); break;
      case 'Home': move(0); break;
      case 'End': move(rows.length - 1); break;
      case 'ArrowRight':
        if (node.type === 'directory') { event.preventDefault(); if (!this.isExpanded(node.path)) this.projectState.toggleDir(node.path); else move(index + 1); }
        break;
      case 'ArrowLeft':
        if (node.type === 'directory' && this.isExpanded(node.path)) { event.preventDefault(); this.projectState.toggleDir(node.path); }
        break;
      case 'F2':
        event.preventDefault();
        this.nodeAction.emit({ action: 'rename', node });
        break;
      case 'Delete':
        event.preventDefault();
        this.nodeAction.emit({ action: 'delete', node });
        break;
      case 'ContextMenu':
      case 'F10':
        if (event.key === 'F10' && !event.shiftKey) break;
        event.preventDefault();
        {
          const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
          this.nodeContextMenu.emit({ event: new MouseEvent('contextmenu', { clientX: r.left + 24, clientY: r.bottom }), node });
        }
        break;
    }
  }

  protected isActive(path: string): boolean {
    return this.editorState.activeTab()?.path === path;
  }

  protected isExpanded(path: string): boolean {
    return this.projectState.isExpanded(path);
  }
}
