import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { DataState } from '../../core/state/data.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { TerminalState } from '../../core/state/terminal.state';
import type { DatasetKind } from '../../core/utils/datasets.util';

/** Barra de juegos de datos: elegir, crear, renombrar, duplicar, borrar, idioma de los mocks, regenerar e importar. */
@Component({
  selector: 'app-dataset-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dataset-bar" role="toolbar" aria-label="Juegos de datos">
      <select class="ds-select" aria-label="Juego de datos activo" title="Juego de datos activo"
              (change)="switchDataset($any($event.target).value)">
        @for (d of dataState.datasetOptions(); track d.id) {
          <option [value]="d.id" [selected]="d.id === dataState.activeId()">{{ d.name }}</option>
        }
      </select>
      <select class="ds-select ds-new" aria-label="Crear juego de datos" title="Crear un juego de datos nuevo"
              (change)="createDataset($any($event.target))">
        <option value="" selected>+ Nuevo…</option>
        <option value="empty">Vacío</option>
        <option value="full">Lleno</option>
        <option value="error">Error</option>
        <option value="custom">Copia personalizada</option>
      </select>
      <button class="icon-btn" (click)="renameDataset()" title="Renombrar juego de datos" aria-label="Renombrar juego de datos">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">edit</span>
      </button>
      <button class="icon-btn" (click)="duplicateDataset()" title="Duplicar juego de datos" aria-label="Duplicar juego de datos">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">file_copy</span>
      </button>
      <button class="icon-btn" [disabled]="dataState.datasets().length <= 1" (click)="deleteDataset()" title="Borrar juego de datos" aria-label="Borrar juego de datos">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">delete_forever</span>
      </button>
      <span class="ds-spacer"></span>
      <select class="ds-select ds-locale" aria-label="Idioma de los datos de ejemplo" title="Idioma de los datos de ejemplo"
              (change)="setLocale($any($event.target).value)">
        <option value="es" [selected]="dataState.locale() === 'es'">es</option>
        <option value="en" [selected]="dataState.locale() === 'en'">en</option>
      </select>
      <button class="mock-btn" (click)="regenerate()" title="Rellenar con datos de ejemplo nuevos (se puede deshacer)">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">casino</span>
        <span class="mock-label">Regenerar</span>
      </button>
      <button class="mock-btn" (click)="importInput.click()" title="Importar un JSON, JSON Schema u OpenAPI como juego de datos nuevo">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px;">upload_file</span>
        <span class="mock-label">Importar</span>
      </button>
      <input #importInput type="file" accept=".json,application/json" hidden (change)="importFile($event)" />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      flex-shrink: 0;
    }

    .dataset-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 4px 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
      flex-shrink: 0;
    }

    .ds-spacer {
      flex: 1;
    }

    .ds-select {
      background: var(--bg-surface-variant);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 3px 6px;
      max-width: 160px;
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
  `],
})
export class DatasetBarComponent {
  protected dataState = inject(DataState);
  private orchestrator = inject(OrchestratorService);
  private terminalState = inject(TerminalState);

  /** Se emite antes de tocar los datos: el editor guarda lo escrito en el modo JSON. */
  readonly beforeChange = output<void>();
  /** Se emite cuando los datos cambiaron por esta barra: el editor refresca el árbol / el JSON. */
  readonly changed = output<void>();

  switchDataset(id: string): void {
    this.beforeChange.emit();
    this.orchestrator.switchDataset(id);
    this.changed.emit();
  }

  async createDataset(select: HTMLSelectElement): Promise<void> {
    const kind = select.value as Exclude<DatasetKind, 'default'> | '';
    select.value = '';
    if (!kind) return;
    this.beforeChange.emit();
    await this.orchestrator.createDataset(kind);
    this.changed.emit();
  }

  renameDataset(): void {
    const current = this.dataState.activeDataset();
    const name = window.prompt('Nuevo nombre del juego de datos', current?.name ?? '');
    if (name && current) this.dataState.renameDataset(current.id, name);
  }

  duplicateDataset(): void {
    this.beforeChange.emit();
    this.orchestrator.duplicateDataset(this.dataState.activeId());
    this.changed.emit();
  }

  deleteDataset(): void {
    const current = this.dataState.activeDataset();
    if (!current || !window.confirm(`¿Borrar el juego de datos "${current.name}"?`)) return;
    this.orchestrator.deleteDataset(current.id);
    this.changed.emit();
  }

  setLocale(locale: string): void {
    this.orchestrator.setMockLocale(locale === 'en' ? 'en' : 'es');
  }

  async regenerate(): Promise<void> {
    this.beforeChange.emit();
    await this.orchestrator.regenerateMocks();
    this.changed.emit();
    this.terminalState.addEntry('success', 'Datos', 'Datos de ejemplo regenerados (puedes deshacer).');
  }

  async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const doc = JSON.parse(await file.text());
      this.beforeChange.emit();
      const { source, warnings } = this.orchestrator.importDataDocument(doc, file.name.replace(/\.json$/i, ''));
      const label = source === 'openapi' ? 'OpenAPI' : source === 'json-schema' ? 'JSON Schema' : 'JSON';
      this.terminalState.addEntry('success', 'Datos', `Importado ${file.name} (${label}) como juego de datos nuevo.`);
      for (const w of warnings) this.terminalState.addEntry('warning', 'Datos', w);
      this.changed.emit();
    } catch (e: unknown) {
      this.terminalState.addEntry('error', 'Datos', `No se pudo importar ${file.name}: ${(e as Error).message}`);
    }
  }
}
