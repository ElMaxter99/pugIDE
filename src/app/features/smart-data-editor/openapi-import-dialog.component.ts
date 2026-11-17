import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { TerminalState } from '../../core/state/terminal.state';
import { UiState } from '../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../core/utils/focus-trap.util';
import { OpenApiOperation, OpenApiValues, listOperations, missingKeys, operationData, previewLines, summarizeOpenApi } from '../../core/utils/openapi-ops.util';

/**
 * «Importar de OpenAPI» (P-43): se elige la operación (`GET /facturas/{id}`) y su respuesta, y el juego de datos sale con
 * la forma exacta de lo que recibe la plantilla. No se llama a la API: solo se lee el archivo elegido.
 */
@Component({
  selector: 'app-openapi-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.openApiImport(); as src) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Importar de OpenAPI · ' + src.name" tabindex="-1" data-testid="openapi-import"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Importar de OpenAPI · {{ src.name }}</h2></div>
          <p class="meta" data-testid="openapi-summary">{{ summaryText() }} Solo se lee este archivo: no se llama a la API.</p>
          @if (ops().length === 0) {
            <div class="body">
              <div class="bar info" role="status" data-testid="openapi-no-ops">
                <span aria-hidden="true" class="material-symbols-outlined">info</span>
                <span class="grow">Este OpenAPI no declara operaciones (<code>paths</code>). Se importan sus {{ summary().schemas }} esquemas, como hasta ahora.</span>
              </div>
            </div>
            <div class="footer">
              <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
              <button type="button" class="btn primary" data-testid="openapi-schemas" (click)="importSchemas()"><span aria-hidden="true" class="material-symbols-outlined">upload_file</span>Importar esquemas</button>
            </div>
          } @else {
            <div class="cols">
              <div class="body">
                <label class="search"><span aria-hidden="true" class="material-symbols-outlined">search</span>
                  <input type="text" data-testid="openapi-filter" aria-label="Filtrar operaciones" placeholder="Filtrar por ruta, método o texto" [value]="filter()" (input)="filter.set($any($event.target).value)" />
                  <span class="count">{{ shown().length }} de {{ ops().length }}</span></label>
                <div class="ops" role="group" aria-label="Operaciones" data-testid="openapi-ops">
                  @for (g of groups(); track g.tag) {
                    @if (g.tag) { <div class="tag">{{ g.tag }} · {{ g.ops.length }}</div> }
                    @for (o of g.ops; track o.id) {
                      <button type="button" class="op" [class.off]="o.unusable" [attr.aria-pressed]="chosen()?.id === o.id" [disabled]="!!o.unusable" [attr.data-testid]="'openapi-op-' + o.id" (click)="choose(o)">
                        <span class="method" [attr.data-method]="o.method">{{ o.method }}</span><span class="path">{{ o.path }}</span>
                        <span class="sum">{{ o.unusable ?? o.summary }}</span>
                      </button>
                    }
                  } @empty { <div class="empty">Ninguna operación coincide.</div> }
                </div>
                <div class="two">
                  <label class="field grow">Respuesta
                    <select data-testid="openapi-response" [disabled]="!chosen()" (change)="responseIndex.set(+$any($event.target).value)">
                      @for (r of chosen()?.responses ?? []; track r.key; let i = $index) { <option [value]="i" [selected]="i === responseIndex()">{{ r.label }}</option> }
                    </select>
                  </label>
                  <label class="field">Valores
                    <select data-testid="openapi-values" (change)="values.set($any($event.target).value)">
                      <option value="examples" [selected]="values() === 'examples'">Ejemplos del documento</option>
                      <option value="generated" [selected]="values() === 'generated'">Generados</option>
                    </select>
                  </label>
                </div>
                <label class="field">Nombre del juego de datos
                  <input type="text" data-testid="openapi-name" [value]="name()" (input)="name.set($any($event.target).value)" />
                </label>
              </div>
              <div class="preview" aria-live="polite" data-testid="openapi-preview">
                <div class="meta2">Vista previa de los datos · {{ preview().keys }} claves</div>
                @for (l of preview().lines; track $index) {
                  <div class="kv" [style.padding-left.px]="l.depth * 16"><span class="k">{{ l.key }}</span><span class="v" [class.muted]="l.muted">{{ l.value }}</span></div>
                }
                @if (preview().more) { <div class="kv"><span class="k">… {{ preview().more }} más</span></div> }
                @if (missing().length) {
                  <div class="bar warn" role="status" data-testid="openapi-missing">
                    <span aria-hidden="true" class="material-symbols-outlined">warning</span>
                    <span class="grow">La plantilla usa <code>{{ missing()[0] }}</code>{{ missing().length > 1 ? ' y ' + (missing().length - 1) + ' más' : '' }}, que esta respuesta no trae.</span>
                  </div>
                }
              </div>
            </div>
            <div class="footer">
              <button type="button" class="btn link" data-testid="openapi-schemas" (click)="importSchemas()">Importar todos los esquemas</button>
              <span class="grow"></span>
              <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
              <button type="button" class="btn primary" data-testid="openapi-go" [disabled]="busy() || !chosen() || !name().trim()" (click)="run()"><span aria-hidden="true" class="material-symbols-outlined">upload_file</span>Importar</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 960px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 4px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .meta { margin: 0; padding: 0 20px 8px; font-size: 12px; color: var(--text-secondary); }
    .cols { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; padding: 0 20px 8px; }
    .body { padding: 0 20px 8px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text-secondary); }
    .cols .body { padding: 0; }
    .search { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; }
    .search input { flex: 1; min-width: 0; background: none; border: 0; outline: none; color: var(--text-primary); font: inherit; font-size: 13px; }
    .search .material-symbols-outlined { font-size: 18px; color: var(--text-secondary); }
    .count { font-size: 12px; white-space: nowrap; }
    .ops { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); padding: 4px; max-height: 230px; overflow: auto; display: flex; flex-direction: column; }
    .tag { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: .04em; padding: 6px 10px 2px; }
    .op { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 4px 10px; border: 0; border-radius: 4px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .op[aria-pressed="true"] { background: var(--bg-tertiary); }
    .op:hover:not(:disabled) { background: var(--bg-tertiary); }
    .op.off { color: var(--text-secondary); cursor: not-allowed; opacity: 0.75; }
    .method { width: 52px; flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--warning-color); }
    .method[data-method="GET"] { color: var(--success-color); } .method[data-method="POST"] { color: var(--info-color, var(--accent-color)); }
    .path { font-family: var(--font-mono); font-size: 12px; flex-shrink: 0; }
    .sum { font-size: 12px; color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .empty { padding: 10px; font-size: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .field select, .field input { height: 34px; padding: 0 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font: inherit; font-size: 13px; min-width: 0; }
    .two { display: flex; gap: 12px; }
    .grow { flex: 1; min-width: 0; }
    .preview { border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); padding: 12px 14px; align-self: start; display: flex; flex-direction: column; gap: 2px; max-height: 440px; overflow: auto; }
    .meta2 { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .kv { display: flex; gap: 10px; font-family: var(--font-mono); font-size: 12px; padding: 2px 0; }
    .k { color: var(--accent-color); min-width: 110px; } .v { color: var(--text-primary); overflow-wrap: anywhere; } .v.muted { color: var(--text-secondary); }
    code { font-family: var(--font-mono); font-size: 12px; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-top: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
    .bar .material-symbols-outlined { font-size: 18px; }
    .bar.warn { border-color: var(--warning-color); } .bar.warn .material-symbols-outlined { color: var(--warning-color); }
    .bar.info { border-color: var(--info-color, var(--accent-color)); } .bar.info .material-symbols-outlined { color: var(--info-color, var(--accent-color)); }
    .footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 8px 20px 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn.link { background: none; border: none; color: var(--accent-color); padding: 6px 4px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    @media (max-width: 800px) { .cols { grid-template-columns: 1fr; } }
  `],
})
export class OpenApiImportDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly terminal = inject(TerminalState);

  protected readonly filter = signal('');
  protected readonly chosen = signal<OpenApiOperation | null>(null);
  protected readonly responseIndex = signal(0);
  protected readonly values = signal<OpenApiValues>('examples');
  protected readonly name = signal('');
  protected readonly busy = signal(false);
  private readonly used = signal<string[]>([]);
  private seed = 1;

  protected readonly doc = computed(() => this.ui.openApiImport()?.doc);
  protected readonly ops = computed(() => listOperations(this.doc()));
  protected readonly summary = computed(() => summarizeOpenApi(this.doc()));
  protected readonly summaryText = computed(() => {
    const s = this.summary();
    const title = [s.title, s.version].filter(Boolean).join(' ');
    return `${title ? title + ' · ' : ''}${s.operations} ${s.operations === 1 ? 'operación' : 'operaciones'} · ${s.schemas} ${s.schemas === 1 ? 'esquema' : 'esquemas'}.`;
  });
  protected readonly shown = computed(() => {
    const q = this.filter().trim().toLowerCase();
    return q ? this.ops().filter((o) => `${o.method} ${o.path} ${o.summary} ${o.tag}`.toLowerCase().includes(q)) : this.ops();
  });
  protected readonly groups = computed(() => {
    const map = new Map<string, OpenApiOperation[]>();
    for (const o of this.shown()) map.set(o.tag, [...(map.get(o.tag) ?? []), o]);
    return [...map.entries()].map(([tag, ops]) => ({ tag, ops }));
  });
  private readonly response = computed(() => this.chosen()?.responses[this.responseIndex()] ?? null);
  private readonly data = computed(() => {
    const r = this.response();
    return r ? operationData(this.doc(), r, this.values(), { seed: this.seed }) : null;
  });
  protected readonly preview = computed(() => previewLines(this.data()?.data ?? {}));
  protected readonly missing = computed(() => missingKeys(this.data()?.data ?? {}, this.used()));

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.openApiImport()) {
        untracked(() => {
          this.filter.set('');
          this.values.set('examples');
          this.busy.set(false);
          this.seed = Math.floor(Math.random() * 2147483647);
          const first = this.ops().find((o) => !o.unusable) ?? null;
          this.chosen.set(null);
          if (first) this.choose(first);
          void this.orchestrator.usedTemplatePaths().then((p) => this.used.set(p)).catch(() => this.used.set([]));
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected choose(o: OpenApiOperation): void {
    this.chosen.set(o);
    this.responseIndex.set(Math.max(0, o.defaultResponse));
    this.name.set(o.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void { this.ui.openApiImport.set(null); }

  protected async run(): Promise<void> {
    const src = this.ui.openApiImport();
    const r = this.response();
    const op = this.chosen();
    const name = this.name().trim();
    if (!src || !r || !op || !name || this.busy()) return;
    this.busy.set(true);
    try {
      const done = await this.orchestrator.importOpenApiOperation(src.doc, r, this.values(), name, this.seed);
      this.terminal.addEntry('success', 'Datos', `Importado ${src.name} (OpenAPI): ${op.id} → ${r.status}, ${done.usedExample ? 'con los ejemplos del documento' : 'con datos generados'}, como juego de datos nuevo.`);
      for (const w of done.warnings) this.terminal.addEntry('warning', 'Datos', w);
      this.ui.openApiImport.set(null);
    } catch (err) {
      this.terminal.addEntry('error', 'Datos', `No se pudo importar ${src.name}: ${(err as Error).message}`);
    } finally {
      this.busy.set(false);
    }
  }

  /** Lo de siempre: una clave por cada esquema del documento. */
  protected importSchemas(): void {
    const src = this.ui.openApiImport();
    if (!src) return;
    try {
      const { warnings } = this.orchestrator.importDataDocument(src.doc, src.name.replace(/\.(json|ya?ml)$/i, ''));
      this.terminal.addEntry('success', 'Datos', `Importado ${src.name} (OpenAPI) como juego de datos nuevo, con una clave por esquema.`);
      for (const w of warnings) this.terminal.addEntry('warning', 'Datos', w);
      this.ui.openApiImport.set(null);
    } catch (err) {
      this.terminal.addEntry('error', 'Datos', `No se pudo importar ${src.name}: ${(err as Error).message}`);
    }
  }
}
