import { Component, ChangeDetectionStrategy, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { EditorState } from '../../../core/state/editor.state';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { FileVersion, diffLines, foldContext, formatAgo, summarizeDiff } from '../../../core/utils/history.util';

/** Por encima de este tamaño no se calcula el resumen de cambios de cada versión de la lista. */
const SUMMARY_MAX_CHARS = 100_000;

/** Historial del archivo activo: versiones guardadas en el navegador, qué cambiaría al restaurar cada una y restaurarla. */
@Component({
  selector: 'app-file-history-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="overlay" (click)="closed.emit()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Historial del archivo" tabindex="-1"
          (click)="$event.stopPropagation()" (keydown.escape)="closed.emit()" (keydown)="onKeydown($event)">
          <div class="header">
            <h2>Historial · <span class="path">{{ path() }}</span></h2>
            <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="closed.emit()">&times;</button>
          </div>
          <p class="hint">Versiones guardadas solo en este navegador (hasta 30 por archivo): al guardar, cada pocos minutos mientras editas y antes de restaurar o reemplazar.</p>
          @if (loading()) {
            <p class="empty">Cargando…</p>
          } @else if (!versions().length) {
            <p class="empty">Este archivo aún no tiene versiones. Se guardan al pulsar Guardar (Ctrl+S) o tras unos minutos de edición.</p>
          } @else {
            <div class="body">
              <ul class="versions" aria-label="Versiones">
                @for (v of versions(); track v.at; let i = $index) {
                  <li>
                    <button class="ver" data-testid="history-version" [class.sel]="i === selected()" [attr.aria-pressed]="i === selected()" (click)="selected.set(i)">
                      <span class="when">{{ ago(v.at) }}</span>
                      <span class="why">{{ v.reason }}</span>
                      <span class="delta">{{ summaries()[i] }}</span>
                    </button>
                  </li>
                }
              </ul>
              <div class="diff">
                <div class="diff-head">Al restaurar esta versión: <span class="plus">+ vuelve</span> · <span class="minus">− desaparece</span></div>
                <pre class="diff-body" data-testid="history-diff" aria-label="Diferencias">@for (op of diff(); track $index) {@if (op.type === 'skip') {<span class="line skip">  … {{ op.count }} líneas sin cambios</span>} @else {<span class="line" [class.add]="op.type === 'add'" [class.del]="op.type === 'del'">{{ op.type === 'add' ? '+ ' : op.type === 'del' ? '− ' : '  ' }}{{ op.text }}</span>}}</pre>
                <div class="actions">
                  <span class="same" [hidden]="!identical()">Es igual al contenido actual.</span>
                  <button class="btn primary" data-testid="history-restore" [disabled]="identical()" (click)="restore()">Restaurar esta versión</button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(860px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .path { font-family: var(--font-mono); font-weight: 400; color: var(--text-secondary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .hint { margin: 0; padding: 0 20px 12px; font-size: 12px; color: var(--text-secondary); }
    .empty { margin: 0; padding: 24px 20px 32px; text-align: center; color: var(--text-secondary); font-size: 13px; }
    .body { display: flex; gap: 12px; padding: 0 20px 16px; min-height: 0; overflow: hidden; flex: 1; }
    .versions { list-style: none; margin: 0; padding: 0; width: 260px; flex-shrink: 0; overflow-y: auto; max-height: 56vh; }
    .ver { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; width: 100%; text-align: left; padding: 6px 8px; border-radius: 6px; color: var(--text-primary); font-size: 12px; }
    .ver:hover { background: var(--bg-hover); }
    .ver.sel { background: var(--bg-surface-variant); outline: 1px solid var(--accent-color); }
    .why { grid-column: 1; color: var(--text-secondary); font-size: 11px; }
    .delta { grid-row: 1 / span 2; grid-column: 2; align-self: center; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
    .diff { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .diff-head { font-size: 12px; color: var(--text-secondary); }
    .plus { color: #3fb950; }
    .minus { color: #f85149; }
    .diff-body { margin: 0; padding: 8px; flex: 1; overflow: auto; max-height: 50vh; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-family: var(--font-mono); font-size: 12px; line-height: 18px; }
    .line { display: block; white-space: pre; }
    .line.add { background: rgba(63, 185, 80, 0.18); }
    .line.del { background: rgba(248, 81, 73, 0.18); }
    .line.skip { color: var(--text-tertiary); font-style: italic; }
    .actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
    .same { font-size: 12px; color: var(--text-secondary); }
    .btn { padding: 6px 14px; font-size: 13px; border-radius: 4px; background: var(--accent-color); color: var(--text-on-primary); font-weight: 700; }
    .btn:disabled { opacity: 0.4; cursor: default; }
  `],
})
export class FileHistoryDialogComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();

  private orchestrator = inject(OrchestratorService);
  private editorState = inject(EditorState);

  protected path = signal('');
  protected loading = signal(false);
  protected versions = signal<FileVersion[]>([]);
  protected selected = signal(0);
  private current = signal('');

  /** Para cada versión: líneas que volverían (+) y que desaparecerían (−) al restaurarla. */
  protected summaries = computed(() => {
    const current = this.current();
    return this.versions().map((v) => {
      if (v.content.length > SUMMARY_MAX_CHARS || current.length > SUMMARY_MAX_CHARS) return '';
      const { added, removed } = summarizeDiff(diffLines(current, v.content));
      return added || removed ? `+${added} −${removed}` : 'igual';
    });
  });

  protected diff = computed(() => {
    const v = this.versions()[this.selected()];
    return v ? foldContext(diffLines(this.current(), v.content), 3) : [];
  });

  protected identical = computed(() => this.versions()[this.selected()]?.content === this.current());

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.restoreFocus = rememberFocus();
          void this.load();
          setTimeout(() => this.dialog()?.nativeElement.focus());
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  private async load(): Promise<void> {
    const path = this.editorState.activeTab()?.path ?? '';
    this.path.set(path);
    this.selected.set(0);
    this.versions.set([]);
    this.loading.set(true);
    this.current.set(path ? this.orchestrator.currentContent(path) : '');
    this.versions.set(path ? await this.orchestrator.fileHistory(path) : []);
    this.loading.set(false);
  }

  protected ago(at: number): string {
    return formatAgo(at, Date.now());
  }

  protected async restore(): Promise<void> {
    const v = this.versions()[this.selected()];
    if (!v || this.identical()) return;
    await this.orchestrator.restoreVersion(this.path(), v.content);
    this.closed.emit();
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }
}
