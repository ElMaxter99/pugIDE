import { Component, ChangeDetectionStrategy, DestroyRef, ElementRef, OnInit, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import type { SnapshotContent, SnapshotMeta } from '../../../core/models/project-snapshot.model';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { foldContext } from '../../../core/utils/history.util';
import {
  ChangeEntry, ChangeKind, KIND_LABEL, KIND_SYMBOL, SnapshotComparison, compareSnapshot, entryDiff, formatBytes, formatSnapshotDate, plural,
} from '../../../core/utils/snapshot.util';

/** Compara una instantánea con el proyecto de ahora: archivos añadidos, eliminados y modificados, y el diff de cada uno. */
@Component({
  selector: 'app-snapshot-compare',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overlay" (click)="back.emit()">
      <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Comparar instantánea" tabindex="-1"
        (click)="$event.stopPropagation()" (keydown.escape)="back.emit()" (keydown)="onKeydown($event)">
        <div class="header">
          <h2>Comparar · <span class="sub">«{{ snapshot().name }}» con el proyecto actual</span></h2>
          <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="back.emit()">&times;</button>
        </div>
        <p class="hint">Instantánea del {{ date() }} ({{ plural(snapshot().fileCount, 'archivo', 'archivos') }}, {{ plural(snapshot().assetCount, 'asset', 'assets') }}). Se compara con lo que hay ahora en el editor, incluido lo que aún no has guardado.</p>
        @if (!comparison()) {
          <p class="empty">{{ missing() ? 'La instantánea ya no está en el navegador.' : 'Comparando…' }}</p>
        } @else {
          <div class="counts" data-testid="compare-counts" aria-label="Resumen de cambios">
            <span class="count"><b class="num add">{{ comparison()!.added }}</b> {{ comparison()!.added === 1 ? 'añadido' : 'añadidos' }}</span>
            <span class="count"><b class="num del">{{ comparison()!.removed }}</b> {{ comparison()!.removed === 1 ? 'eliminado' : 'eliminados' }}</span>
            <span class="count"><b class="num mod">{{ comparison()!.modified }}</b> {{ comparison()!.modified === 1 ? 'modificado' : 'modificados' }}</span>
            <span class="count"><b class="num same">{{ comparison()!.unchanged }}</b> sin cambios</span>
          </div>
          @if (!comparison()!.entries.length) {
            <p class="empty" data-testid="compare-identical">El proyecto actual es igual a esta instantánea.</p>
          } @else {
            <div class="body">
              <ul class="entries" aria-label="Archivos con cambios">
                @for (e of comparison()!.entries; track e.key; let i = $index) {
                  <li>
                    <button class="entry" type="button" data-testid="compare-entry" [class.sel]="i === selected()" [attr.aria-pressed]="i === selected()" (click)="selected.set(i)">
                      <span class="sym" [class.added]="e.kind === 'added'" [class.removed]="e.kind === 'removed'" [class.modified]="e.kind === 'modified'" aria-hidden="true">{{ symbol(e.kind) }}</span>
                      <span class="label" [class.mono]="e.type !== 'data'">{{ e.label }} <span class="kind">({{ kindLabel(e.kind) }})</span></span>
                      <span class="delta">{{ delta(e) }}</span>
                    </button>
                  </li>
                }
              </ul>
              <div class="detail">
                @if (entry(); as e) {
                  <div class="detail-head">
                    <span><span class="mono path">{{ e.label }}</span> · {{ kindLabel(e.kind) }}</span>
                    @if (e.type !== 'asset') {
                      <span>Desde la instantánea: <span class="plus">+ añadido</span> · <span class="minus">− quitado</span></span>
                    }
                  </div>
                  @if (e.type === 'asset') {
                    <p class="binary" data-testid="compare-binary">{{ binaryText(e) }}</p>
                  } @else {
                    <pre class="diff-body" data-testid="compare-diff" aria-label="Diferencias">@for (op of diff(); track $index) {@if (op.type === 'skip') {<span class="line skip">  … {{ op.count }} líneas sin cambios</span>} @else {<span class="line" [class.add]="op.type === 'add'" [class.del]="op.type === 'del'">{{ op.type === 'add' ? '+ ' : op.type === 'del' ? '− ' : '  ' }}{{ op.text }}</span>}}</pre>
                  }
                }
              </div>
            </div>
          }
        }
        <div class="footer">
          <button class="link" type="button" data-testid="compare-back" (click)="back.emit()">← Volver a la lista</button>
          <div class="right">
            <span class="same-note">Restaurar guarda antes el estado actual.</span>
            <button class="btn primary" type="button" data-testid="compare-restore" [disabled]="!comparison()" (click)="restore.emit()">Restaurar esta instantánea…</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(1040px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); overflow-wrap: anywhere; }
    .sub { font-weight: 400; color: var(--text-secondary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .hint { margin: 0; padding: 0 20px 12px; font-size: 12px; color: var(--text-secondary); }
    .empty { margin: 0; padding: 24px 20px 32px; text-align: center; color: var(--text-secondary); font-size: 13px; }
    .counts { display: flex; flex-wrap: wrap; gap: 20px; padding: 0 20px 12px; font-size: 12px; color: var(--text-primary); }
    .count { display: flex; align-items: center; gap: 6px; }
    .num { font-family: var(--font-mono); font-weight: 600; }
    .num.add { color: #3fb950; }
    .num.del { color: #f85149; }
    .num.mod { color: var(--warning-color); }
    .num.same { color: var(--text-tertiary); }
    .body { display: flex; gap: 12px; padding: 0 20px 16px; min-height: 0; overflow: hidden; flex: 1; }
    .entries { list-style: none; margin: 0; padding: 0; width: 320px; flex-shrink: 0; overflow-y: auto; max-height: 56vh; }
    .entry { display: grid; grid-template-columns: 18px 1fr auto; gap: 2px 8px; align-items: center; width: 100%; text-align: left; padding: 6px 8px; border-radius: 6px; color: var(--text-primary); font-size: 12px; }
    .entry:hover { background: var(--bg-hover); }
    .entry.sel { background: var(--bg-surface-variant); outline: 1px solid var(--accent-color); }
    .sym { font-family: var(--font-mono); font-weight: 700; }
    .sym.added { color: #3fb950; }
    .sym.removed { color: #f85149; }
    .sym.modified { color: var(--warning-color); }
    .label { overflow-wrap: anywhere; }
    .mono { font-family: var(--font-mono); }
    .kind { font-family: var(--font-family); font-size: 11px; color: var(--text-secondary); }
    .delta { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
    .detail { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
    .detail-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary); }
    .path { color: var(--text-primary); }
    .plus { color: #3fb950; }
    .minus { color: #f85149; }
    .diff-body { margin: 0; padding: 8px; flex: 1; overflow: auto; max-height: 52vh; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; font-family: var(--font-mono); font-size: 12px; line-height: 18px; }
    .binary { margin: 0; padding: 16px; font-size: 13px; color: var(--text-secondary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 6px; }
    .line { display: block; white-space: pre; }
    .line.add { background: rgba(63, 185, 80, 0.18); }
    .line.del { background: rgba(248, 81, 73, 0.18); }
    .line.skip { color: var(--text-tertiary); font-style: italic; }
    .footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 0 20px 16px; }
    .link { color: var(--accent-color); font-size: 13px; text-decoration: underline; }
    .right { display: flex; align-items: center; gap: 12px; }
    .same-note { font-size: 12px; color: var(--text-secondary); }
    .btn { padding: 6px 14px; font-size: 13px; border-radius: 4px; background: var(--accent-color); color: var(--text-on-primary); font-weight: 700; }
    .btn:disabled { opacity: 0.4; cursor: default; }
  `],
})
export class SnapshotCompareComponent implements OnInit {
  readonly snapshot = input.required<SnapshotMeta>();
  readonly back = output<void>();
  readonly restore = output<void>();

  private orchestrator = inject(OrchestratorService);

  protected readonly plural = plural;
  private base = signal<SnapshotContent | null>(null);
  private current = signal<SnapshotContent | null>(null);
  protected missing = signal(false);
  protected selected = signal(0);
  protected date = computed(() => formatSnapshotDate(this.snapshot().at));
  protected comparison = computed<SnapshotComparison | null>(() => {
    const base = this.base();
    const current = this.current();
    return base && current ? compareSnapshot(base, current) : null;
  });
  protected entry = computed<ChangeEntry | null>(() => this.comparison()?.entries[this.selected()] ?? null);
  protected diff = computed(() => {
    const e = this.entry();
    const base = this.base();
    const current = this.current();
    return e && base && current ? foldContext(entryDiff(e, base, current), 3) : [];
  });

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');

  constructor() {
    const restoreFocus = rememberFocus();
    inject(DestroyRef).onDestroy(() => restoreFocus());
    afterNextRender(() => this.dialog()?.nativeElement.focus());
  }

  async ngOnInit(): Promise<void> {
    const base = await this.orchestrator.loadSnapshotContent(this.snapshot().id);
    if (!base) { this.missing.set(true); return; }
    this.base.set(base);
    this.current.set(this.orchestrator.currentSnapshotContent());
  }

  protected symbol(kind: ChangeKind): string {
    return KIND_SYMBOL[kind];
  }

  protected kindLabel(kind: ChangeKind): string {
    return KIND_LABEL[kind];
  }

  protected delta(e: ChangeEntry): string {
    if (e.type === 'asset') {
      if (e.kind === 'added') return formatBytes(e.bytesAfter ?? 0);
      if (e.kind === 'removed') return formatBytes(e.bytesBefore ?? 0);
      return `${formatBytes(e.bytesBefore ?? 0)} → ${formatBytes(e.bytesAfter ?? 0)}`;
    }
    if (e.kind === 'added') return `+${e.plus}`;
    if (e.kind === 'removed') return `−${e.minus}`;
    return `+${e.plus} −${e.minus}`;
  }

  protected binaryText(e: ChangeEntry): string {
    if (e.kind === 'added') return `Asset añadido después de la instantánea (${formatBytes(e.bytesAfter ?? 0)}). Al restaurar se elimina.`;
    if (e.kind === 'removed') return `Asset que había en la instantánea (${formatBytes(e.bytesBefore ?? 0)}) y ya no está. Al restaurar vuelve.`;
    return `Archivo binario modificado: ${formatBytes(e.bytesBefore ?? 0)} en la instantánea, ${formatBytes(e.bytesAfter ?? 0)} ahora.`;
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }
}
