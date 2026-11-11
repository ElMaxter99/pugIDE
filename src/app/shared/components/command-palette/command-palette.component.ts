import { Component, ChangeDetectionStrategy, DestroyRef, Injector, afterNextRender, computed, effect, inject, signal, ElementRef, viewChild } from '@angular/core';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { PreferencesState } from '../../../core/services/preferences.state';
import { LayoutService } from '../../../core/services/layout.service';
import { DiagnosticsState } from '../../../core/state/diagnostics.state';
import { EditorState } from '../../../core/state/editor.state';
import { PreviewState } from '../../../core/state/preview.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { getFileType } from '../../../core/models/tab.model';
import { DEVICE_PRESETS } from '../../../core/utils/device-presets.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';
import { rememberFocus } from '../../../core/utils/focus-trap.util';
import { HELPERS_TEMPLATE } from '../../../core/utils/helpers.util';
import { filterCommands, highlightParts, pushRecent, withRecentsFirst } from '../../../core/utils/command-palette.util';
import { PersistenceService } from '../../../core/services/persistence.service';

interface PaletteCommand {
  /** Estable entre aperturas: es lo que se guarda en «Recientes». */
  id: string;
  title: string;
  /** Atajo de teclado, si lo tiene. */
  keys?: string;
  group: string;
  keywords?: string;
  /** Solo aparece al buscar, en «Recientes» o dentro de su sublista (no en la lista inicial). */
  sub?: 'dispositivos' | 'plantillas';
  /** Mantiene la paleta abierta al ejecutarlo (entrar en una sublista). */
  keepOpen?: boolean;
  run: () => void;
}

type Draft = Omit<PaletteCommand, 'id'> & { id?: string };

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
            aria-autocomplete="list"
            [attr.aria-activedescendant]="results().length ? 'palette-opt-' + activeIndex() : null"
            [value]="query()"
            (input)="onQuery($any($event.target).value)"
            (keydown)="onKey($event)" />
          @if (scope() !== 'root') {
            <div class="crumb"><button type="button" class="back" (click)="leaveScope()">← Todos los comandos</button><span>{{ scope() === 'plantillas' ? 'Previsualizar archivo' : 'Cambiar dispositivo' }}</span></div>
          }
          <ul class="list" id="palette-list" role="listbox">
            @for (c of results(); track c.id; let i = $index) {
              @if (sectionAt(i); as label) {
                <li class="section" role="presentation">{{ label }}</li>
              }
              <li
                role="option"
                [id]="'palette-opt-' + i"
                class="item"
                [class.active]="i === activeIndex()"
                [attr.aria-selected]="i === activeIndex()"
                (mousemove)="active.set(i)"
                (click)="run(c)">
                <span class="title">@for (p of parts(c.title); track $index) {@if (p.match) {<mark>{{ p.text }}</mark>} @else {{{ p.text }}}}</span>
                @if (c.keys) { <kbd class="keys">{{ c.keys }}</kbd> }
                <span class="group">{{ c.group }}</span>
              </li>
            } @empty {
              <li class="empty">Sin resultados</li>
            }
          </ul>
          <div class="sr-status" role="status" aria-live="polite">{{ results().length ? results().length + (results().length === 1 ? ' resultado' : ' resultados') : 'Sin resultados' }}</div>
          <div class="foot" aria-hidden="true">
            <span>↑↓ moverse · Enter ejecutar · Esc {{ scope() === 'root' ? 'cerrar' : 'volver' }}</span>
            <span>{{ allCount() }} comandos · escribe para filtrar</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; z-index: 2100; }
    .palette { position: relative; width: min(560px, calc(100vw - 32px)); background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35); overflow: hidden; }
    .search { width: 100%; padding: 14px 16px; font-size: 15px; color: var(--text-primary); background: transparent; border: 0; border-bottom: 1px solid var(--border-color); outline: none; box-sizing: border-box; }
    .list { list-style: none; margin: 0; padding: 6px; max-height: 52vh; overflow-y: auto; }
    .item { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--text-primary); }
    .item.active { background: var(--bg-hover); outline: 1px solid var(--accent-color); }
    .title { overflow-wrap: anywhere; }
    .group { flex-shrink: 0; font-size: 11px; color: var(--text-secondary); }
    .section { padding: 8px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-secondary); }
    .keys { flex-shrink: 0; margin-left: auto; font-family: var(--font-mono); font-size: 11px; padding: 1px 6px; border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-secondary); background: var(--bg-primary); }
    .sr-status { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    mark { background: transparent; color: var(--accent-color); font-weight: 600; }
    .crumb { display: flex; align-items: center; gap: 12px; padding: 6px 12px; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); }
    .back { background: none; border: 0; padding: 4px 6px; color: var(--accent-color); font: inherit; cursor: pointer; }
    .foot { display: flex; justify-content: space-between; gap: 12px; padding: 6px 12px; font-size: 11px; color: var(--text-secondary); border-top: 1px solid var(--border-color); }
    .empty { padding: 16px; text-align: center; font-size: 13px; color: var(--text-secondary); }
  `],
})
export class CommandPaletteComponent {
  protected ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private projectIo = inject(ProjectIoService);
  private analytics = inject(AnalyticsService);
  private preferences = inject(PreferencesState);
  private layout = inject(LayoutService);
  private editorState = inject(EditorState);
  private previewState = inject(PreviewState);
  private injector = inject(Injector);
  private persistence = inject(PersistenceService);
  private diagnosticsState = inject(DiagnosticsState);
  private terminalState = inject(TerminalState);

  /** Salta al siguiente/anterior problema de todo el proyecto (el F8 de Monaco solo recorre el archivo abierto). */
  private goToProblem(direction: 1 | -1): void {
    const d = this.diagnosticsState.step(direction);
    if (d) this.editorState.revealLine(d.path, d.line);
  }
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  private restoreFocus: (() => void) | null = null;
  protected query = signal('');
  protected active = signal(0);
  /** 'root': todos los comandos; sublistas: dispositivos del preview o plantillas que previsualizar. */
  protected scope = signal<'root' | 'dispositivos' | 'plantillas'>('root');
  private recent = signal<string[]>(this.persistence.loadRecentCommands());

  private commands = computed<PaletteCommand[]>(() => {
    if (!this.ui.paletteOpen()) return [];
    const list: Draft[] = [
      { group: 'Problemas', title: 'Ir al siguiente problema', keywords: 'error errores siguiente next', run: () => this.goToProblem(1) },
      { group: 'Problemas', title: 'Ir al problema anterior', keywords: 'error errores anterior previous', run: () => this.goToProblem(-1) },
      { group: 'Proyecto', title: 'Compilar ahora', keys: 'Ctrl+Enter', keywords: 'preview render ctrl+enter', run: () => void this.orchestrator.manualCompile() },
      { group: 'Proyecto', title: 'Guardar', keys: 'Ctrl+S', keywords: 'ctrl+s', run: () => this.orchestrator.saveFile() },
      { group: 'Editor', title: 'Buscar y reemplazar en el proyecto', keys: 'Ctrl+Shift+F', keywords: 'search find replace', run: () => this.ui.requestEditorCommand('pug.searchInProject') },
      { group: 'Editor', title: 'Ir a símbolo (mixins y bloques)', keys: 'Ctrl+Shift+O', keywords: 'outline symbol mixin', run: () => this.ui.requestEditorCommand('editor.action.quickOutline') },
      { group: 'Editor', title: 'Formatear Pug', keys: 'Shift+Alt+F', keywords: 'format formato indentar', run: () => this.ui.requestEditorCommand('editor.action.formatDocument') },
      { group: 'Archivos', title: 'Historial del archivo…', keywords: 'versiones restaurar volver atrás cambios diff', run: () => this.ui.historyOpen.set(true) },
      { group: 'Proyecto', title: 'Instantáneas del proyecto…', keywords: 'guardar comparar restaurar versiones copia snapshot volver atrás', run: () => this.ui.snapshotsOpen.set(true) },
      { group: 'Proyecto', title: 'Mis proyectos…', keywords: 'abrir cambiar biblioteca', run: () => this.ui.projectsOpen.set(true) },
      { group: 'Proyecto', title: 'Nuevo proyecto vacío', run: () => void this.orchestrator.createProject() },
      ...PROJECT_TEMPLATES.map((t) => ({
        group: 'Plantillas', title: `Nuevo proyecto: ${t.name}`, keywords: t.description, run: () => void this.orchestrator.createProject(undefined, t.id),
      })),
      {
        group: 'Proyecto', title: 'Añadir archivo de helpers (helpers.js)', keywords: 'funciones javascript formatDate money utilidades',
        run: () => {
          if (this.editorState.files().has('/helpers.js')) this.editorState.openFile('/helpers.js', 'helpers.js', 'javascript', this.editorState.files().get('/helpers.js') ?? '');
          else this.orchestrator.addFile('/helpers.js', 'helpers.js', HELPERS_TEMPLATE);
        },
      },
      { group: 'Proyecto', title: 'Exportar proyecto (carpeta o .zip)', run: () => void this.projectIo.exportProject() },
      { group: 'Proyecto', title: 'Descargar proyecto como .zip', run: () => this.projectIo.downloadZip() },
      { group: 'Proyecto', title: 'Exportar captura PNG del preview', keywords: 'imagen screenshot foto', run: () => void this.projectIo.exportPng() },
      { group: 'Proyecto', title: 'Exportar HTML renderizado', run: () => this.projectIo.exportHtml() },
      { group: 'Exportar', title: 'Exportar HTML para correo…', keywords: 'email mail newsletter css en línea inline gmail outlook', run: () => this.ui.emailExportOpen.set(true) },
      { group: 'Exportar', title: 'Exportar todas las plantillas (.zip)…', keywords: 'html páginas varias todas zip', run: () => this.ui.exportAllOpen.set(true) },
      { group: 'Proyecto', title: 'Guardar como plantilla…', keywords: 'plantilla propia reutilizar base cliente', run: () => this.ui.saveTemplateOpen.set(true) },
      { group: 'Idiomas', title: 'Idiomas del proyecto: por defecto y de reserva…', keywords: 'traducciones locales fallback reserva defecto idioma', run: () => this.ui.localesOpen.set(true) },
      { group: 'Idiomas', title: 'Añadir idioma…', keywords: 'traducciones locales translations es-ES idioma', run: () => this.ui.addLocaleOpen.set(true) },
      ...this.orchestrator.locales().map((code) => ({
        group: 'Idiomas', title: `Preview en ${code}${code === this.orchestrator.activeLocale() ? ' (activo)' : ''}`, keywords: 'idioma locale traducciones',
        run: () => this.orchestrator.setTranslationLocale(code),
      })),
      { group: 'Ajustes', title: 'Ver el recorrido', keywords: 'tour guía ayuda primeros pasos bienvenida', run: () => this.ui.tourOpen.set(true) },
      { group: 'Ajustes', title: 'Ver la bienvenida', keywords: 'plantillas primeros pasos empezar', run: () => this.ui.welcomeOpen.set(true) },
      { group: 'Ajustes', title: 'Atajos de teclado', keywords: 'ayuda keyboard shortcuts teclas', run: () => this.ui.shortcutsOpen.set(true) },
      { group: 'Ajustes', title: 'Alternar tema claro/oscuro', keywords: 'dark light', run: () => this.preferences.toggleTheme() },
      { group: 'Ajustes', title: 'Tema: Automático (el del sistema)', keywords: 'dark light sistema auto', run: () => this.preferences.update({ theme: 'auto' }) },
      {
        group: 'Ajustes', keywords: 'formatear formato atributos orden', run: () => this.preferences.update({ sortAttributes: !this.preferences.sortAttributes() }),
        title: `Formato de Pug: ordenar atributos (${this.preferences.sortAttributes() ? 'activado' : 'desactivado'})`,
      },
      ...(this.analytics.desktop ? [] : [{
        group: 'Ajustes', keywords: 'privacidad cookies telemetria visitas', run: () => this.analytics.toggle(),
        title: `Privacidad: analítica anónima de visitas (${this.analytics.consent() === 'granted' ? 'permitida' : 'no permitida'})`,
      }]),
      { group: 'Ajustes', title: 'Alternar auto-compilación', keywords: 'autocompile', run: () => this.preferences.update({ autoCompile: !this.preferences.autoCompile() }) },
      { group: 'Problemas', title: 'Abrir el panel Problemas', keywords: 'errores avisos lista', run: () => this.terminalState.openProblems() },
      { group: 'Ajustes', title: 'Abrir el Registro', keywords: 'terminal log consola', run: () => this.terminalState.openLog() },
      { group: 'Ajustes', title: 'Mostrar u ocultar el panel inferior', keys: 'Ctrl+J', keywords: 'problemas registro terminal log consola', run: () => this.layout.toggleBottom() },
      { group: 'Ajustes', title: 'Limpiar el Registro', keys: 'Ctrl+Shift+K', keywords: 'terminal log borrar', run: () => this.terminalState.clear() },
      { group: 'Ajustes', title: 'Mostrar u ocultar Archivos', keys: 'Ctrl+B', keywords: 'panel lateral', run: () => this.layout.toggleSidebar() },
      { group: 'Ajustes', title: 'Mostrar u ocultar Datos', keywords: 'panel lateral pestaña json árbol', run: () => this.layout.toggleData() },
      ...this.layout.layouts.map((l): Draft => ({
        id: `layout:${l.id}`, group: 'Disposición', title: `Disposición: ${l.label}`, keys: l.keys, keywords: 'layout paneles columnas tamaño vista previa editor datos pdf foco',
        run: () => this.layout.apply(l.id),
      })),
      { group: 'Disposición', title: 'Restablecer los tamaños de los paneles', keywords: 'layout paneles anchos tiradores', run: () => this.layout.resetSizes() },
      { group: 'Vista previa', title: 'Vista previa: modo PDF / página impresa', keywords: 'imprimir a4 pdf', run: () => this.setDevice('PDF', 0, 0) },
      { id: 'dispositivos', group: 'Vista previa', title: 'Cambiar dispositivo…', keywords: 'móvil tableta escritorio responsive tamaño', keepOpen: true, run: () => { this.scope.set('dispositivos'); this.query.set(''); this.active.set(0); } },
      ...DEVICE_PRESETS.map((d): Draft => ({
        id: `device:${d.name}`, group: 'Vista previa', sub: 'dispositivos', title: `Cambiar dispositivo: ${d.label} (${d.width}×${d.height})`, keywords: `${d.kind} ${d.name}`,
        run: () => this.setDevice(d.name, d.width, d.height),
      })),
    ];
    // Varias plantillas importadas: elegir cuál se renderiza (también al escribir «previsualizar»).
    const choices = this.orchestrator.previewChoices();
    if (choices.templates.length > 1 || choices.pinned) {
      list.push({ id: 'plantillas', group: 'Vista previa', title: 'Previsualizar archivo…', keywords: 'vista previa plantilla pug jade ver archivo', keepOpen: true, run: () => { this.scope.set('plantillas'); this.query.set(''); this.active.set(0); } });
      for (const t of choices.templates) {
        list.push({
          id: `preview:${t}`, group: 'Vista previa', sub: 'plantillas', keywords: 'vista previa plantilla pug jade',
          title: `Previsualizar: ${t.slice(1)}${t === choices.current ? ' (en la vista previa)' : ''}`,
          run: () => this.orchestrator.setPreviewEntry(t),
        });
      }
      if (choices.pinned) {
        list.push({
          id: 'preview-auto', group: 'Vista previa', sub: 'plantillas', keywords: 'vista previa automatica plantilla',
          title: `Vista previa automática${choices.auto ? ` (${choices.auto.slice(1)})` : ''}`, run: () => this.orchestrator.setPreviewEntry(null),
        });
      }
    }
    const undo = this.orchestrator.fileUndoLabel();
    if (undo) list.unshift({ id: 'file-undo', group: 'Archivos', title: undo, run: () => this.orchestrator.undoFileOp() });
    const files = this.editorState.files();
    for (const path of [...files.keys()].sort()) {
      list.push({
        group: 'Archivos', title: `Abrir ${path}`, keywords: 'archivo file',
        run: () => this.editorState.openFile(path, path.split('/').pop() ?? path, getFileType(path), files.get(path) ?? ''),
      });
    }
    return list.map((c) => ({ ...c, id: c.id ?? `${c.group}:${c.title}` }));
  });

  /** Cuántos comandos tiene la paleta sin contar las sublistas. */
  protected allCount = computed(() => this.commands().filter((c) => !c.sub).length);

  private recentCount = computed(() => (this.scope() === 'root' && !this.query().trim() ? withRecentsFirst(this.visibleRoot(), this.recent()).recentCount : 0));

  /** Sin consulta, la lista inicial no incluye las entradas de sublista (salvo si son recientes). */
  private visibleRoot = computed(() => {
    const all = this.commands();
    const recent = new Set(this.recent());
    return all.filter((c) => !c.sub || recent.has(c.id));
  });

  protected results = computed(() => {
    const q = this.query().trim();
    if (this.scope() !== 'root') return filterCommands(this.commands().filter((c) => c.sub === this.scope()), q);
    if (q) return filterCommands(this.commands(), q).slice(0, 60);
    return withRecentsFirst(this.visibleRoot(), this.recent()).list.slice(0, 60);
  });

  /** Título de sección que se pinta antes del resultado `i` (solo en la lista inicial con recientes). */
  protected sectionAt(i: number): string | null {
    const n = this.recentCount();
    if (!n) return null;
    return i === 0 ? 'Recientes' : i === n ? 'Todos los comandos' : null;
  }

  protected parts(title: string) {
    return highlightParts(title, this.query());
  }

  protected leaveScope(): void {
    this.scope.set('root');
    this.query.set('');
    this.active.set(0);
    this.searchInput()?.nativeElement.focus();
  }

  /** Elemento resaltado, siempre dentro de los resultados (al filtrar, el índice guardado puede quedar fuera). */
  protected activeIndex = computed(() => Math.max(0, Math.min(this.active(), this.results().length - 1)));

  constructor() {
    // Ctrl/Cmd+K en fase de captura: llega antes que Monaco, que usa Ctrl+K como inicio de acordes.
    const onKeydown = (e: KeyboardEvent) => {
      // Con la paleta abierta pero el foco aún fuera del buscador (los primeros ms tras Ctrl+K), las teclas no
      // deben llegar al editor: se redirigen a la paleta.
      if (this.ui.paletteOpen() && e.target !== this.searchInput()?.nativeElement && !(e.ctrlKey || e.metaKey)) {
        e.stopPropagation();
        if (e.key.length === 1) {
          e.preventDefault();
          this.onQuery(this.query() + e.key);
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          this.onBackspace(this.query());
        } else this.onKey(e);
        return;
      }
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
        // El foco va al buscador en cuanto se pinta, para no perder las primeras teclas (Ctrl+K y escribir de seguido).
        afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
      } else {
        this.scope.set('root');
        this.query.set(''); // la consulta se reinicia al cerrar, no al abrir (así no pisa lo ya escrito)
        this.active.set(0);
        if (this.restoreFocus) {
          this.restoreFocus();
          this.restoreFocus = null;
        }
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
    if (e.key === 'ArrowDown') { e.preventDefault(); this.active.set(n ? (this.activeIndex() + 1) % n : 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set(n ? (this.activeIndex() - 1 + n) % n : 0); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = this.results()[this.activeIndex()]; if (c) this.run(c); }
    else if (e.key === 'Escape') { e.preventDefault(); if (this.scope() !== 'root') this.leaveScope(); else this.close(); }
    else if (e.key === 'Backspace' && !this.query() && this.scope() !== 'root') { e.preventDefault(); this.leaveScope(); }
    else if (e.key === 'Tab') e.preventDefault(); // el único elemento enfocable es el buscador: el foco no sale
  }

  protected close(): void {
    this.ui.paletteOpen.set(false);
  }

  private onBackspace(query: string): void {
    if (!query && this.scope() !== 'root') this.leaveScope();
    else this.onQuery(query.slice(0, -1));
  }

  protected run(c: PaletteCommand): void {
    if (c.keepOpen) { c.run(); return; }
    this.recent.set(pushRecent(this.recent(), c.id));
    this.persistence.saveRecentCommands(this.recent());
    this.close();
    c.run();
  }
}
