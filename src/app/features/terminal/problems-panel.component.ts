import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { DiagnosticsState } from '../../core/state/diagnostics.state';
import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from '../../core/state/terminal.state';
import { AiService } from '../../core/services/ai.service';
import { UiState } from '../../core/state/ui.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { ProblemRow, SnippetLine, countProblems, snippetLines, stepRow } from '../../core/utils/diagnostics.util';

type Severity = 'all' | 'error' | 'warning';

interface RowView extends ProblemRow {
  snippet: SnippetLine[];
  file: string;
}

/**
 * Panel «Problemas»: todos los problemas del proyecto en un solo sitio, con filtros, navegación (anterior / siguiente),
 * la explicación de cada uno, el fragmento de código con su línea marcada y el arreglo con un clic cuando lo hay.
 */
@Component({
  selector: 'app-problems-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar" role="toolbar" aria-label="Filtros y navegación de problemas">
      <div class="filters" role="group" aria-label="Filtrar por gravedad">
        <button type="button" class="chip" data-testid="pb-filter-all" [attr.aria-pressed]="severity() === 'all'" (click)="severity.set('all')">Todos · {{ counts().total }}</button>
        <button type="button" class="chip" data-testid="pb-filter-error" [attr.aria-pressed]="severity() === 'error'" (click)="severity.set('error')">Errores · {{ counts().errors }}</button>
        <button type="button" class="chip" data-testid="pb-filter-warning" [attr.aria-pressed]="severity() === 'warning'" (click)="severity.set('warning')">Avisos · {{ counts().warnings }}</button>
      </div>
      <label class="only-open">
        <input type="checkbox" data-testid="pb-only-open" [checked]="onlyOpen()" (change)="onlyOpen.set($any($event.target).checked)" />
        Solo el archivo abierto
      </label>
      <span class="spacer"></span>
      <span class="position" data-testid="pb-position" aria-live="polite">{{ positionText() }}</span>
      <button type="button" class="nav" data-testid="pb-prev" [disabled]="visible().length === 0" title="Problema anterior (Mayús+F8)" (click)="step(-1)">Anterior <kbd>Mayús+F8</kbd></button>
      <button type="button" class="nav" data-testid="pb-next" [disabled]="visible().length === 0" title="Problema siguiente (F8)" (click)="step(1)">Siguiente <kbd>F8</kbd></button>
    </div>
    <ul class="list" aria-label="Problemas del proyecto" data-testid="pb-list">
      @for (r of visible(); track r.id) {
        <li class="diag-row" [class.warning]="r.severity === 'warning'" [class.selected]="r.id === diagnostics.selectedId()" [attr.aria-current]="r.id === diagnostics.selectedId() ? 'true' : null" (click)="select(r, false)">
          <div class="head">
            <span aria-hidden="true" class="material-symbols-outlined sev" [class.warn]="r.severity === 'warning'">{{ r.severity === 'error' ? 'error' : 'warning' }}</span>
            <span class="title">{{ r.message }}</span>
            @if (r.path) { <span class="where">{{ r.file }}:{{ r.line }}</span> }
            <div class="actions">
              @if (r.fix; as fix) {
                <button type="button" class="act primary diag-fix" (click)="fixIt($event, fix)">{{ fix.label }}</button>
              }
              @if (r.path) {
                <button type="button" class="act diag-go" (click)="goTo($event, r)">Ir al error<span class="sr"> · {{ r.file }}:{{ r.line }}</span></button>
              }
              <button type="button" class="act" (click)="copy($event, r)">{{ copiedId() === r.id ? 'Copiado' : 'Copiar mensaje' }}</button>
              @if (ai.available && r.severity === 'error') {
                <button type="button" class="act diag-ai" data-testid="pb-ai" (click)="askAi($event, r)"><span aria-hidden="true" class="material-symbols-outlined ai-icon">neurology</span>Proponer arreglo con IA…</button>
              }
            </div>
          </div>
          @if (r.hint || r.snippet.length) {
            <div class="detail">
              @if (r.hint) { <p class="why">{{ r.hint }}</p> }
              @if (r.snippet.length) {
                <div class="snip">
                  <pre class="code" aria-label="Código cercano"><code>@for (l of r.snippet; track l.n) {<span class="ln" [class.mark]="l.marked"><span class="num">{{ l.n }}</span><span class="txt">{{ l.text }}</span></span>}</code></pre>
                  @if (r.path && r.line) {
                    <button type="button" class="expand-link" [attr.aria-expanded]="isExpanded(r.id)" (click)="toggleSnippet($event, r.id)">{{ isExpanded(r.id) ? 'Ver menos' : 'Ver más' }}</button>
                  }
                </div>
              }
            </div>
          }
        </li>
      } @empty {
        <li class="empty">
          @if (counts().total === 0) { Sin problemas en el proyecto. }
          @else { Ningún problema coincide con el filtro. }
        </li>
      }
    </ul>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 6px 12px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); }
    .filters { display: inline-flex; gap: 4px; }
    .chip, .nav { min-height: 24px; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 12px; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; cursor: pointer; }
    .chip[aria-pressed='true'] { background: var(--bg-active); border-color: var(--accent-color); color: var(--accent-color); }
    .nav { border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
    .nav:disabled { opacity: 0.5; cursor: default; }
    .nav kbd { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); }
    .only-open { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text-primary); }
    .spacer { flex: 1 1 auto; }
    .position { white-space: nowrap; }
    .list { list-style: none; margin: 0; padding: 4px 0; overflow: auto; flex: 1 1 auto; min-height: 96px; font-size: 12px; }
    .diag-row { display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border-color); border-left: 3px solid transparent; color: var(--text-primary); cursor: default; }
    .diag-row.selected { background: var(--bg-hover); border-left-color: var(--error-color); }
    .diag-row.warning.selected { border-left-color: var(--warning-color); }
    .head { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 8px; }
    .sev { font-size: 18px; color: var(--error-color); }
    .sev.warn { color: var(--warning-color); }
    .title { flex: 1 1 220px; min-width: 0; font-weight: 600; font-size: 13px; overflow-wrap: anywhere; }
    .where { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); white-space: nowrap; }
    .why { margin: 0; color: var(--text-secondary); line-height: 1.45; overflow-wrap: anywhere; white-space: pre-wrap; }
    .code { margin: 0; padding: 6px 0; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-family: var(--font-mono); font-size: 12px; overflow-x: auto; }
    .ln { display: flex; gap: 12px; padding: 0 10px; white-space: pre; }
    .ln.mark { background: rgba(255, 82, 82, 0.14); box-shadow: inset 3px 0 0 var(--error-color); }
    .diag-row.warning .ln.mark { background: rgba(249, 226, 175, 0.14); box-shadow: inset 3px 0 0 var(--warning-color); }
    .num { min-width: 2ch; text-align: right; color: var(--text-secondary); user-select: none; }
    /* Los botones van en la línea del título, a la derecha: con cualquier altura de panel siguen a la vista (P-20). */
    .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
    .detail { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px 16px; }
    .detail .why { flex: 1 1 320px; min-width: 0; }
    .snip { flex: 0 1 440px; min-width: 0; max-width: 100%; display: flex; flex-direction: column; gap: 2px; }
    .expand-link { align-self: flex-start; padding: 0; border: 0; background: none; color: var(--accent-color); font: inherit; font-size: 11px; cursor: pointer; text-decoration: underline; }
    .sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .ai-icon { font-size: 14px; vertical-align: -2px; margin-right: 4px; color: var(--accent-color); }
    .act { min-height: 24px; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; cursor: pointer; }
    .act:hover { background: var(--bg-hover); }
    .act.primary { background: var(--accent-color); border-color: var(--accent-color); color: var(--on-accent, var(--bg-primary)); font-weight: 600; }
    .empty { padding: 20px 12px; text-align: center; color: var(--text-secondary); }
  `],
})
export class ProblemsPanelComponent {
  protected diagnostics = inject(DiagnosticsState);
  protected terminal = inject(TerminalState);
  private editorState = inject(EditorState);
  private orchestrator = inject(OrchestratorService);
  protected ai = inject(AiService);
  private ui = inject(UiState);

  protected severity = signal<Severity>('all');
  protected onlyOpen = signal(false);
  /** «Proponer arreglo con IA…» (P-31): abre el asistente con este error (mensaje, archivo, línea y código cercano). */
  protected askAi(event: Event, row: RowView): void {
    event.stopPropagation();
    const snippet = row.snippet.map((l) => `${l.marked ? '>' : ' '} ${l.n} | ${l.text}`).join('\n');
    this.ui.aiRequest.set({ task: 'fix', error: { message: row.message, path: row.path, line: row.line, snippet: snippet || undefined } });
  }

  protected copiedId = signal<string | null>(null);
  /** Problemas cuyo fragmento de código se ve entero (por defecto, la línea y una de contexto por arriba y otra por abajo). */
  private expandedSnippets = signal<ReadonlySet<string>>(new Set());
  protected isExpanded(id: string): boolean { return this.expandedSnippets().has(id); }
  protected toggleSnippet(event: Event, id: string): void {
    event.stopPropagation();
    const next = new Set(this.expandedSnippets());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.expandedSnippets.set(next);
  }

  protected counts = computed(() => countProblems(this.diagnostics.rows()));

  /** Filas que pasan los filtros, con su fragmento de código. */
  protected visible = computed<RowView[]>(() => {
    const sev = this.severity();
    const active = this.editorState.activeTab()?.path;
    const only = this.onlyOpen();
    const files = this.editorState.allFileContents();
    const expanded = this.expandedSnippets();
    return this.diagnostics
      .rows()
      .filter((r) => (sev === 'all' || r.severity === sev) && (!only || (!!active && r.path === active)))
      .map((r) => ({
        ...r,
        file: r.path ? (r.path.split('/').pop() ?? r.path) : '',
        snippet: r.path && r.line ? snippetLines(files.get(r.path) ?? '', r.line, expanded.has(r.id) ? 5 : 1) : [],
      }));
  });

  protected positionText = computed(() => {
    const list = this.visible();
    const at = list.findIndex((r) => r.id === this.diagnostics.selectedId());
    return at >= 0 ? `${at + 1} de ${list.length}` : `${list.length} ${list.length === 1 ? 'problema' : 'problemas'}`;
  });

  protected step(direction: 1 | -1): void {
    const next = stepRow(this.visible(), this.diagnostics.selectedId(), direction);
    if (next) this.select(next, true);
  }

  /** Resalta una fila y, si tiene ubicación y `reveal`, lleva el editor a su línea. */
  protected select(row: ProblemRow, reveal: boolean): void {
    this.diagnostics.selectedId.set(row.id);
    if (reveal && row.path && row.line) this.editorState.revealLine(row.path, row.line);
  }

  protected goTo(event: Event, row: ProblemRow): void {
    event.stopPropagation();
    this.select(row, true);
  }

  protected fixIt(event: Event, fix: NonNullable<ProblemRow['fix']>): void {
    event.stopPropagation();
    this.orchestrator.applyFix(fix);
  }

  protected async copy(event: Event, row: RowView): Promise<void> {
    event.stopPropagation();
    const where = row.path ? `${row.file}:${row.line}\n` : '';
    const text = `${where}${row.message}${row.hint ? `\n${row.hint}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      this.copiedId.set(row.id);
      setTimeout(() => { if (this.copiedId() === row.id) this.copiedId.set(null); }, 1500);
    } catch {
      this.terminal.addEntry('warning', 'Problemas', 'No se pudo copiar el mensaje al portapapeles.');
    }
  }

  /** F8 / Mayús+F8 con el foco dentro del panel (en el editor lo hace Monaco). */
  @HostListener('keydown', ['$event'])
  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'F8' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.step(e.shiftKey ? -1 : 1);
    }
  }
}
