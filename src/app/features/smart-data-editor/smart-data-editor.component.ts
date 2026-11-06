import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
  ViewChild,
  ElementRef,
  viewChild,
} from '@angular/core';
import { DataTreeComponent } from './data-tree.component';
import { DatasetBarComponent } from './dataset-bar.component';
import { DataState } from '../../core/state/data.state';
import { PreferencesState } from '../../core/services/preferences.state';
import { ParserState } from '../../core/state/parser.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { TerminalState } from '../../core/state/terminal.state';
import { insertIndent, parseDataJson, stringifyData } from '../../core/utils/data-tree.util';

@Component({
  selector: 'app-smart-data-editor',
  standalone: true,
  imports: [DatasetBarComponent, DataTreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.collapsed]': 'preferences.dataCollapsed()' },
  template: `
    <button class="rail-btn" (click)="preferences.toggleData()" title="Mostrar Datos" aria-label="Mostrar Datos">
      <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">right_panel_open</span>
      <span class="rail-label">Datos</span>
    </button>
    <section class="data-section" aria-label="Datos">
      <div class="data-header">
        <span class="data-title">Datos</span>
        <div class="data-actions">
          <button class="icon-btn" (click)="preferences.toggleData()" title="Colapsar Datos" aria-label="Colapsar Datos">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">right_panel_close</span>
          </button>
          <button class="mode-toggle" [class.active]="jsonRawMode()" (click)="toggleMode()" [title]="jsonRawMode() ? 'Cambiar al árbol visual (Ctrl+Shift+J)' : 'Cambiar al editor JSON (Ctrl+Shift+J)'" [attr.aria-label]="jsonRawMode() ? 'Modo JSON: cambiar al árbol visual' : 'Modo Árbol: cambiar al editor JSON'">
            <span class="mode-label">{{ jsonRawMode() ? 'JSON' : 'Árbol' }}</span>
          </button>
          <button class="icon-btn" [disabled]="!dataState.canUndo()" (click)="undo()" title="Deshacer" aria-label="Deshacer">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">undo</span>
          </button>
          <button class="icon-btn" [disabled]="!dataState.canRedo()" (click)="redo()" title="Rehacer" aria-label="Rehacer">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">redo</span>
          </button>
          <button class="icon-btn" (click)="copyJsonToClipboard()" title="Copiar JSON al portapapeles" aria-label="Copiar JSON al portapapeles">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
          </button>
          <button class="mock-btn" (click)="clearData()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">delete</span>
            <span class="mock-label">Dejar objeto vacío</span>
          </button>
        </div>
      </div>

      <app-dataset-bar (beforeChange)="applyJsonIfDirty()" (changed)="refreshAfterDatasetChange()" />

      <app-data-tree #tree [class.hidden]="jsonRawMode()" />

      <div class="json-editor-area" [class.hidden]="!jsonRawMode()">
        @if (jsonError()) {
          <div class="json-error-bar">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px; color: var(--error-color);">error</span>
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

    :host(.collapsed) {
      flex: 0 0 40px;
      min-width: 40px;
      width: 40px;
    }
    :host(.collapsed) .data-section { display: none; }
    .rail-btn { display: none; }
    :host(.collapsed) .rail-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 0;
      color: var(--text-secondary);
    }
    .rail-btn:hover { color: var(--text-primary); background: var(--bg-surface-variant); }
    .rail-label {
      writing-mode: vertical-rl;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-section {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }

    .data-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 4px 8px;
      min-height: 36px;
      padding: 4px 16px;
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
      flex-wrap: wrap;
      margin-left: auto;
      align-items: center;
      gap: 8px;
    }

    .mock-btn {
      white-space: nowrap;
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

    .icon-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    .icon-btn:disabled:hover {
      background: none;
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
  preferences = inject(PreferencesState);
  parserState = inject(ParserState);
  private orchestrator = inject(OrchestratorService);
  private terminalState = inject(TerminalState);

  @ViewChild('jsonArea') jsonArea!: ElementRef<HTMLTextAreaElement>;
  private tree = viewChild.required<DataTreeComponent>('tree');

  jsonRawMode = signal(false);
  jsonError = signal<string | null>(null);
  rawJsonContent = signal('');

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
      this.showJson(stringifyData(this.dataState.data()));
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
      this.jsonError.set((e as Error).message);
    }
  }

  /** Pone `json` en el área de texto del modo JSON y limpia el error. */
  private showJson(json: string): void {
    this.jsonArea.nativeElement.value = json;
    this.rawJsonContent.set(json);
    this.jsonError.set(null);
  }

  applyJson(): void {
    const textarea = this.jsonArea?.nativeElement;
    const text = textarea ? textarea.value : this.rawJsonContent();
    const result = parseDataJson(text);
    if (!result.ok) {
      this.jsonError.set(result.error);
      this.terminalState.addEntry('error', 'Datos', result.rootNotObject
        ? 'JSON no válido: la raíz debe ser un objeto, no una lista ni un valor simple'
        : `JSON no válido: ${result.error}`);
      return;
    }
    this.jsonError.set(null);
    this.dataState.setData(result.value);
    this.orchestrator.onDataChange();
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const { value: newValue, cursor } = insertIndent(textarea.value, start, end);
      this.jsonArea.nativeElement.value = newValue;
      this.rawJsonContent.set(newValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = cursor;
      });
    } else if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.applyJson();
      this.orchestrator.manualCompile();
    }
  }

  copyJsonToClipboard(): void {
    const text = stringifyData(this.dataState.data());
    navigator.clipboard.writeText(text).then(() => {
      this.terminalState.addEntry('success', 'Datos', 'JSON copiado al portapapeles');
    }).catch(() => {
      this.terminalState.addEntry('error', 'Datos', 'No se pudo copiar al portapapeles');
    });
  }

  async clearData(): Promise<void> {
    const emptyData = await this.orchestrator.clearDataWithKeys();
    this.dataState.setData(emptyData);
    this.orchestrator.onDataChange();
    if (this.jsonRawMode()) this.showJson(stringifyData(emptyData));
    this.tree().expand(['']);
  }

  /** Tras cambiar los datos por otra vía, el modo JSON y los nodos abiertos deben reflejar el estado actual. */
  /** Guarda lo escrito en el modo JSON antes de cambiar de juego, para no perderlo. */
  protected applyJsonIfDirty(): void {
    if (this.jsonRawMode() && !this.jsonError()) this.applyJson();
  }

  protected refreshAfterDatasetChange(): void {
    if (this.jsonRawMode() && this.jsonArea) this.showJson(stringifyData(this.dataState.data()));
    this.tree().expand(['', ...Object.keys(this.dataState.data())]);
  }

  undo(): void {
    this.dataState.undo();
    this.orchestrator.onDataChange();
  }

  redo(): void {
    this.dataState.redo();
    this.orchestrator.onDataChange();
  }


}
