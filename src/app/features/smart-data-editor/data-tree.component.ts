import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { DataState } from '../../core/state/data.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { flattenTree } from '../../core/utils/data-tree.util';

/** Árbol editable de los datos: desplegar nodos, editar textos y números, y alternar booleanos. */
@Component({
  selector: 'app-data-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
      <div class="tree-view">
        <div class="tree-content font-mono">
          @for (row of flatRows(); track row.path + row.kind) {
            @switch (row.kind) {
              @case ('object-open') {
                <div class="tree-row expandable" [style.padding-left.px]="row.depth * 20" (click)="toggleNode(row.path)">
                  <span class="material-symbols-outlined tree-arrow" [class.rotated]="isNodeExpanded(row.path)">keyboard_arrow_down</span>
                  <span class="json-key">{{ row.key }}</span>
                  <span class="json-colon">:</span>
                  @if (!row.isExpanded) {
                    <span class="json-bracket">{{ openCurly }}{{ closeCurly }}</span>
                  } @else {
                    <span class="json-bracket">{{ openCurly }}</span>
                  }
                </div>
              }
              @case ('array-open') {
                <div class="tree-row expandable" [style.padding-left.px]="row.depth * 20" (click)="toggleNode(row.path)">
                  <span class="material-symbols-outlined tree-arrow" [class.rotated]="isNodeExpanded(row.path)">keyboard_arrow_down</span>
                  <span class="json-key">{{ row.key }}</span>
                  <span class="json-colon">:</span>
                  @if (!row.isExpanded) {
                    <span class="json-bracket">{{ openBracket }}</span>
                    <span class="json-count">{{ row.itemCount }} items</span>
                    <span class="json-bracket">{{ closeBracket }}</span>
                  } @else {
                    <span class="json-bracket">{{ openBracket }}</span>
                  }
                </div>
              }
              @case ('object-close') {
                <div class="tree-row closing" [style.padding-left.px]="row.depth * 20 + 20">
                  <span class="json-bracket">{{ closeCurly }}</span>
                </div>
              }
              @case ('array-close') {
                <div class="tree-row closing" [style.padding-left.px]="row.depth * 20 + 20">
                  <span class="json-bracket">{{ closeBracket }}</span>
                </div>
              }
              @case ('leaf') {
                <div class="tree-row leaf" [style.padding-left.px]="row.depth * 20 + 20">
                  <span class="json-key">{{ row.key }}</span>
                  <span class="json-colon">:</span>
                  @if (row.valueType === 'string') {
                    <input
                      class="json-input string-input"
                      [value]="row.value"
                      (change)="updateValue(row.path, $any($event.target).value)" />
                  } @else if (row.valueType === 'number') {
                    <input
                      class="json-input number-input"
                      type="number"
                      [value]="row.value"
                      (change)="updateValue(row.path, +$any($event.target).value)" />
                  } @else if (row.valueType === 'boolean') {
                    <div
                      class="json-toggle"
                      [class.on]="row.value"
                      (click)="toggleBoolean(row.path, row.value)">
                      <div class="toggle-thumb"></div>
                    </div>
                    <span class="json-boolean">{{ row.value }}</span>
                  } @else if (row.valueType === 'null') {
                    <span class="json-null">null</span>
                  } @else {
                    <span class="json-string">{{ row.value }}</span>
                  }
                </div>
              }
              @case ('inline-array') {
                <div class="tree-row leaf" [style.padding-left.px]="row.depth * 20 + 20">
                  <span class="json-key">{{ row.key }}</span>
                  <span class="json-colon">:</span>
                  <span class="json-bracket">{{ openBracket }}</span>
                  <span class="inline-array-content">
                    @for (item of row.inlineItems; track $index; let last = $last) {
                      <span class="json-string">{{ item }}</span>@if (!last) {<span class="json-comma">, </span>}
                    }
                  </span>
                  <span class="json-bracket">{{ closeBracket }}</span>
                </div>
              }
            }
          }
        </div>
      </div>
  `,
  styles: [`
    :host {
      display: block;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }

    :host(.hidden) {
      display: none;
    }

    .font-mono {
      font-family: var(--font-mono);
    }

    .tree-view {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .tree-content {
      font-size: 13px;
      line-height: 20px;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0;
      min-height: 24px;
    }

    .tree-row.expandable {
      cursor: pointer;
      border-radius: var(--radius);
    }

    .tree-row.expandable:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .tree-row.closing {
      color: var(--text-tertiary);
    }

    .tree-arrow {
      font-size: 16px;
      color: var(--text-tertiary);
      transition: transform 0.15s;
      flex-shrink: 0;
      transform: rotate(-90deg);
    }

    .tree-arrow.rotated {
      transform: rotate(0deg);
    }

    .json-key {
      color: #9cdcfe;
    }

    .json-colon {
      color: var(--text-tertiary);
    }

    .json-bracket {
      color: var(--text-tertiary);
    }

    .json-count {
      color: var(--text-tertiary);
      font-size: 11px;
    }

    .json-string {
      color: #ce9178;
    }

    .json-boolean {
      color: #569cd6;
    }

    .json-null {
      color: #569cd6;
      font-style: italic;
    }

    .json-comma {
      color: var(--text-tertiary);
    }

    .inline-array-content {
      display: inline-flex;
      align-items: center;
      gap: 0;
      flex-wrap: wrap;
    }

    .json-input {
      background: transparent;
      border: none;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 20px;
      color: var(--text-primary);
      padding: 0;
      min-width: 0;
      flex: 1;
    }

    .string-input {
      color: #ce9178;
    }

    .number-input {
      color: #b5cea8;
    }

    .number-input:focus {
      outline: 1px solid var(--accent-color);
      border-radius: 2px;
    }

    .number-input::-webkit-inner-spin-button,
    .number-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .json-toggle {
      width: 32px;
      height: 18px;
      border-radius: 9px;
      background: var(--text-tertiary);
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .json-toggle.on {
      background: var(--accent-color);
    }

    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--text-on-primary);
      transition: transform 0.2s;
    }

    .json-toggle.on .toggle-thumb {
      transform: translateX(14px);
    }
  `],
})
export class DataTreeComponent {
  private dataState = inject(DataState);
  private orchestrator = inject(OrchestratorService);

  protected readonly openCurly = '{';
  protected readonly closeCurly = '}';
  protected readonly openBracket = '[';
  protected readonly closeBracket = ']';

  private expandedPaths = signal<Set<string>>(new Set(['', 'usuario']));

  protected flatRows = computed(() => flattenTree(this.dataState.data(), this.expandedPaths()));

  /** Deja desplegados exactamente estos nodos (la raíz es la ruta vacía). */
  expand(paths: string[]): void {
    this.expandedPaths.set(new Set(paths));
  }

  protected isNodeExpanded(path: string): boolean {
    return this.expandedPaths().has(path);
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
}
