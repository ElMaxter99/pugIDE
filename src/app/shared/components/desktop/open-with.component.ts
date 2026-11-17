import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OpenWithService } from '../../../core/services/open-with.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { desktopPathForFile } from '../../../core/utils/desktop.util';
import type { EntryLike } from '../../../core/utils/drop-import.util';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';

/**
 * Abrir con PugIDE (P-40, solo escritorio): el diálogo «Abrir factura.pug» (carpeta como espacio o solo el archivo),
 * la zona «Suelta para abrir» al arrastrar sobre la ventana y los avisos. La lógica está en `OpenWithService`.
 */
@Component({
  selector: 'app-open-with',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open.request(); as d) {
      <div class="overlay" (click)="answer(null)">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Abrir ' + d.name" tabindex="-1" data-testid="open-with"
          (click)="$event.stopPropagation()" (keydown.escape)="answer(null)" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Abrir {{ d.name }}</h2></div>
          <div class="body">
            <p class="where">Está en <code>{{ d.folder }}</code>.</p>
            <label class="radio"><input type="radio" name="open-with" data-testid="open-with-folder" [checked]="choice() === 'folder'" (change)="choice.set('folder')" />
              <span>Abrir la carpeta como espacio de trabajo<span class="sub">Recomendado: así funcionan <code>include</code>, <code>extends</code>, los estilos y las imágenes. Se abre con {{ d.name }} en la vista previa.</span></span></label>
            <label class="radio"><input type="radio" name="open-with" data-testid="open-with-file" [checked]="choice() === 'file'" (change)="choice.set('file')" />
              <span>Solo este archivo, en un proyecto nuevo de la app<span class="sub">Una copia: los cambios no se guardan en el disco.</span></span></label>
            <label class="check"><input type="checkbox" data-testid="open-with-remember" [checked]="remember()" (change)="remember.set($any($event.target).checked)" />Hacer siempre esto y no volver a preguntar</label>
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="answer(null)">Cancelar</button>
            <button type="button" class="btn primary" data-testid="open-with-go" (click)="answer(choice())"><span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Abrir</button>
          </div>
        </div>
      </div>
    }
    @if (dragging()) {
      <div class="drop" data-testid="open-drop" aria-hidden="true">
        <div class="drop-box">
          <span class="material-symbols-outlined drop-icon">upload_file</span>
          <div class="drop-title">Suelta para abrir</div>
          <div class="drop-sub"><b>Una carpeta</b> → se abre como espacio de trabajo<br><b>Archivos</b> → se añaden al proyecto abierto (como «Importar archivos»)</div>
        </div>
      </div>
    }
    @if (open.toast(); as t) {
      <div class="toast" role="status" data-testid="open-toast" [class.error]="t.kind === 'error'">
        <span aria-hidden="true" class="material-symbols-outlined t-icon">{{ t.kind === 'error' ? 'error' : 'folder_open' }}</span>
        <div class="grow">
          <div><b>{{ t.title }}</b></div>
          <div class="t-sub">{{ t.sub }}</div>
          @if (t.forget; as gone) { <button type="button" class="btn link" data-testid="open-toast-forget" (click)="open.forget(gone)"><span aria-hidden="true" class="material-symbols-outlined">delete</span>Quitar de la lista</button> }
          @if (t.rename) { <button type="button" class="btn link" data-testid="open-toast-rename" (click)="open.openWorkspaces()">Cambiar nombre y color</button> }
        </div>
        <button type="button" class="close" aria-label="Cerrar aviso" data-testid="open-toast-close" (click)="open.toast.set(null)">×</button>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 460px; max-width: calc(100vw - 32px); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-primary); display: flex; flex-direction: column; gap: 12px; }
    .where { margin: 0; font-size: 12px; color: var(--text-secondary); overflow-wrap: anywhere; }
    code { font-family: var(--font-mono); font-size: 12px; }
    .radio { display: flex; gap: 8px; align-items: flex-start; }
    .radio input, .check input { accent-color: var(--accent-color); margin-top: 3px; }
    .sub { display: block; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
    .check { display: flex; gap: 8px; align-items: center; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn.link { background: none; border: none; color: var(--accent-color); padding: 6px 0 0; }
    .drop { position: fixed; inset: 12px; z-index: 2200; display: flex; align-items: center; justify-content: center; pointer-events: none; background: rgba(0, 0, 0, 0.35); border-radius: 12px; }
    .drop-box { width: 420px; max-width: calc(100vw - 48px); padding: 28px 20px; border: 2px dashed var(--accent-color); border-radius: 12px; background: var(--bg-secondary); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-primary); }
    .drop-icon { font-size: 36px; color: var(--accent-color); }
    .drop-title { font-size: 15px; font-weight: 600; }
    .drop-sub { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
    .drop-sub b { color: var(--text-primary); }
    .toast { position: fixed; right: 16px; bottom: 40px; z-index: 2100; width: 440px; max-width: calc(100vw - 32px); display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); font-size: 13px; color: var(--text-primary); }
    .t-icon { font-size: 20px; color: var(--accent-color); }
    .toast.error .t-icon { color: var(--error-color); }
    .t-sub { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .grow { flex: 1; min-width: 0; }
    .close { width: 24px; height: 24px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
  `],
})
export class OpenWithComponent {
  protected readonly open = inject(OpenWithService);
  private readonly projectIo = inject(ProjectIoService);

  protected readonly choice = signal<'folder' | 'file'>('folder');
  protected readonly remember = signal(false);
  protected readonly dragging = signal(false);
  private depth = 0;

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.open.request()) {
        untracked(() => {
          this.choice.set('folder');
          this.remember.set(false);
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected answer(choice: 'folder' | 'file' | null): void {
    this.open.choose(choice, this.remember());
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  private hasFiles(e: DragEvent): boolean {
    return this.open.available && !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  }

  @HostListener('window:dragenter', ['$event'])
  protected onDragEnter(e: DragEvent): void {
    if (!this.hasFiles(e)) return;
    this.depth++;
    this.dragging.set(true);
  }

  @HostListener('window:dragover', ['$event'])
  protected onDragOver(e: DragEvent): void {
    if (!this.hasFiles(e)) return;
    e.preventDefault(); // sin esto el navegador intenta abrir el archivo
    if (e.dataTransfer && !e.defaultPrevented) e.dataTransfer.dropEffect = 'copy';
  }

  @HostListener('window:dragleave', ['$event'])
  protected onDragLeave(e: DragEvent): void {
    if (!this.hasFiles(e)) return;
    this.depth = Math.max(0, this.depth - 1);
    if (this.depth === 0) this.dragging.set(false);
  }

  @HostListener('window:keydown.escape')
  protected onEscape(): void {
    this.depth = 0;
    this.dragging.set(false);
  }

  @HostListener('window:drop', ['$event'])
  protected onDrop(e: DragEvent): void {
    const wasFiles = this.hasFiles(e);
    this.depth = 0;
    this.dragging.set(false);
    if (!wasFiles || !e.dataTransfer) return;
    // El árbol de archivos y el diálogo de importar ya manejan lo que se suelta encima (y lo marcan con preventDefault).
    if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.('app-file-tree, [data-testid="import-dropzone"]')) return;
    e.preventDefault();
    // Hay que leerlo todo ya: el navegador invalida los datos tras el primer await.
    const pairs = Array.from(e.dataTransfer.items ?? []).filter((i) => i.kind === 'file').map((item) => ({ item, entry: item.webkitGetAsEntry?.() ?? null }));
    const entries = pairs.map((p) => p.entry).filter((x): x is FileSystemEntry => !!x);
    const files = Array.from(e.dataTransfer.files ?? []);
    const dir = pairs.find((p) => p.entry?.isDirectory);
    if (dir) {
      const file = dir.item.getAsFile?.() ?? null;
      const path = file ? desktopPathForFile(file) : null;
      if (path) { this.open.openDropped(path); return; }
    }
    void this.projectIo.importDropped(entries as unknown as EntryLike[], files);
  }
}
