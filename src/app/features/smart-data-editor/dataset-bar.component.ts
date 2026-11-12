import { Component, ChangeDetectionStrategy, computed, inject, output, viewChild, ElementRef } from '@angular/core';
import { DropdownMenuComponent, MenuItem } from '../../shared/components/dropdown-menu/dropdown-menu.component';
import { DataState } from '../../core/state/data.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { TerminalState } from '../../core/state/terminal.state';
import { AiService } from '../../core/services/ai.service';
import { UiState } from '../../core/state/ui.state';
import type { DatasetKind } from '../../core/utils/datasets.util';

/** Barra de juegos de datos: elegir, regenerar y, en el menú «⋯», crear, renombrar, duplicar, borrar, idioma de los mocks, importar, copiar y vaciar. */
@Component({
  selector: 'app-dataset-bar',
  standalone: true,
  imports: [DropdownMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dataset-bar" role="toolbar" aria-label="Juegos de datos">
      <select class="ds-select" aria-label="Juego de datos activo" title="Juego de datos activo"
              (change)="switchDataset($any($event.target).value)">
        @for (d of dataState.datasetOptions(); track d.id) {
          <option [value]="d.id" [selected]="d.id === dataState.activeId()">{{ d.name }}</option>
        }
      </select>
      <app-dropdown-menu
        label="Más acciones de datos"
        ariaLabel="Más acciones de datos"
        icon="more_horiz"
        [iconOnly]="true"
        [caret]="false"
        align="right"
        testId="data-more-menu"
        [items]="menuItems()"
        (chosen)="onMenu($event)" />
      <button type="button" class="regen-btn" (click)="regenerate()" title="Rellenar con datos de ejemplo nuevos (se puede deshacer)">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">casino</span>
        <span>Regenerar</span>
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
      gap: 8px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
      flex-shrink: 0;
    }

    .ds-select {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 32px;
      background: var(--bg-surface-variant);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      font-family: inherit;
      font-size: 13px;
      padding: 4px 8px;
    }

    .regen-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 32px;
      padding: 0 12px;
      white-space: nowrap;
      background: rgba(221, 183, 255, 0.12);
      border-radius: var(--radius);
      color: var(--accent-color);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      transition: background 0.15s;
    }

    .regen-btn:hover {
      background: rgba(221, 183, 255, 0.22);
    }
  `],
})
export class DatasetBarComponent {
  protected dataState = inject(DataState);
  private ai = inject(AiService);
  private ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private terminalState = inject(TerminalState);

  /** Se emite antes de tocar los datos: el editor guarda lo escrito en el modo JSON. */
  readonly beforeChange = output<void>();
  /** Se emite cuando los datos cambiaron por esta barra: el editor refresca el árbol / el JSON. */
  readonly changed = output<void>();
  /** Acciones del menú «⋯» que viven en el editor de datos (copiar el JSON y dejar el objeto vacío). */
  readonly copyJson = output<void>();
  readonly clearData = output<void>();

  private importInput = viewChild.required<ElementRef<HTMLInputElement>>('importInput');

  protected menuItems = computed<MenuItem[]>(() => [
    { heading: 'Juego de datos' },
    { id: 'new-empty', icon: 'add', label: 'Nuevo juego vacío' },
    { id: 'new-full', label: 'Nuevo juego lleno' },
    { id: 'new-error', label: 'Nuevo juego de error' },
    { id: 'new-custom', label: 'Nuevo juego como copia personalizada' },
    { id: 'rename', icon: 'edit', label: 'Renombrar…' },
    { id: 'duplicate', icon: 'file_copy', label: 'Duplicar' },
    { id: 'delete', icon: 'delete_forever', label: 'Borrar…', disabled: this.dataState.datasets().length <= 1 },
    { separator: true },
    { heading: 'Datos de ejemplo' },
    { id: 'locale-es', label: 'Idioma: es', checked: this.dataState.locale() === 'es', radio: true },
    { id: 'locale-en', label: 'Idioma: en', checked: this.dataState.locale() === 'en', radio: true },
    { separator: true },
    { heading: 'Entrada y salida' },
    { id: 'import', icon: 'upload_file', label: 'Importar JSON, Schema u OpenAPI…' },
    { id: 'copy', icon: 'content_copy', label: 'Copiar JSON' },
    { id: 'clear', icon: 'delete', label: 'Dejar objeto vacío…' },
    ...(this.ai.available ? [{ separator: true } as MenuItem, { id: 'ai', icon: 'neurology', label: 'Proponer datos con IA…' } as MenuItem] : []),
  ]);

  protected onMenu(id: string): void {
    switch (id) {
      case 'new-empty': void this.createDataset('empty'); break;
      case 'new-full': void this.createDataset('full'); break;
      case 'new-error': void this.createDataset('error'); break;
      case 'new-custom': void this.createDataset('custom'); break;
      case 'rename': this.renameDataset(); break;
      case 'duplicate': this.duplicateDataset(); break;
      case 'delete': this.deleteDataset(); break;
      case 'locale-es': this.setLocale('es'); break;
      case 'locale-en': this.setLocale('en'); break;
      case 'import': this.importInput().nativeElement.click(); break;
      case 'ai': this.ui.aiRequest.set({ task: 'data' }); break;
      case 'copy': this.copyJson.emit(); break;
      case 'clear': this.clearData.emit(); break;
    }
  }

  switchDataset(id: string): void {
    this.beforeChange.emit();
    this.orchestrator.switchDataset(id);
    this.changed.emit();
  }

  async createDataset(kind: Exclude<DatasetKind, 'default'>): Promise<void> {
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
