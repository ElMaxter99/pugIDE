import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { DataState } from '../../core/state/data.state';
import { ParserState } from '../../core/state/parser.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { TerminalState } from '../../core/state/terminal.state';

interface TreeNode {
  key: string;
  path: string;
  depth: number;
  kind: 'object-open' | 'array-open' | 'object-close' | 'array-close' | 'leaf' | 'inline-array';
  value?: unknown;
  valueType?: string;
  itemCount?: number;
  isExpanded?: boolean;
  inlineItems?: string[];
}

@Component({
  selector: 'app-smart-data-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="data-section">
      <div class="data-header">
        <span class="data-title">Data</span>
        <div class="data-actions">
          <button class="mode-toggle" [class.active]="jsonRawMode()" (click)="toggleMode()" [title]="jsonRawMode() ? 'Switch to visual tree (Ctrl+Shift+J)' : 'Switch to JSON editor (Ctrl+Shift+J)'">
            <span class="mode-label">{{ jsonRawMode() ? 'JSON' : 'Tree' }}</span>
          </button>
          <button class="icon-btn" (click)="copyJsonToClipboard()" title="Copy JSON to clipboard">
            <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
          </button>
          <button class="mock-btn" (click)="clearData()">
            <span class="material-symbols-outlined" style="font-size: 14px;">delete</span>
            <span class="mock-label">Dejar objeto vacío</span>
          </button>
        </div>
      </div>

      @if (!jsonRawMode()) {
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
      }

      <div class="json-editor-area" [class.hidden]="!jsonRawMode()">
        @if (jsonError()) {
          <div class="json-error-bar">
            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--error-color);">error</span>
            <span class="json-error-text">{{ jsonError() }}</span>
          </div>
        }
        <textarea
          #jsonArea
          class="json-textarea font-mono"
          (input)="onJsonInput($any($event.target).value)"
          (blur)="applyJson()"
          (keydown)="onTextareaKeydown($event)"
          spellcheck="false"
          placeholder="Enter valid JSON..."></textarea>
      </div>
    </section>
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

    .data-section {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
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

    .mode-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 4px;
      color: var(--text-secondary);
      background: var(--bg-surface-variant);
      transition: all 0.15s;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      cursor: pointer;
      border: 1px solid transparent;
    }

    .mode-toggle:hover {
      color: var(--text-primary);
      background: var(--bg-surface-container-highest);
      border-color: var(--border-color);
    }

    .mode-toggle.active {
      color: var(--accent-color);
      background: rgba(221, 183, 255, 0.12);
      border-color: var(--accent-color);
    }

    .mode-label {
      pointer-events: none;
    }

    .json-editor-area {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .json-editor-area.hidden {
      display: none;
    }

    .json-error-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 180, 171, 0.08);
      border-bottom: 1px solid rgba(255, 180, 171, 0.2);
      flex-shrink: 0;
    }

    .json-error-text {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--error-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .json-textarea {
      flex: 1;
      width: 100%;
      padding: 16px;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-size: 13px;
      line-height: 20px;
      resize: none;
      tab-size: 2;
      outline: none;
    }

    .json-textarea::placeholder {
      color: var(--text-tertiary);
      font-style: italic;
    }
  `],
})
export class SmartDataEditorComponent {
  dataState = inject(DataState);
  parserState = inject(ParserState);
  private orchestrator = inject(OrchestratorService);
  private terminalState = inject(TerminalState);

  @ViewChild('jsonArea') jsonArea!: ElementRef<HTMLTextAreaElement>;

  readonly openCurly = '{';
  readonly closeCurly = '}';
  readonly openBracket = '[';
  readonly closeBracket = ']';

  private expandedPaths = signal<Set<string>>(new Set(['', 'usuario']));
  jsonRawMode = signal(false);
  jsonError = signal<string | null>(null);
  rawJsonContent = signal('');

  flatRows = computed(() => {
    const data = this.dataState.data();
    const expanded = this.expandedPaths();
    return this.flattenTree(data, '', 0, expanded);
  });

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'J') {
      event.preventDefault();
      this.toggleMode();
    }
  }

  toggleMode(): void {
    const goingRaw = !this.jsonRawMode();
    if (goingRaw) {
      const json = JSON.stringify(this.dataState.data(), null, 2);
      this.jsonArea.nativeElement.value = json;
      this.rawJsonContent.set(json);
      this.jsonError.set(null);
    } else {
      this.applyJson();
    }
    this.jsonRawMode.set(goingRaw);
  }

  onJsonInput(value: string): void {
    this.rawJsonContent.set(value);
    try {
      JSON.parse(value);
      this.jsonError.set(null);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      this.jsonError.set(msg);
    }
  }

  applyJson(): void {
    const textarea = this.jsonArea?.nativeElement;
    const text = textarea ? textarea.value : this.rawJsonContent();
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        this.jsonError.set('Root must be a JSON object');
        this.terminalState.addEntry('error', 'DataEditor', 'Invalid JSON: root must be an object, not an array or primitive');
        return;
      }
      this.jsonError.set(null);
      this.dataState.setData(parsed);
      this.orchestrator.onDataChange();
    } catch (e: unknown) {
      const msg = (e as Error).message;
      this.jsonError.set(msg);
      this.terminalState.addEntry('error', 'DataEditor', `Invalid JSON: ${msg}`);
    }
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      this.jsonArea.nativeElement.value = newValue;
      this.rawJsonContent.set(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.applyJson();
      this.orchestrator.manualCompile();
    }
  }

  copyJsonToClipboard(): void {
    const text = JSON.stringify(this.dataState.data(), null, 2);
    navigator.clipboard.writeText(text).then(() => {
      this.terminalState.addEntry('success', 'DataEditor', 'JSON copied to clipboard');
    }).catch(() => {
      this.terminalState.addEntry('error', 'DataEditor', 'Failed to copy to clipboard');
    });
  }

  clearData(): void {
    this.dataState.setData({});
    this.orchestrator.onDataChange();
    if (this.jsonRawMode()) {
      this.jsonArea.nativeElement.value = '{}';
      this.rawJsonContent.set('{}');
      this.jsonError.set(null);
    }
    this.expandedPaths.set(new Set(['']));
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

  toggleBoolean(path: string, currentValue: unknown): void {
    this.dataState.updateValue(path, !currentValue);
    this.orchestrator.onDataChange();
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  }

  private flattenTree(
    obj: unknown,
    prefix: string,
    depth: number,
    expanded: Set<string>
  ): TreeNode[] {
    const rows: TreeNode[] = [];
    if (obj === null || obj === undefined || typeof obj !== 'object') return rows;

    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      const isExpandable = value !== null && typeof value === 'object' && !Array.isArray(value);
      const isArr = Array.isArray(value);

      if (isExpandable || isArr) {
        if (isArr) {
          const arr = value as unknown[];
          const isPrimitiveArr = arr.every(item => item === null || typeof item !== 'object');
          if (isPrimitiveArr) {
            rows.push({
              key,
              path,
              depth,
              kind: 'inline-array',
              inlineItems: arr.map(item => item === null ? 'null' : String(item)),
            });
            continue;
          }
        }
        const isExp = expanded.has(path);
        rows.push({
          key,
          path,
          depth,
          kind: isArr ? 'array-open' : 'object-open',
          itemCount: isArr ? (value as unknown[]).length : undefined,
          isExpanded: isExp,
        });
        if (isExp) {
          if (isArr) {
            const arr = value as unknown[];
            for (let i = 0; i < arr.length; i++) {
              const item = arr[i];
              const itemPath = `${path}.${i}`;
              if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
                rows.push({
                  key: String(i),
                  path: itemPath,
                  depth: depth + 1,
                  kind: 'object-open',
                  isExpanded: expanded.has(itemPath),
                });
                if (expanded.has(itemPath)) {
                  rows.push(...this.flattenTree(item, itemPath, depth + 2, expanded));
                  rows.push({
                    key: '',
                    path: itemPath,
                    depth: depth + 1,
                    kind: 'object-close',
                  });
                }
              } else {
                rows.push({
                  key: String(i),
                  path: itemPath,
                  depth: depth + 1,
                  kind: 'leaf',
                  value: item,
                  valueType: this.getValueType(item),
                });
              }
            }
            rows.push({
              key: '',
              path,
              depth,
              kind: 'array-close',
            });
          } else {
            rows.push(...this.flattenTree(value, path, depth + 1, expanded));
            rows.push({
              key: '',
              path,
              depth,
              kind: 'object-close',
            });
          }
        }
      } else {
        rows.push({
          key,
          path,
          depth,
          kind: 'leaf',
          value,
          valueType: this.getValueType(value),
        });
      }
    }
    return rows;
  }

  private getValueType(value: unknown): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    return 'string';
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
