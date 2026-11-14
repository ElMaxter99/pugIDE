import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { EditorState } from '../../../core/state/editor.state';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { sideBySideDiff } from '../../../core/utils/text-diff.util';

/**
 * Escritorio (P-37): «Diferencias» de un archivo que cambió en el disco y aquí a la vez. Las dos versiones lado a
 * lado, con lo que cambia resaltado (signo y color) y saltos entre cambios; la decisión se toma aquí o en la barra.
 * La versión que no se elige queda en «Historial del archivo» (lo hace `WorkspaceService.resolveConflict`).
 */
@Component({
  selector: 'app-conflict-diff-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (conflict(); as c) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Diferencias en ' + name()" tabindex="-1" data-testid="conflict-diff-dialog"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header">
            <span aria-hidden="true" class="material-symbols-outlined icon">swap_horiz</span>
            <div class="titles">
              <h2 class="title">Diferencias en {{ name() }}</h2>
              @if (diff(); as d) {
                <div class="small" data-testid="conflict-diff-summary">{{ d.changes }} {{ d.changes === 1 ? 'cambio' : 'cambios' }} · <span class="plus">+{{ d.added }}</span> <span class="minus">−{{ d.removed }}</span> líneas</div>
              }
            </div>
            @if (diff(); as d) {
              <button type="button" class="btn secondary" data-testid="conflict-diff-prev" [disabled]="d.changes < 2" title="Alt+↑" (click)="go(-1)"><span aria-hidden="true" class="material-symbols-outlined">keyboard_arrow_up</span>Cambio anterior</button>
              <button type="button" class="btn secondary" data-testid="conflict-diff-next" [disabled]="d.changes < 2" title="Alt+↓" (click)="go(1)"><span aria-hidden="true" class="material-symbols-outlined">keyboard_arrow_down</span>Cambio siguiente</button>
            }
            <button type="button" class="close" aria-label="Cerrar" (click)="close()">×</button>
          </div>
          <div class="body">
            @if (diff(); as d) {
              <div class="heads">
                <div class="head"><strong>Aquí (sin guardar)</strong><span class="small">Lo que tienes en PugIDE</span></div>
                <div class="head"><strong>En el disco</strong><span class="small">Cambiado fuera de PugIDE</span></div>
              </div>
              <div #scroller class="panes" tabindex="0" role="group" aria-label="Las dos versiones, línea a línea" data-testid="conflict-diff-rows">
                @for (r of d.rows; track $index) {
                  <div class="row" [class.current]="r.change !== null && r.change === current()" [attr.data-change]="r.change">
                    <div class="cell" [class.removed]="r.change !== null && r.left" [class.empty]="!r.left">
                      <span class="num" aria-hidden="true">{{ r.left?.n }}</span><span class="sign" aria-hidden="true">{{ r.change !== null && r.left ? '−' : '' }}</span>@if (r.change !== null && r.left) { <span class="sr-only">quitada: </span> }<span class="text">{{ r.left?.text }}</span>
                    </div>
                    <div class="cell" [class.added]="r.change !== null && r.right" [class.empty]="!r.right">
                      <span class="num" aria-hidden="true">{{ r.right?.n }}</span><span class="sign" aria-hidden="true">{{ r.change !== null && r.right ? '+' : '' }}</span>@if (r.change !== null && r.right) { <span class="sr-only">añadida: </span> }<span class="text">{{ r.right?.text }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="line" data-testid="conflict-diff-deleted">
                <span aria-hidden="true" class="material-symbols-outlined warn">delete</span>
                <div><div class="strong">Este archivo se ha borrado en el disco</div><div class="small">Aquí tiene cambios sin guardar ({{ mineLines() }} {{ mineLines() === 1 ? 'línea' : 'líneas' }}).</div></div>
              </div>
            }
          </div>
          <div class="footer">
            <span class="small grow">La versión que no elijas queda guardada en «Historial del archivo».</span>
            <button type="button" class="btn secondary" (click)="close()">Cerrar</button>
            <button type="button" class="btn secondary" data-testid="conflict-diff-mine" (click)="resolve('mine')">{{ c.disk === null ? 'Conservarlo (volver a crearlo)' : 'Quedarme con lo mío' }}</button>
            <button type="button" class="btn primary" data-testid="conflict-diff-disk" (click)="resolve('disk')">{{ c.disk === null ? 'Borrarlo aquí también' : 'Cargar el del disco' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2100; }
    .dialog { width: 1160px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .dialog:focus { outline: none; }
    .header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
    .icon { color: var(--accent-color); font-size: 20px; }
    .titles { flex: 1; min-width: 200px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .small { font-size: 12px; color: var(--text-secondary); }
    .plus { color: var(--success-color); }
    .minus { color: var(--error-color); margin: 0 2px 0 4px; }
    .close { width: 28px; height: 28px; border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); font-size: 18px; cursor: pointer; }
    .close:hover { background: var(--bg-hover); }
    .body { padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; min-height: 0; }
    .heads { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .head { display: flex; flex-direction: column; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 8px 8px 0 0; background: var(--bg-input); font-size: 13px; color: var(--text-primary); }
    .panes { overflow: auto; max-height: min(56vh, 560px); border: 1px solid var(--border-color); border-radius: 0 0 8px 8px; background: var(--bg-primary); font-family: var(--font-mono); font-size: 12px; line-height: 20px; }
    .panes:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 1px; }
    .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; min-width: 760px; }
    .cell { display: flex; min-width: 0; color: var(--text-secondary); border-left: 3px solid transparent; }
    .cell.removed { background: color-mix(in srgb, var(--error-color) 14%, transparent); color: var(--text-primary); }
    .cell.added { background: color-mix(in srgb, var(--success-color) 14%, transparent); color: var(--text-primary); }
    .cell.empty { background: repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, var(--border-color) 45%, transparent) 6px 7px); }
    .row.current .cell.removed, .row.current .cell.added { border-left-color: var(--accent-color); }
    .num { width: 40px; flex-shrink: 0; text-align: right; padding-right: 8px; color: var(--text-secondary); user-select: none; }
    .sign { width: 14px; flex-shrink: 0; font-weight: 700; user-select: none; }
    .removed .sign { color: var(--error-color); }
    .added .sign { color: var(--success-color); }
    /* Las líneas largas se parten dentro de su columna: no pisan la otra versión ni obligan a desplazarse a lo ancho. */
    .text { flex: 1; min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .line { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--text-primary); }
    .line .warn { color: var(--warning-color); font-size: 20px; }
    .strong { font-weight: 600; }
    .footer { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 12px 18px; border-top: 1px solid var(--border-color); background: var(--bg-input); border-radius: 0 0 12px 12px; }
    .grow { flex: 1; min-width: 200px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: 1px solid transparent; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ConflictDiffDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly workspace = inject(WorkspaceService);
  private readonly editorState = inject(EditorState);

  /** El conflicto que se está viendo; si se resuelve (aquí o en la barra) o desaparece, el diálogo se cierra solo. */
  protected readonly conflict = computed(() => {
    const path = this.ui.conflictDiffPath();
    return path ? this.workspace.conflicts().find((c) => c.path === path) ?? null : null;
  });
  protected readonly name = computed(() => (this.conflict()?.path ?? '').slice(1));
  private readonly mine = computed(() => { const c = this.conflict(); return c ? this.editorState.allFileContents().get(c.path) ?? '' : ''; });
  protected readonly mineLines = computed(() => this.mine().split('\n').length);
  /** null: el archivo se borró en el disco (no hay con qué comparar). */
  protected readonly diff = computed(() => { const c = this.conflict(); return c && c.disk !== null ? sideBySideDiff(this.mine(), c.disk) : null; });
  /** Cambio en el que se está (para «anterior» y «siguiente»). */
  protected readonly current = signal(0);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      const open = !!this.conflict();
      untracked(() => {
        if (open && !this.restoreFocus) {
          this.restoreFocus = rememberFocus();
          this.current.set(0);
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); this.reveal(0); });
        } else if (!open) {
          if (this.ui.conflictDiffPath()) this.ui.conflictDiffPath.set(null);
          this.restoreFocus?.();
          this.restoreFocus = null;
        }
      });
    });
  }

  protected go(step: number): void {
    const total = this.diff()?.changes ?? 0;
    if (!total) return;
    const next = (this.current() + step + total) % total;
    this.current.set(next);
    this.reveal(next);
  }

  private reveal(change: number): void {
    const box = this.scroller()?.nativeElement;
    const row = box?.querySelector<HTMLElement>(`[data-change="${change}"]`);
    if (box && row) box.scrollTop = Math.max(0, row.offsetTop - box.offsetTop - 60);
  }

  protected resolve(keep: 'mine' | 'disk'): void {
    const c = this.conflict();
    if (c) void this.workspace.resolveConflict(c.path, keep);
  }

  protected close(): void {
    this.ui.conflictDiffPath.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.altKey && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      this.go(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }
}
