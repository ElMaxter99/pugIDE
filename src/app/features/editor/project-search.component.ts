import { Component, ChangeDetectionStrategy, ElementRef, computed, output, signal, input, viewChild } from '@angular/core';
import { ReplaceResult, SearchMatch, highlightMatch, replaceInProject, searchProject } from '../../core/utils/pug-editor.util';

/** Búsqueda y reemplazo en todo el proyecto (Ctrl+Shift+F). No toca Monaco: avisa al editor con eventos. */
@Component({
  selector: 'app-project-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
      @if (isOpen()) {
        <div class="search-panel" role="search">
          <div class="search-bar">
            <input #searchInput class="search-input" data-testid="project-search" type="text" placeholder="Buscar en el proyecto (Enter: primer resultado, Esc: cerrar)"
              [value]="query()" (input)="query.set($any($event.target).value)" (keydown)="onSearchKey($event)" />
            <button type="button" class="opt" [class.on]="caseSensitive()" title="Distinguir mayúsculas" aria-label="Distinguir mayúsculas" (click)="caseSensitive.set(!caseSensitive())">Aa</button>
            <button type="button" class="opt" [class.on]="wholeWord()" title="Palabra completa" aria-label="Palabra completa" (click)="wholeWord.set(!wholeWord())">ab</button>
            <button type="button" class="opt" [class.on]="regex()" title="Expresión regular" aria-label="Expresión regular" (click)="regex.set(!regex())">.*</button>
            <button type="button" class="opt" title="Cerrar búsqueda" aria-label="Cerrar búsqueda" (click)="close()">&times;</button>
          </div>
          <div class="replace-bar">
            <input class="search-input" data-testid="project-replace" type="text" placeholder="Reemplazar por…"
              [value]="replaceText()" (input)="replaceText.set($any($event.target).value)" (keydown)="onReplaceKey($event)" />
            <button type="button" class="replace-btn" data-testid="replace-all" [disabled]="!results().length"
              title="Reemplaza todas las coincidencias en el proyecto (Ctrl+Z las deshace en cada archivo)" (click)="replaceAll()">Reemplazar todo</button>
          </div>
          <div class="search-summary">{{ results().length }} resultados en {{ groups().length }} archivos</div>
          <div class="search-results">
            @for (g of groups(); track g.path) {
              <div class="result-file">{{ g.path }}</div>
              @for (m of g.matches; track m.line + ':' + m.column) {
                <button type="button" class="result-line" (click)="open(m)">
                  <span class="ln">{{ m.line }}</span>
                  <span class="txt">{{ highlight(m).pre }}<mark>{{ highlight(m).hit }}</mark>{{ highlight(m).post }}</span>
                </button>
              }
            }
          </div>
        </div>
      }
  `,
  styles: [`
    :host { display: block; }
    .search-panel { border-bottom: 1px solid var(--border-color); background: var(--bg-surface); max-height: 40%; display: flex; flex-direction: column; }
    .search-bar { display: flex; gap: 4px; padding: 6px 8px; }
    .search-input { flex: 1; min-width: 0; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 4px 8px; font: inherit; font-size: 13px; }
    .opt { background: transparent; color: var(--text-secondary); border: 1px solid transparent; border-radius: 4px; padding: 0 8px; cursor: pointer; font-size: 12px; }
    .opt.on { color: var(--text-primary); border-color: var(--accent-color); }
    .replace-bar { display: flex; gap: 4px; padding: 0 8px 6px; }
    .replace-btn { background: transparent; color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 0 10px; cursor: pointer; font-size: 12px; white-space: nowrap; }
    .replace-btn:hover:not(:disabled) { border-color: var(--accent-color); }
    .replace-btn:disabled { opacity: 0.5; cursor: default; }
    .search-summary { padding: 0 10px 4px; font-size: 11px; color: var(--text-secondary); }
    .search-results { overflow: auto; font-size: 12px; }
    .result-file { padding: 4px 10px; color: var(--text-primary); font-weight: 600; }
    .result-line { display: flex; gap: 8px; width: 100%; text-align: left; background: transparent; border: 0; color: var(--text-secondary); padding: 2px 10px 2px 18px; cursor: pointer; font-family: var(--font-mono); font-size: 12px; }
    .result-line:hover { background: rgba(255, 255, 255, 0.06); }
    .result-line .ln { min-width: 28px; color: var(--text-tertiary); }
    .result-line .txt { white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    mark { background: rgba(221, 183, 255, 0.35); color: inherit; }
  `],
})
export class ProjectSearchComponent {
  /** Archivos del proyecto con lo que se está escribiendo. */
  readonly files = input.required<() => ReadonlyMap<string, string>>();
  readonly openMatch = output<{ path: string; line: number; column: number }>();
  /** Reemplazos calculados; el editor los aplica a sus modelos y llama a `refresh()`. */
  readonly replaced = output<ReplaceResult[]>();
  readonly closed = output<void>();

  protected isOpen = signal(false);
  protected query = signal('');
  protected caseSensitive = signal(false);
  protected wholeWord = signal(false);
  protected regex = signal(false);
  protected replaceText = signal('');
  /** Los archivos viven en un Map mutable: se incrementa para recalcular los resultados. */
  private revision = signal(0);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private options = () => ({ caseSensitive: this.caseSensitive(), wholeWord: this.wholeWord(), regex: this.regex() });

  protected results = computed(() => {
    this.revision();
    if (!this.isOpen()) return [];
    return searchProject(this.files()(), this.query(), this.options());
  });

  protected groups = computed(() => {
    const groups: { path: string; matches: SearchMatch[] }[] = [];
    for (const m of this.results()) {
      const last = groups[groups.length - 1];
      if (last && last.path === m.path) last.matches.push(m);
      else groups.push({ path: m.path, matches: [m] });
    }
    return groups;
  });

  /** Abre el panel; `selected` (una línea seleccionada en el editor) pasa a ser la búsqueda. */
  show(selected?: string): void {
    if (selected) this.query.set(selected);
    this.isOpen.set(true);
    setTimeout(() => {
      this.searchInput()?.nativeElement.focus();
      this.searchInput()?.nativeElement.select();
    });
  }

  refresh(): void {
    this.revision.update((n) => n + 1);
  }

  protected close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  protected open(m: SearchMatch): void {
    this.openMatch.emit({ path: m.path, line: m.line, column: m.column });
  }

  protected highlight(m: SearchMatch) {
    return highlightMatch(m);
  }

  protected onSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.close();
    if (e.key === 'Enter') {
      const first = this.results()[0];
      if (first) this.open(first);
    }
  }

  protected onReplaceKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.close();
    if (e.key === 'Enter') this.replaceAll();
  }

  protected replaceAll(): void {
    const query = this.query();
    if (!query) return;
    this.replaced.emit(replaceInProject(this.files()(), query, this.replaceText(), this.options()));
  }
}
