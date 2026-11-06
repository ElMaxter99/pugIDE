import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  HostListener,
  ViewChild,
  ElementRef,
  viewChild,
  input,
} from '@angular/core';
import { DataTreeComponent } from './data-tree.component';
import { PanelResizerComponent } from '../../shared/components/panel-resizer/panel-resizer.component';
import { LayoutService } from '../../core/services/layout.service';
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
  imports: [DatasetBarComponent, DataTreeComponent, PanelResizerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.embedded]': 'embedded()' },
  template: `
    <section class="data-section" aria-label="Datos">
      @if (!embedded()) {
        <app-panel-resizer
          testId="resizer-data"
          label="Ancho de los datos"
          edge="left"
          [value]="layout.resolved().data"
          [min]="layout.resolved().limits.data.min"
          [max]="layout.resolved().limits.data.max"
          [grow]="-1"
          (sizeChange)="layout.setLive('data', $event)"
          (committed)="layout.commitLive()"
          (restore)="layout.resetSize('data')" />
        <div class="data-header">
          <span class="data-title">Datos</span>
        </div>
      }

      <div class="data-tools">
        <div class="mode-group" role="group" aria-label="Modo del editor de datos" title="Cambiar entre árbol y JSON (Ctrl+Shift+J)">
          <button type="button" class="mode-seg" data-testid="data-mode-tree" [class.active]="!jsonRawMode()" [attr.aria-pressed]="!jsonRawMode()" (click)="setMode(false)">Árbol</button>
          <button type="button" class="mode-seg" data-testid="data-mode-json" [class.active]="jsonRawMode()" [attr.aria-pressed]="jsonRawMode()" (click)="setMode(true)">JSON</button>
        </div>
        <span class="tools-spacer"></span>
        <button class="icon-btn" [disabled]="!dataState.canUndo()" (click)="undo()" title="Deshacer" aria-label="Deshacer">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">undo</span>
        </button>
        <button class="icon-btn" [disabled]="!dataState.canRedo()" (click)="redo()" title="Rehacer" aria-label="Rehacer">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">redo</span>
        </button>
      </div>

      <app-dataset-bar (beforeChange)="applyJsonIfDirty()" (changed)="refreshAfterDatasetChange()" (copyJson)="copyJsonToClipboard()" (clearData)="clearData()" />

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
      min-width: 0;
      border-right: 1px solid var(--border-color);
      height: 100%;
      overflow: hidden;
      background: var(--bg-surface-container-low);
    }

    /* Dentro de la pestaña «Datos» del panel lateral: sin borde propio (lo pone el panel). */
    :host(.embedded) { border-right: 0; }

    .data-section {
      position: relative;
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

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
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

    .data-tools {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
      flex-shrink: 0;
    }

    .tools-spacer { flex: 1; }

    .mode-group {
      display: inline-flex;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .mode-seg {
      min-height: 30px;
      padding: 0 14px;
      font-family: inherit;
      font-size: 13px;
      color: var(--text-secondary);
      background: transparent;
    }

    .mode-seg:hover { color: var(--text-primary); background: var(--bg-surface-variant); }

    .mode-seg.active {
      color: var(--accent-color);
      background: rgba(221, 183, 255, 0.14);
      font-weight: 600;
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
  protected layout = inject(LayoutService);
  /** Dentro de la pestaña «Datos» del panel lateral (sin cabecera ni borde); si no, es la columna de «Editor + datos + vista previa». */
  readonly embedded = input(false);
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
      // Dentro del panel lateral, Ctrl+Mayús+J enseña antes la pestaña «Datos» si estaba recogida u oculta.
      if (this.embedded() && (this.preferences.sidebarCollapsed() || this.preferences.sidebarTab() !== 'datos')) this.layout.openSidebar('datos');
      this.toggleMode();
    }
  }

  /** Segmentado «Árbol | JSON»: cambia solo si el modo pedido no es el actual. */
  setMode(raw: boolean): void {
    if (raw !== this.jsonRawMode()) this.toggleMode();
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
