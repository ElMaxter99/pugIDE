import { Component, ChangeDetectionStrategy, DestroyRef, computed, effect, inject, signal, ElementRef, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { PreferencesState } from '../../../core/services/preferences.state';
import { EditorState } from '../../../core/state/editor.state';
import { PreviewState } from '../../../core/state/preview.state';
import { UiState } from '../../../core/state/ui.state';
import { getFileType } from '../../../core/models/tab.model';
import { DEVICE_PRESETS } from '../../../core/utils/device-presets.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';
import { rememberFocus } from '../../../core/utils/focus-trap.util';
import { filterCommands } from '../../../core/utils/command-palette.util';

interface PaletteCommand {
  title: string;
  group: string;
  keywords?: string;
  run: () => void;
}

/** Paleta de comandos (Ctrl/Cmd+K): acciones, dispositivos del preview, plantillas y archivos del proyecto. */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.paletteOpen()) {
      <div class="overlay" (click)="close()">
        <div class="palette" role="dialog" aria-label="Paleta de comandos" (click)="$event.stopPropagation()">
          <input
            #search
            class="search"
            type="text"
            placeholder="Escribe un comando o el nombre de un archivo…"
            aria-label="Buscar comando"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            [value]="query()"
            (input)="onQuery($any($event.target).value)"
            (keydown)="onKey($event)" />
          <ul class="list" id="palette-list" role="listbox">
            @for (c of results(); track c.title; let i = $index) {
              <li
                role="option"
                class="item"
                [class.active]="i === active()"
                [attr.aria-selected]="i === active()"
                (mouseenter)="active.set(i)"
                (click)="run(c)">
                <span class="title">{{ c.title }}</span>
                <span class="group">{{ c.group }}</span>
              </li>
            } @empty {
              <li class="empty">Sin resultados</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; z-index: 2100; }
    .palette { width: min(560px, calc(100vw - 32px)); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35); overflow: hidden; }
    .search { width: 100%; padding: 14px 16px; font-size: 15px; color: var(--text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--border-color); outline: none; box-sizing: border-box; }
    .list { list-style: none; margin: 0; padding: 6px; max-height: 52vh; overflow-y: auto; }
    .item { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-primary); }
    .item.active { background: var(--bg-hover); outline: 1px solid var(--accent-color); }
    .title { overflow-wrap: anywhere; }
    .group { flex-shrink: 0; font-size: 11px; color: var(--text-secondary); }
    .empty { padding: 16px; text-align: center; font-size: 13px; color: var(--text-secondary); }
  `],
})
export class CommandPaletteComponent {
  protected ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private projectIo = inject(ProjectIoService);
  private preferences = inject(PreferencesState);
  private editorState = inject(EditorState);
  private previewState = inject(PreviewState);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  private restoreFocus: (() => void) | null = null;
  protected query = signal('');
  protected active = signal(0);

  private commands = computed<PaletteCommand[]>(() => {
    if (!this.ui.paletteOpen()) return [];
    const list: PaletteCommand[] = [
      { group: 'Proyecto', title: 'Compilar ahora', keywords: 'preview render ctrl+enter', run: () => void this.orchestrator.manualCompile() },
      { group: 'Proyecto', title: 'Guardar', keywords: 'ctrl+s', run: () => { this.editorState.saveCurrentFile(); this.orchestrator.saveSession(); void this.orchestrator.manualCompile(); } },
      { group: 'Proyecto', title: 'Mis proyectos…', keywords: 'abrir cambiar biblioteca', run: () => this.ui.projectsOpen.set(true) },
      { group: 'Proyecto', title: 'Nuevo proyecto vacío', run: () => void this.orchestrator.createProject() },
      ...PROJECT_TEMPLATES.map((t) => ({
        group: 'Plantillas', title: `Nuevo proyecto: ${t.name}`, keywords: t.description, run: () => void this.orchestrator.createProject(undefined, t.id),
      })),
      { group: 'Proyecto', title: 'Exportar proyecto (carpeta o .zip)', run: () => void this.projectIo.exportProject() },
      { group: 'Proyecto', title: 'Descargar proyecto como .zip', run: () => this.projectIo.downloadZip() },
      { group: 'Proyecto', title: 'Exportar HTML renderizado', run: () => this.projectIo.exportHtml() },
      { group: 'Ajustes', title: 'Alternar tema claro/oscuro', keywords: 'dark light', run: () => this.preferences.toggleTheme() },
      {
        group: 'Ajustes', keywords: 'formatear formato atributos orden', run: () => this.preferences.update({ sortAttributes: !this.preferences.sortAttributes() }),
        title: `Formato de Pug: ordenar atributos (${this.preferences.sortAttributes() ? 'activado' : 'desactivado'})`,
      },
      { group: 'Ajustes', title: 'Alternar auto-compilación', keywords: 'autocompile', run: () => this.preferences.update({ autoCompile: !this.preferences.autoCompile() }) },
      { group: 'Ajustes', title: 'Mostrar u ocultar Workspace', run: () => this.preferences.toggleSidebar() },
      { group: 'Ajustes', title: 'Mostrar u ocultar Data', run: () => this.preferences.toggleData() },
      { group: 'Preview', title: 'Preview: modo PDF / página impresa', keywords: 'imprimir a4', run: () => this.setDevice('PDF', 0, 0) },
      ...DEVICE_PRESETS.map((d) => ({
        group: 'Preview', title: `Preview: ${d.name} (${d.width}×${d.height})`, keywords: d.kind, run: () => this.setDevice(d.name, d.width, d.height),
      })),
    ];
    const undo = this.orchestrator.fileUndoLabel();
    if (undo) list.unshift({ group: 'Archivos', title: undo, run: () => this.orchestrator.undoFileOp() });
    const files = this.editorState.files();
    for (const path of [...files.keys()].sort()) {
      list.push({
        group: 'Archivos', title: `Abrir ${path}`, keywords: 'archivo file',
        run: () => this.editorState.openFile(path, path.split('/').pop() ?? path, getFileType(path), files.get(path) ?? ''),
      });
    }
    return list;
  });

  protected results = computed(() => filterCommands(this.commands(), this.query()).slice(0, 60));

  constructor() {
    // Ctrl/Cmd+K en fase de captura: llega antes que Monaco, que usa Ctrl+K como inicio de acordes.
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        this.ui.paletteOpen.update((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeydown, true);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKeydown, true));

    effect(() => {
      if (this.ui.paletteOpen()) {
        this.restoreFocus = rememberFocus();
        this.query.set('');
        this.active.set(0);
        setTimeout(() => this.searchInput()?.nativeElement.focus());
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  private setDevice(name: string, width: number, height: number): void {
    this.previewState.setDevice(name, width, height);
    this.preferences.update({ previewDevice: name });
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set(n ? (this.active() + 1) % n : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set(n ? (this.active() - 1 + n) % n : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = this.results()[this.active()]; if (c) this.run(c); }
    else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === 'Tab') e.preventDefault(); // el único elemento enfocable es el buscador: el foco no sale
  }

  protected close(): void {
    this.ui.paletteOpen.set(false);
  }

  protected run(c: PaletteCommand): void {
    this.close();
    c.run();
  }
}
