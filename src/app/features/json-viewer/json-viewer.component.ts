import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from '../../core/state/terminal.state';
import { ContextMenuComponent } from '../../shared/components/context-menu/context-menu.component';
import { ContextMenuAction } from '../../core/models/index';
import {
  JsonRow, buildViewTree, containerIds, countNodes, findKeyUsage, flattenView, highlightMatches, jsonLines, leafText, nodeJson, parseJsonText, pathOf, pendingCount,
} from '../../core/utils/json-view.util';
import { listLocales, parseTranslations } from '../../core/utils/locales.util';

const ROW_H = 30;
const OVERSCAN = 8;
/// Por encima de este número de nodos, el árbol arranca plegado a partir del primer nivel.
const BIG_TREE = 400;
const LOCALE_PATH_RE = /^\/locales\/([^/]+)\/translations\.json$/;

/**
 * Visor de JSON en árbol (P-17), al estilo del de Firefox: dos columnas (clave y valor), triángulos, recuentos, colores por
 * tipo y filtro al instante. En los archivos de idioma añade «sin traducir», «falta» y «Ver en la plantilla». Solo lectura:
 * «Editar en el código» salta a la línea. Pinta solo las filas visibles, así que un JSON grande no congela la página.
 */
@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [ContextMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viewer" data-testid="json-viewer">
      @if (parsed(); as p) {
        @if (p.ok) {
          <div class="toolbar">
            <label class="filter">
              <span class="material-symbols-outlined" aria-hidden="true">search</span>
              <input #filterInput type="search" class="filter-input" placeholder="Filtrar JSON" aria-label="Filtrar JSON" data-testid="json-filter"
                [value]="filter()" (input)="filter.set($any($event.target).value)" />
              @if (filterActive()) { <span class="filter-count" role="status" data-testid="json-matches">{{ matchesLabel() }}</span> }
            </label>
            @if (isLocale() && pending() > 0) {
              <button type="button" class="chip" [class.on]="onlyPending()" [attr.aria-pressed]="onlyPending()" data-testid="json-pending" (click)="onlyPending.set(!onlyPending())">Solo sin traducir ({{ pending() }})</button>
            }
            <button type="button" class="tool" (click)="collapseAll()">Contraer todo</button>
            <button type="button" class="tool" (click)="expandAll()">Expandir todo</button>
            <button type="button" class="tool" (click)="copy(text(), 'JSON copiado')">Copiar JSON</button>
          </div>
          <div class="head" aria-hidden="true"><div class="col-key">Clave</div><div class="col-val">Valor</div></div>
          <div #scroller class="rows" role="treegrid" [attr.aria-label]="'Árbol de ' + fileName()" [attr.aria-rowcount]="view().rows.length"
            data-testid="json-tree" (scroll)="onScroll()" (keydown)="onKeydown($event)">
            @if (view().rows.length === 0) {
              <div class="empty">{{ filterActive() ? 'Ninguna clave ni valor coincide.' : 'El archivo está vacío.' }}</div>
            }
            <div class="spacer" [style.height.px]="view().rows.length * rowH">
              @for (r of slice(); track r.row.node.id) {
                <div class="row" role="row" [style.top.px]="r.index * rowH" [attr.data-id]="r.row.node.id" [attr.data-path]="path_(r.row)"
                  [attr.aria-level]="r.row.depth + 1" [attr.aria-rowindex]="r.index + 1" [attr.aria-expanded]="r.row.hasChildren ? r.row.expanded : null"
                  [attr.tabindex]="r.row.node.id === focusedId() ? 0 : -1" [class.sel]="r.row.node.id === focusedId()" [class.missing]="r.row.node.status === 'missing'"
                  (click)="onRowClick(r.row)" (contextmenu)="onRowMenu($event, r.row)" (focus)="focusedId.set(r.row.node.id)">
                  <div class="cell key" role="gridcell" [style.padding-left.px]="12 + r.row.depth * 18">
                    @if (r.row.hasChildren) {
                      <span class="material-symbols-outlined tri" aria-hidden="true">{{ r.row.expanded ? 'keyboard_arrow_down' : 'chevron_right' }}</span>
                    } @else { <span class="tri-gap"></span> }
                    <span class="k">@for (p of parts(r.row.node.key, r.row.matchKey); track $index) {@if (p.match) {<mark>{{ p.text }}</mark>} @else {{{ p.text }}}}</span>
                    @if (r.row.count !== null) { <span class="cnt">{{ r.row.node.kind === 'array' ? '[' + r.row.count + ']' : '{' + r.row.count + '}' }}</span> }
                  </div>
                  <div class="cell val" role="gridcell">
                    @if (!r.row.hasChildren && r.row.count === null) {
                      <span [class]="'v ' + r.row.node.kind">@if (r.row.node.kind === 'string') {"@for (p of parts(r.row.node.value, r.row.matchValue); track $index) {@if (p.match) {<mark>{{ p.text }}</mark>} @else {{{ p.text }}}}"} @else {{{ shown(r.row.node.value) }}}</span>
                      @if (r.row.node.status === 'missing') { <span class="badge neutral">falta</span> }
                      @else if (r.row.node.kind === 'string' && r.row.node.value === '' && isLocale()) { <span class="badge warn">sin traducir</span> }
                    }
                  </div>
                </div>
              }
            </div>
          </div>
          <div class="sr-live" role="status" aria-live="polite">{{ announce() }}</div>
        } @else {
          <div class="error" role="alert" data-testid="json-error">
            <strong>El JSON no es válido.</strong>
            <p>{{ p.message }} (línea {{ p.line }})</p>
            <button type="button" class="tool" (click)="editAt.emit(p.line)">Ir al error</button>
          </div>
        }
      }
      <app-context-menu [items]="menuItems()" [isOpen]="menuOpen()" [positionX]="menuX()" [positionY]="menuY()" ariaLabel="Acciones de la fila" (actionSelected)="onMenuAction($event)" />
    </div>
  `,
  styles: [`
    :host { display: block; position: absolute; inset: 0; background: var(--bg-primary); }
    .viewer { display: flex; flex-direction: column; height: 100%; color: var(--text-primary); font-size: 13px; }
    .toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; }
    .filter { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); }
    .filter:focus-within { border-color: var(--accent-color); }
    .filter .material-symbols-outlined { font-size: 16px; color: var(--text-secondary); }
    .filter-input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; }
    .filter-count { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .tool, .chip { padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: none; color: var(--text-secondary); font: inherit; font-size: 12px; cursor: pointer; }
    .tool:hover, .chip:hover { background: var(--bg-hover); color: var(--text-primary); }
    .chip { border-radius: 999px; color: var(--warning-color); border-color: var(--warning-color); }
    .chip.on { background: var(--bg-active); }
    .head { display: flex; height: 28px; align-items: center; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); background: var(--bg-surface-container-low); }
    .col-key { width: 40%; min-width: 220px; padding-left: 34px; box-sizing: border-box; }
    .col-val { padding-left: 14px; }
    .rows { flex: 1; min-height: 0; overflow: auto; position: relative; font-family: var(--font-mono); font-size: 12.5px; }
    .spacer { position: relative; min-width: 100%; width: max-content; }
    .row { position: absolute; left: 0; right: 0; height: 30px; display: flex; align-items: center; border-bottom: 1px solid var(--border-subtle); cursor: default; outline: none; }
    .row:hover { background: var(--bg-hover); }
    .row.sel { background: var(--bg-surface-container-highest); }
    .row:focus-visible { outline: 2px solid var(--accent-color); outline-offset: -2px; }
    .cell.key { width: 40%; min-width: 220px; box-sizing: border-box; display: flex; align-items: center; gap: 4px; height: 100%; border-right: 1px solid var(--border-subtle); overflow: hidden; white-space: nowrap; }
    .cell.val { padding-left: 14px; display: flex; align-items: center; gap: 8px; white-space: pre; }
    .tri { font-size: 16px; color: var(--text-secondary); }
    .tri-gap { width: 16px; display: inline-block; flex-shrink: 0; }
    .cnt { color: var(--text-secondary); font-size: 12px; }
    .v.string { color: var(--success-color); }
    .v.number { color: var(--secondary-color); }
    .v.boolean, .v.null { color: var(--warning-color); }
    .row.missing .k, .row.missing .v { color: var(--text-secondary); font-style: italic; }
    .badge { font-size: 11px; border: 1px solid; border-radius: 999px; padding: 0 8px; font-family: var(--font-family); }
    .badge.warn { color: var(--warning-color); border-color: var(--warning-color); }
    .badge.neutral { color: var(--text-secondary); border-color: var(--text-secondary); }
    mark { background: rgba(250, 188, 78, 0.35); color: inherit; border-radius: 2px; }
    .empty { padding: 24px; text-align: center; color: var(--text-secondary); font-family: var(--font-family); }
    .error { padding: 24px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .error p { margin: 0; color: var(--error-color); }
    .sr-live { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `],
})
export class JsonViewerComponent implements OnDestroy {
  /** Ruta del archivo (`/locales/es-ES/translations.json`). */
  readonly path = input.required<string>();
  /** Texto actual del archivo. */
  readonly text = input.required<string>();
  /** Archivos del proyecto: de ahí salen el idioma de referencia y dónde se usa cada clave. */
  readonly files = input.required<Map<string, string>>();
  /** Pide pasar a «Código» en esa línea. */
  readonly editAt = output<number>();

  private readonly editorState = inject(EditorState);
  private readonly terminal = inject(TerminalState);

  protected readonly rowH = ROW_H;
  protected readonly filter = signal('');
  protected readonly onlyPending = signal(false);
  protected readonly collapsed = signal<ReadonlySet<string>>(new Set());
  protected readonly focusedId = signal<string | null>(null);
  protected readonly announce = signal('');
  private readonly scrollTop = signal(0);
  private readonly viewportH = signal(600);
  protected readonly menuOpen = signal(false);
  protected readonly menuX = signal(0);
  protected readonly menuY = signal(0);
  protected readonly menuItems = signal<ContextMenuAction[]>([]);
  private menuRow: JsonRow | null = null;

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private resizeObserver: ResizeObserver | null = null;
  private initializedFor: string | null = null;

  protected readonly fileName = computed(() => this.path().split('/').slice(-2).join('/'));
  protected readonly localeCode = computed(() => LOCALE_PATH_RE.exec(this.path())?.[1] ?? null);
  protected readonly isLocale = computed(() => this.localeCode() !== null);
  protected readonly parsed = computed(() => parseJsonText(this.text()));

  /** El mismo archivo del primer idioma (si este no lo es): de ahí salen las claves que faltan. */
  private readonly reference = computed(() => {
    const code = this.localeCode();
    if (!code) return undefined;
    const first = listLocales(this.files().keys()).find((c) => c !== code);
    return first ? parseTranslations(this.files().get(`/locales/${first}/translations.json`) ?? '').value : undefined;
  });

  protected readonly tree = computed(() => {
    const p = this.parsed();
    return p.ok ? buildViewTree(p.value, this.reference()) : [];
  });
  protected readonly pending = computed(() => pendingCount(this.tree()));
  protected readonly filterActive = computed(() => this.filter().trim() !== '' || this.onlyPending());
  protected readonly view = computed(() => flattenView(this.tree(), this.collapsed(), { filter: this.filter(), onlyPending: this.onlyPending() }));
  protected readonly matchesLabel = computed(() => {
    const n = this.view().matches;
    return n === 0 ? 'sin coincidencias' : `${n} ${n === 1 ? 'coincidencia' : 'coincidencias'}`;
  });

  protected readonly slice = computed(() => {
    const rows = this.view().rows;
    const start = Math.max(0, Math.floor(this.scrollTop() / ROW_H) - OVERSCAN);
    const end = Math.min(rows.length, Math.ceil((this.scrollTop() + this.viewportH()) / ROW_H) + OVERSCAN);
    return rows.slice(start, end).map((row, i) => ({ row, index: start + i }));
  });

  constructor() {
    // Al abrir otro archivo (o uno muy grande) se parte de un plegado razonable y sin filtros.
    effect(() => {
      const path = this.path();
      const tree = this.tree();
      untracked(() => {
        if (this.initializedFor === path) return;
        this.initializedFor = path;
        this.filter.set('');
        this.onlyPending.set(false);
        this.focusedId.set(null);
        this.collapsed.set(new Set(countNodes(tree) > BIG_TREE ? containerIds(tree, Infinity).filter((id) => id.includes('/')) : []));
      });
    });
    afterNextRender(() => {
      const el = this.scroller()?.nativeElement;
      if (!el) return;
      this.viewportH.set(el.clientHeight || 600);
      this.resizeObserver = new ResizeObserver(() => this.viewportH.set(el.clientHeight || 600));
      this.resizeObserver.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected path_(row: JsonRow): string { return pathOf(row.node); }
  protected shown(v: unknown): string { return String(v); }
  /** Trozos de un texto con lo que coincide con el filtro marcado (si esta fila coincide). */
  protected parts(text: unknown, matches: boolean): { text: string; match: boolean }[] {
    return matches ? highlightMatches(String(text), this.filter()) : [{ text: String(text), match: false }];
  }

  protected onScroll(): void {
    this.scrollTop.set(this.scroller()?.nativeElement.scrollTop ?? 0);
  }

  protected collapseAll(): void {
    this.collapsed.set(new Set(containerIds(this.tree())));
    this.announce.set('Todo contraído');
  }

  protected expandAll(): void {
    this.collapsed.set(new Set());
    this.announce.set('Todo expandido');
  }

  private toggle(row: JsonRow): void {
    if (!row.hasChildren || this.filterActive()) return;
    const next = new Set(this.collapsed());
    if (next.has(row.node.id)) next.delete(row.node.id); else next.add(row.node.id);
    this.collapsed.set(next);
  }

  protected onRowClick(row: JsonRow): void {
    this.focusedId.set(row.node.id);
    this.toggle(row);
  }

  protected async copy(text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.announce.set(message);
      this.terminal.addEntry('info', 'JSON', message + '.', undefined, true);
    } catch {
      this.announce.set('No se pudo copiar');
    }
  }

  // --- Teclado: ↑/↓ mueven, → despliega, ← pliega, Intro alterna, / enfoca el filtro, Mayús+F10 abre el menú ---
  protected onKeydown(event: KeyboardEvent): void {
    const rows = this.view().rows;
    if (!rows.length) return;
    const at = Math.max(0, rows.findIndex((r) => r.node.id === this.focusedId()));
    const row = rows[at];
    const move = (to: number): void => {
      const i = Math.max(0, Math.min(rows.length - 1, to));
      event.preventDefault();
      this.focusRow(rows[i].node.id, i);
    };
    switch (event.key) {
      case 'ArrowDown': move(at + 1); break;
      case 'ArrowUp': move(at - 1); break;
      case 'Home': move(0); break;
      case 'End': move(rows.length - 1); break;
      case 'PageDown': move(at + Math.floor(this.viewportH() / ROW_H)); break;
      case 'PageUp': move(at - Math.floor(this.viewportH() / ROW_H)); break;
      case 'ArrowRight':
        if (row.hasChildren && !row.expanded) { event.preventDefault(); this.toggle(row); } else if (row.hasChildren) move(at + 1);
        break;
      case 'ArrowLeft':
        if (row.hasChildren && row.expanded && !this.filterActive()) { event.preventDefault(); this.toggle(row); }
        else if (row.depth > 0) {
          const parent = this.parentIndex(rows, at);
          if (parent >= 0) move(parent);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggle(row);
        break;
      case '/':
        event.preventDefault();
        this.filterInput()?.nativeElement.focus();
        break;
      case 'ContextMenu':
      case 'F10': {
        if (event.key === 'F10' && !event.shiftKey) break;
        event.preventDefault();
        const el = this.scroller()?.nativeElement.querySelector<HTMLElement>(`[data-id="${CSS.escape(row.node.id)}"]`);
        const r = el?.getBoundingClientRect();
        this.openMenu(row, (r?.left ?? 0) + 40, (r?.bottom ?? 0));
        break;
      }
    }
  }

  private parentIndex(rows: JsonRow[], at: number): number {
    for (let i = at - 1; i >= 0; i--) if (rows[i].depth < rows[at].depth) return i;
    return -1;
  }

  /** Lleva la fila a la vista (el árbol pinta solo las visibles) y le da el foco. */
  private focusRow(id: string, index: number): void {
    this.focusedId.set(id);
    const el = this.scroller()?.nativeElement;
    if (el) {
      const top = index * ROW_H;
      if (top < el.scrollTop) el.scrollTop = top;
      else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
      this.scrollTop.set(el.scrollTop);
    }
    setTimeout(() => this.scroller()?.nativeElement.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.focus());
  }

  // --- Menú de la fila ---
  protected onRowMenu(event: MouseEvent, row: JsonRow): void {
    event.preventDefault();
    this.focusedId.set(row.node.id);
    this.openMenu(row, event.clientX, event.clientY);
  }

  private usage(row: JsonRow): { path: string; line: number } | null {
    return this.isLocale() && !row.hasChildren ? findKeyUsage(this.files(), pathOf(row.node)) : null;
  }

  private openMenu(row: JsonRow, x: number, y: number): void {
    this.menuRow = row;
    const items: ContextMenuAction[] = [
      { label: `Copiar ruta (${pathOf(row.node)})`, icon: 'content_copy', action: 'copyPath' },
      { label: 'Copiar valor', icon: 'content_copy', action: 'copyValue' },
      { label: 'Editar en el código', icon: 'code', action: 'edit', disabled: row.node.status === 'missing' },
    ];
    const use = this.usage(row);
    if (use) items.push({ label: '', action: '', separator: true }, { label: `Ver en la plantilla (${use.path.split('/').pop()}:${use.line})`, icon: 'description', action: 'template' });
    this.menuItems.set(items);
    this.menuX.set(x);
    this.menuY.set(y);
    this.menuOpen.set(true);
  }

  protected onMenuAction(action: string): void {
    this.menuOpen.set(false);
    const row = this.menuRow;
    this.menuRow = null;
    if (!row || !action) return;
    const node = row.node;
    if (action === 'copyPath') void this.copy(pathOf(node), 'Ruta copiada');
    else if (action === 'copyValue') void this.copy(node.children ? nodeJson(node) : leafText(node), 'Valor copiado');
    else if (action === 'edit') {
      const line = jsonLines(this.text()).get(node.id);
      if (line) this.editAt.emit(line);
    } else if (action === 'template') {
      const use = this.usage(row);
      if (use) this.editorState.revealLine(use.path, use.line);
    }
  }
}
