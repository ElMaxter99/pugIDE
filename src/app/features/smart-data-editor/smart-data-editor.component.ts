import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { DataState } from '../../core/state/data.state';
import { ParserState } from '../../core/state/parser.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { PugVariable } from '../../core/models/index';

@Component({
  selector: 'app-smart-data-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="data-section">
      <div class="data-header">
        <span class="data-title">Smart Data Editor</span>
        <div class="data-actions">
          <button class="mock-btn" (click)="autoGenerateMock()">
            <span class="material-symbols-outlined" style="font-size: 14px;">magic_button</span>
            <span class="mock-label">Auto-generate Mock</span>
          </button>
          <button class="icon-btn" (click)="autoGenerateMock()" title="Regenerate">
            <span class="material-symbols-outlined" style="font-size: 18px;">auto_awesome</span>
          </button>
        </div>
      </div>
      <div class="tree-view">
        <div class="tree-content font-mono">
          <ng-container *ngTemplateOutlet="jsonNode; context: { $implicit: dataState.data(), path: '', depth: 0 }"></ng-container>
        </div>
      </div>
    </section>

    <ng-template #jsonNode let-node let-path="path" let-depth="depth">
      @for (entry of objectEntries(node); track entry.key) {
        @if (isObject(entry.value) || isArray(entry.value)) {
          <div class="tree-branch">
            <div class="tree-row expandable" (click)="toggleNode(path + entry.key)">
              <span class="material-symbols-outlined tree-arrow" [class.rotated]="isNodeExpanded(path + entry.key)">
                keyboard_arrow_down
              </span>
              <span class="json-key">{{ entry.key }}</span>
              <span class="json-colon">:</span>
              @if (isArray(entry.value)) {
                <span class="json-bracket">[</span>
                @if (!isNodeExpanded(path + entry.key)) {
                  <span class="json-count">{{ getEntries(entry.value).length }} items</span>
                  <span class="json-bracket">]</span>
                }
              } @else {
                <span class="json-bracket">{</span>
                @if (!isNodeExpanded(path + entry.key)) {
                  <span class="json-bracket">}</span>
                }
              }
            </div>
            @if (isNodeExpanded(path + entry.key)) {
              <div class="tree-children">
                <ng-container *ngTemplateOutlet="jsonNode; context: {
                  $implicit: entry.value,
                  path: path + entry.key + '.',
                  depth: depth + 1
                }"></ng-container>
                @if (isArray(entry.value)) {
                  <div class="tree-row closing"><span class="json-bracket">]</span></div>
                } @else {
                  <div class="tree-row closing"><span class="json-bracket">}</span></div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="tree-row leaf">
            <span class="tree-spacer"></span>
            <span class="json-key">{{ entry.key }}</span>
            <span class="json-colon">:</span>
            @if (isString(entry.value)) {
              <input
                class="json-input string-input"
                [value]="entry.value"
                (change)="updateValue(path + entry.key, $any($event.target).value)" />
            } @else if (isNumber(entry.value)) {
              <input
                class="json-input number-input"
                type="number"
                [value]="entry.value"
                (change)="updateValue(path + entry.key, +$any($event.target).value)" />
            } @else if (isBoolean(entry.value)) {
              <div
                class="json-toggle"
                [class.on]="entry.value"
                (click)="toggleBoolean(path + entry.key, entry.value)">
                <div class="toggle-thumb"></div>
              </div>
              <span class="json-boolean">{{ entry.value }}</span>
            } @else if (entry.value === null) {
              <span class="json-null">null</span>
            } @else {
              <span class="json-string">"{{ entry.value }}"</span>
            }
          </div>
        }
      }
    </ng-template>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 300px;
      border-right: 1px solid var(--border-color);
      height: 100%;
      overflow: hidden;
      background: var(--bg-surface-container-low);
    }

    .data-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 36px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container);
      flex-shrink: 0;
    }

    .data-title {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-color);
    }

    .data-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mock-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(221, 183, 255, 0.1);
      border-radius: var(--radius);
      color: var(--accent-color);
      transition: all 0.15s;
    }

    .mock-btn:hover {
      background: rgba(221, 183, 255, 0.2);
    }

    .mock-label {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius);
      color: var(--text-tertiary);
      transition: all 0.15s;
    }

    .icon-btn:hover {
      color: var(--text-primary);
      background: var(--bg-surface-variant);
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

    .tree-branch {
      margin: 0;
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
      padding-left: 20px;
    }

    .tree-row.leaf {
      padding-left: 20px;
    }

    .tree-spacer {
      width: 16px;
      flex-shrink: 0;
    }

    .tree-arrow {
      font-size: 16px;
      color: var(--text-tertiary);
      transition: transform 0.15s;
      flex-shrink: 0;
    }

    .tree-arrow.rotated {
      transform: rotate(0deg);
    }

    .tree-children {
      padding-left: 20px;
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

    .json-number {
      color: #b5cea8;
    }

    .json-boolean {
      color: #569cd6;
    }

    .json-null {
      color: #569cd6;
      font-style: italic;
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

    .string-input::before {
      content: '"';
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
export class SmartDataEditorComponent {
  dataState = inject(DataState);
  parserState = inject(ParserState);
  private orchestrator = inject(OrchestratorService);

  private expandedPaths = signal<Set<string>>(new Set(['', 'usuario']));

  objectEntries(obj: unknown): Array<{ key: string; value: unknown }> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  getEntries(obj: unknown): Array<{ key: string; value: unknown }> {
    return this.objectEntries(obj);
  }

  isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  isArray(value: unknown): boolean {
    return Array.isArray(value);
  }

  isString(value: unknown): boolean {
    return typeof value === 'string';
  }

  isNumber(value: unknown): boolean {
    return typeof value === 'number';
  }

  isBoolean(value: unknown): boolean {
    return typeof value === 'boolean';
  }

  isNodeExpanded(path: string): boolean {
    return this.expandedPaths().has(path);
  }

  toggleNode(path: string): void {
    this.expandedPaths.update((paths) => {
      const next = new Set(paths);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  updateValue(path: string, value: unknown): void {
    this.dataState.updateValue(path, value);
    this.orchestrator.onDataChange();
  }

  toggleBoolean(path: string, currentValue: boolean): void {
    this.dataState.updateValue(path, !currentValue);
    this.orchestrator.onDataChange();
  }

  autoGenerateMock(): void {
    const variables = this.parserState.variables();
    const data = this.buildDataFromVariables(variables);
    this.dataState.setData(data);
    this.orchestrator.onDataChange();

    // Expand all nodes after generating
    const paths = new Set<string>(['']);
    for (const v of variables) {
      const parts = v.path.split('.');
      for (let i = 1; i <= parts.length; i++) {
        paths.add(parts.slice(0, i).join('.'));
      }
    }
    this.expandedPaths.set(paths);
  }

  private buildDataFromVariables(variables: PugVariable[]): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const v of variables) {
      this.setNestedValue(data, v.path, v.defaultValue);
    }
    return data;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }
}
