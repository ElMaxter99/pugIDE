import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { DataState } from '../../core/state/data.state';
import { TerminalState } from '../../core/state/terminal.state';
import { UiState } from '../../core/state/ui.state';
import { CSV_MAX_ROWS, CsvDelimiter, buildCsvDatasets, csvChunks, detectDelimiter } from '../../core/utils/csv.util';
import { focusableElements, rememberFocus, trapTab } from '../../core/utils/focus-trap.util';

type DelimiterChoice = 'auto' | CsvDelimiter;
interface Done { count: number; file: string; active: string; ids: string[] }

const SEP_NAME: Record<CsvDelimiter, string> = { ',': ',', ';': ';', '\t': 'tabulador' };

/**
 * «Importar CSV» (P-44): una fila = un juego de datos, la primera fila son las claves. Vista previa antes de importar,
 * avisos de filas raras, tope de 500 filas por importación (en tandas) y «Deshacer» después. Solo se lee el archivo elegido.
 */
@Component({
  selector: 'app-csv-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.csvImport(); as src) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Importar CSV · ' + src.name" tabindex="-1" data-testid="csv-import"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Importar CSV · {{ src.name }}</h2></div>
          <div class="body">
            <p class="meta" data-testid="csv-summary">{{ summary() }} Solo se lee este archivo.</p>
            <div class="two">
              <label class="field s">Separador
                <select data-testid="csv-delimiter" (change)="delimiterChoice.set($any($event.target).value)">
                  <option value="auto" [selected]="delimiterChoice() === 'auto'">Detectar ({{ sepName(detected()) }})</option>
                  <option value="," [selected]="delimiterChoice() === ','">Coma (,)</option>
                  <option value=";" [selected]="delimiterChoice() === ';'">Punto y coma (;)</option>
                  <option value="&#9;" [selected]="delimiterChoice() === '\\t'">Tabulador</option>
                </select>
              </label>
              <label class="field grow">Nombre de cada juego
                <select data-testid="csv-name-column" (change)="nameColumn.set(+$any($event.target).value)">
                  @for (k of keys(); track $index) { <option [value]="$index" [selected]="$index === nameColumn()">{{ k }}</option> }
                  <option value="-1" [selected]="nameColumn() === -1">Fila 1, Fila 2…</option>
                </select>
              </label>
            </div>
            <label class="check"><input type="checkbox" data-testid="csv-header" [checked]="header()" (change)="header.set($any($event.target).checked)" />La primera fila son las claves</label>
            <label class="check"><input type="checkbox" data-testid="csv-as-text" [checked]="asText()" (change)="asText.set($any($event.target).checked)" />Todo como texto (no convertir números ni sí/no)</label>
            @if (result().error; as err) {
              <div class="bar error" role="alert" data-testid="csv-error"><span aria-hidden="true" class="material-symbols-outlined">error</span><span class="grow">No se puede importar: {{ err }}</span></div>
            } @else {
              <div class="table-wrap" data-testid="csv-preview">
                <table>
                  <thead><tr>@for (k of result().keys; track $index) { <th>{{ k }}&ngsp;<span class="badge">{{ result().types[$index] }}</span></th> }</tr></thead>
                  <tbody>@for (r of result().preview; track $index) { <tr>@for (c of result().keys; track $index) { <td>{{ r[$index] ?? '' }}</td> }</tr> }</tbody>
                </table>
              </div>
              <p class="note">Las claves con punto crean objetos: <code>paciente.nombre</code> → <code>{{ '{ paciente: { nombre } }' }}</code>, como en el resto de los datos.</p>
              @if (result().total > max) {
                <div class="bar warn" role="status" data-testid="csv-many">
                  <span aria-hidden="true" class="material-symbols-outlined">warning</span>
                  <span class="grow"><b>{{ result().total }} filas.</b> Se importan {{ result().datasets.length }} (cada PDF tarda 1–2 s: {{ max }} son unos 15 minutos). Elige la tanda; el resto, en otra importación.</span>
                </div>
                <div class="seg" role="group" aria-label="Tanda de filas">
                  @for (c of chunks(); track c.offset) { <button type="button" [attr.data-testid]="'csv-chunk-' + c.offset" [attr.aria-pressed]="offset() === c.offset" (click)="offset.set(c.offset)">{{ c.label }}</button> }
                </div>
              }
            }
            @for (w of result().warnings; track w) {
              <div class="bar warn" role="status" data-testid="csv-warning"><span aria-hidden="true" class="material-symbols-outlined">warning</span><span class="grow">{{ w }}</span></div>
            }
            @if (badEncoding()) {
              <div class="bar warn" role="status" data-testid="csv-encoding"><span aria-hidden="true" class="material-symbols-outlined">warning</span>
                <span class="grow">Hay caracteres que no se pudieron leer: guarda el archivo como «CSV UTF-8» y vuelve a elegirlo.</span></div>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" data-testid="csv-cancel" (click)="close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="csv-go" [disabled]="!!result().error || !result().datasets.length" (click)="run()">
              <span aria-hidden="true" class="material-symbols-outlined">upload_file</span>Importar {{ result().datasets.length }} {{ result().datasets.length === 1 ? 'juego' : 'juegos' }}</button>
          </div>
        </div>
      </div>
    }
    @if (done(); as d) {
      <div class="toast" role="status" data-testid="csv-done">
        <span aria-hidden="true" class="material-symbols-outlined ok-icon">check_circle</span>
        <div class="grow">
          <div><b>{{ d.count }} {{ d.count === 1 ? 'juego de datos importado' : 'juegos de datos importados' }}</b></div>
          <div class="sub">{{ d.file }} · el juego activo sigue siendo «{{ d.active }}»</div>
          <div class="actions"><button type="button" class="btn link" data-testid="csv-undo" (click)="undo(d)"><span aria-hidden="true" class="material-symbols-outlined">undo</span>Deshacer</button></div>
        </div>
        <button type="button" class="close" aria-label="Cerrar aviso" data-testid="csv-done-close" (click)="done.set(null)">×</button>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 780px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 4px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .body { padding: 4px 20px 12px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
    .meta, .note { margin: 0; font-size: 12px; line-height: 1.5; }
    .two { display: flex; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; min-width: 0; }
    .field.s { width: 34%; }
    .grow { flex: 1; min-width: 0; }
    .field select { height: 34px; padding: 0 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font: inherit; font-size: 13px; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); width: 15px; height: 15px; }
    .table-wrap { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); overflow: auto; max-height: 230px; }
    table { border-collapse: collapse; width: 100%; }
    th { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: var(--accent-color); white-space: nowrap; }
    td { padding: 6px 10px; border-bottom: 1px solid var(--border-color); font-size: 12px; color: var(--text-primary); white-space: nowrap; }
    .badge { margin-left: 6px; font-family: var(--font-sans, inherit); font-size: 10px; font-weight: 700; color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 999px; padding: 0 6px; }
    code { font-family: var(--font-mono); font-size: 12px; }
    .seg { display: inline-flex; align-self: flex-start; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; flex-wrap: wrap; }
    .seg button { height: 30px; padding: 0 12px; border: 0; background: var(--bg-input); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .seg button + button { border-left: 1px solid var(--border-color); }
    .seg button[aria-pressed="true"] { background: var(--bg-tertiary); color: var(--accent-color); }
    .bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
    .bar .material-symbols-outlined { font-size: 18px; }
    .bar.error { border-color: var(--error-color); } .bar.error .material-symbols-outlined { color: var(--error-color); }
    .bar.warn { border-color: var(--warning-color); } .bar.warn .material-symbols-outlined { color: var(--warning-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn.link { background: none; border: none; color: var(--accent-color); padding: 6px 4px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .toast { position: fixed; right: 16px; bottom: 40px; z-index: 2100; width: 440px; max-width: calc(100vw - 32px); display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); font-size: 13px; color: var(--text-primary); }
    .ok-icon { color: var(--success-color); font-size: 20px; }
    .sub { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .actions { margin-top: 8px; display: flex; gap: 8px; }
    .close { width: 24px; height: 24px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
  `],
})
export class CsvImportDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly dataState = inject(DataState);
  private readonly terminal = inject(TerminalState);

  protected readonly max = CSV_MAX_ROWS;
  protected readonly delimiterChoice = signal<DelimiterChoice>('auto');
  protected readonly header = signal(true);
  protected readonly asText = signal(false);
  protected readonly nameColumn = signal(0);
  protected readonly offset = signal(0);
  protected readonly done = signal<Done | null>(null);

  private readonly text = computed(() => this.ui.csvImport()?.text ?? '');
  protected readonly detected = computed<CsvDelimiter>(() => detectDelimiter(this.text()));
  protected readonly delimiter = computed<CsvDelimiter>(() => (this.delimiterChoice() === 'auto' ? this.detected() : (this.delimiterChoice() as CsvDelimiter)));
  protected readonly badEncoding = computed(() => this.text().includes('\uFFFD'));
  protected readonly result = computed(() => buildCsvDatasets(this.text(), {
    delimiter: this.delimiter(), header: this.header(), asText: this.asText(), nameColumn: this.nameColumn(), offset: this.offset(), limit: CSV_MAX_ROWS,
  }));
  protected readonly keys = computed(() => this.result().keys);
  protected readonly chunks = computed(() => csvChunks(this.result().total));
  protected readonly summary = computed(() => {
    const r = this.result();
    const cols = r.keys.length;
    const sep = this.delimiterChoice() === 'auto' ? `separador «${SEP_NAME[this.delimiter()]}» detectado` : `separador «${SEP_NAME[this.delimiter()]}»`;
    return `${r.total} ${r.total === 1 ? 'fila' : 'filas'} · ${cols} ${cols === 1 ? 'columna' : 'columnas'} · ${sep}.`;
  });

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.csvImport()) {
        untracked(() => {
          this.delimiterChoice.set('auto');
          this.header.set(true);
          this.asText.set(false);
          this.nameColumn.set(0);
          this.offset.set(0);
          this.done.set(null);
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
    // Al cambiar de separador o de «primera fila», la columna del nombre y la tanda vuelven a su sitio.
    effect(() => {
      this.delimiter(); this.header();
      untracked(() => { this.nameColumn.set(0); this.offset.set(0); });
    });
  }

  protected sepName(d: CsvDelimiter): string { return SEP_NAME[d]; }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void { this.ui.csvImport.set(null); }

  protected run(): void {
    const src = this.ui.csvImport();
    const r = this.result();
    if (!src || r.error || !r.datasets.length) return;
    const active = this.dataState.activeDataset()?.name ?? 'Por defecto';
    const ids = this.orchestrator.importCsvDatasets(r.datasets);
    this.terminal.addEntry('success', 'Datos', `Importado ${src.name} (CSV): ${r.datasets.length} ${r.datasets.length === 1 ? 'juego de datos' : 'juegos de datos'} (${r.keys.slice(0, 6).join(', ')}${r.keys.length > 6 ? '…' : ''}).`);
    for (const w of r.warnings) this.terminal.addEntry('warning', 'Datos', w);
    this.done.set({ count: ids.length, file: src.name, active, ids });
    this.ui.csvImport.set(null);
  }

  protected undo(d: Done): void {
    this.orchestrator.undoCsvImport(d.ids);
    this.terminal.addEntry('info', 'Datos', `Importación de ${d.file} deshecha: ${d.count} ${d.count === 1 ? 'juego quitado' : 'juegos quitados'}.`);
    this.done.set(null);
  }
}
