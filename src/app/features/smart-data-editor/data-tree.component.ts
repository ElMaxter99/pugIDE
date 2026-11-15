import { Component, ChangeDetectionStrategy, computed, inject, input, signal } from '@angular/core';
import { DataState } from '../../core/state/data.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { ParserState } from '../../core/state/parser.state';
import { dataTable } from '../../core/utils/data-tree.util';
import { unusedDataKeys } from '../../core/utils/quality-hints.util';

/**
 * Tabla editable de los datos (P-38), como la de los archivos de traducciones: CLAVE y VALOR en dos columnas, cuántos
 * elementos tiene cada grupo y los valores largos en una línea. Se edita en el sitio: textos, números e interruptores.
 */
@Component({
  selector: 'app-data-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
      <div class="tree-view" role="table" aria-label="Datos" data-testid="data-table">
        <div class="tree-head" role="row">
          <span class="cell key" role="columnheader">Clave</span>
          <span class="cell value" role="columnheader">Valor</span>
        </div>
        <div class="tree-content font-mono" role="rowgroup">
          @for (row of table().rows; track row.path) {
            @if (row.kind === 'group') {
              <div class="tree-row expandable" [class.hit]="row.hit" role="row" [attr.data-path]="row.path">
                <button type="button" class="cell key group" role="cell" [attr.aria-expanded]="row.open" [disabled]="filtering()"
                  [attr.aria-label]="(row.open ? 'Plegar ' : 'Desplegar ') + row.key + ', ' + groupSize(row.count!)"
                  [style.padding-left.px]="6 + row.depth * 14" (click)="toggleNode(row.path)">
                  <span aria-hidden="true" class="material-symbols-outlined tree-arrow" [class.rotated]="row.open">keyboard_arrow_down</span>
                  <span class="json-key">{{ row.key }}</span>
                  <span class="json-count">{{ row.count }}</span>
                  @if (row.unused) { <span class="unused" role="img" aria-label="La plantilla no lo usa" title="La plantilla no lo usa"></span> }
                </button>
                <span class="cell value" role="cell"></span>
              </div>
            } @else {
              <div class="tree-row leaf" [class.hit]="row.hit" role="row" [attr.data-path]="row.path">
                <span class="cell key" role="cell" [style.padding-left.px]="22 + row.depth * 14" [title]="row.path">
                  <span class="json-key">{{ row.key }}</span>
                  @if (row.unused) { <span class="unused" role="img" aria-label="La plantilla no lo usa" title="La plantilla no lo usa"></span> }
                </span>
                <span class="cell value" role="cell">
                  @if (row.valueType === 'string') {
                    <input class="json-input string-input" [attr.aria-label]="'Valor de ' + row.path" [title]="$any(row.value)"
                      [value]="row.value" (change)="updateValue(row.path, $any($event.target).value)" (keydown.escape)="cancel($event, row.value)" />
                  } @else if (row.valueType === 'number') {
                    <input class="json-input number-input" type="number" [attr.aria-label]="'Valor de ' + row.path"
                      [value]="row.value" (change)="updateValue(row.path, +$any($event.target).value)" (keydown.escape)="cancel($event, row.value)" />
                  } @else if (row.valueType === 'boolean') {
                    <button type="button" class="json-toggle" role="switch" [attr.aria-checked]="!!row.value" [attr.aria-label]="'Valor de ' + row.path"
                      [class.on]="row.value" (click)="toggleBoolean(row.path, row.value)"><span class="toggle-thumb"></span></button>
                    <span class="json-boolean">{{ row.value }}</span>
                  } @else {
                    <span class="json-null">null</span>
                  }
                </span>
              </div>
            }
          } @empty {
            <p class="empty" data-testid="data-empty">{{ filtering() ? 'Nada coincide con el filtro.' : 'No hay datos todavía. Escribe una variable en la plantilla o pulsa el dado para generar un ejemplo.' }}</p>
          }
        </div>
      </div>
  `,
  styles: [`
    :host { display: block; flex: 1; min-height: 0; overflow-y: auto; }
    :host(.hidden) { display: none; }
    .font-mono { font-family: var(--font-mono); }
    .tree-view { min-width: 0; }
    .tree-head { position: sticky; top: 0; z-index: 1; display: flex; height: 26px; background: var(--bg-surface-container); border-bottom: 1px solid var(--border-color); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-tertiary); }
    .tree-head .key { padding-left: 22px; }
    .tree-content { font-size: 12px; line-height: 20px; }
    .tree-row { display: flex; min-height: 28px; border-bottom: 1px solid var(--border-color); }
    .tree-row:hover { background: rgba(255, 255, 255, 0.03); }
    .tree-row.hit { background: rgba(221, 183, 255, 0.10); }
    .cell { display: flex; align-items: center; min-width: 0; }
    .cell.key { width: 44%; flex-shrink: 0; gap: 2px; padding-right: 4px; border-right: 1px solid var(--border-color); color: var(--text-primary); }
    .cell.value { flex: 1; gap: 6px; padding: 0 8px; }
    button.cell.key { font: inherit; text-align: left; background: transparent; cursor: pointer; border-top: 0; border-bottom: 0; border-left: 0; }
    button.cell.key:disabled { cursor: default; }
    button.cell.key:focus-visible, .json-toggle:focus-visible { outline: 2px solid var(--accent-color); outline-offset: -2px; }
    .tree-arrow { font-size: 16px; color: var(--text-tertiary); transition: transform 0.15s; flex-shrink: 0; transform: rotate(-90deg); }
    .tree-arrow.rotated { transform: rotate(0deg); }
    .json-key { color: var(--syn-key); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .json-count { margin-left: 4px; color: var(--text-tertiary); font-size: 11px; flex-shrink: 0; }
    .unused { margin-left: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--warning-color); flex-shrink: 0; }
    .json-boolean { color: var(--syn-keyword); }
    .json-null { color: var(--text-tertiary); font-style: italic; }
    .json-input { flex: 1; min-width: 0; height: 24px; padding: 0 4px; margin: 0 -4px; background: transparent; border: 1px solid transparent; border-radius: 4px; font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); text-overflow: ellipsis; }
    .json-input:hover { border-color: var(--border-color); }
    .json-input:focus { outline: none; border-color: var(--accent-color); background: var(--bg-input); text-overflow: clip; }
    .string-input { color: var(--syn-string); }
    .number-input { color: var(--syn-number); }
    .number-input::-webkit-inner-spin-button, .number-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .json-toggle { width: 32px; height: 24px; padding: 0; background: transparent; position: relative; cursor: pointer; flex-shrink: 0; border-radius: 12px; }
    .json-toggle::before { content: ''; position: absolute; left: 0; top: 4px; width: 32px; height: 16px; border-radius: 8px; background: var(--text-tertiary); transition: background 0.2s; }
    .json-toggle.on::before { background: var(--accent-color); }
    .toggle-thumb { position: absolute; top: 6px; left: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--text-on-primary); transition: transform 0.2s; }
    .json-toggle.on .toggle-thumb { transform: translateX(16px); }
    .empty { margin: 0; padding: 16px; font-family: var(--font-family, system-ui, sans-serif); font-size: 13px; line-height: 20px; color: var(--text-secondary); }
  `],
})
export class DataTreeComponent {
  private dataState = inject(DataState);
  private parserState = inject(ParserState);
  private orchestrator = inject(OrchestratorService);

  /** Texto del filtro (claves y valores). */
  readonly filter = input('');
  protected readonly filtering = computed(() => this.filter().trim().length > 0);

  private expandedPaths = signal<Set<string>>(new Set(['usuario']));
  /** Claves de primer nivel que la plantilla no lee (si aún no se ha leído ninguna variable, no se marca nada). */
  private readonly unused = computed(() => {
    const roots = this.parserState.variables().map((v) => v.path.split('.')[0].replace(/\[\]$/, ''));
    return roots.length ? unusedDataKeys(this.dataState.data(), roots) : [];
  });

  readonly table = computed(() => dataTable(this.dataState.data(), this.expandedPaths(), this.filter(), this.unused()));
  /** Cuántas claves de primer nivel no usa la plantilla (para el resumen). */
  readonly unusedCount = computed(() => this.unused().length);

  /** Deja desplegados exactamente estos nodos. */
  expand(paths: string[]): void {
    this.expandedPaths.set(new Set(paths));
  }

  expandAll(): void {
    this.expandedPaths.set(new Set(this.table().groups));
  }

  collapseAll(): void {
    this.expandedPaths.set(new Set());
  }

  protected groupSize(count: string): string {
    const n = Number(count.slice(1, -1));
    return `${n} ${n === 1 ? 'elemento' : 'elementos'}`;
  }

  protected toggleNode(path: string): void {
    this.expandedPaths.update((paths) => {
      const next = new Set(paths);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  protected updateValue(path: string, value: unknown): void {
    this.dataState.updateValue(path, value);
    this.orchestrator.onDataChange();
  }

  protected toggleBoolean(path: string, currentValue: unknown): void {
    this.updateValue(path, !currentValue);
  }

  /** Esc deshace lo escrito en el campo sin guardarlo. */
  protected cancel(event: Event, original: unknown): void {
    const el = event.target as HTMLInputElement;
    el.value = String(original ?? '');
    event.stopPropagation();
    el.blur();
  }
}
