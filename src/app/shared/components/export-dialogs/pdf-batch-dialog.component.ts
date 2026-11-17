import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { PersistenceService } from '../../../core/services/persistence.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { DataState } from '../../../core/state/data.state';
import { PreviewState } from '../../../core/state/preview.state';
import { ProjectState } from '../../../core/state/project.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { desktopInvoke } from '../../../core/utils/desktop.util';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { parsePageRules } from '../../../core/utils/page-rules.util';
import { detectPageSize, isLandscape } from '../../../core/utils/page-size.util';
import {
  PdfBatchChoices, PdfBatchDone, PdfBatchMode, PdfBatchTarget, dataKeys, datasetPdfName, describeBatch, pageCount, patternKeys, patternPdfName, pdfCount, templatePdfName, uniquePdfNames,
} from '../../../core/utils/pdf-batch.util';
import { PdfPaper, buildPdfRequest } from '../../../core/utils/pdf-export.util';
import { formatBytes } from '../../../core/utils/snapshot.util';

interface Target { token: string; path: string }
interface ItemResult { ok: boolean; reason?: string; message?: string; name?: string; pages?: number; bytes?: number; path?: string }
interface FinishResult { ok: boolean; reason?: string; message?: string; dir?: string; reveal?: string | null; zip?: string; bytes?: number; path?: string }
interface Job { label: string; name: string; path: string; data?: Record<string, unknown> }
interface Summary { done: PdfBatchDone[]; total: number; failed: string[]; compileFailed: boolean; canceled: boolean; dir: string; reveal: string | null; zip: string | null; bytes: number }

/**
 * «Exportar → Varios PDF…» (P-42, solo escritorio): un PDF por plantilla, o un PDF de la misma plantilla por cada
 * juego de datos, con el motor nativo de P-39. Se guardan en una carpeta o en un `.zip`; si alguno falla, los demás
 * se guardan igual.
 */
@Component({
  selector: 'app-pdf-batch-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.pdfBatchOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Exportar varios PDF" tabindex="-1" data-testid="pdf-batch"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Exportar varios PDF</h2></div>
          <div class="body">
            <div class="seg" role="group" aria-label="Qué se genera">
              <button type="button" data-testid="pdf-batch-mode-templates" [attr.aria-pressed]="choices().mode === 'templates'" [disabled]="busy()" (click)="setMode('templates')">Un PDF por plantilla</button>
              <button type="button" data-testid="pdf-batch-mode-datasets" [attr.aria-pressed]="choices().mode === 'datasets'" [disabled]="busy()" (click)="setMode('datasets')">Un PDF por juego de datos</button>
            </div>
            @if (choices().mode === 'templates') {
              <p class="note">Cada plantilla que es una página se genera con los datos actuales («{{ datasetName() }}»). Los parciales no se exportan.</p>
              <div class="list" data-testid="pdf-batch-list">
                @for (p of pages(); track p) {
                  <label class="check"><input type="checkbox" [attr.data-testid]="'pdf-batch-' + p" [checked]="chosenPages().has(p) && !broken().has(p)" [disabled]="busy() || broken().has(p)" (change)="togglePage(p, $any($event.target).checked)" />
                    <span>{{ p.slice(1) }}</span>
                    @if (broken().get(p); as n) { <span class="warn">tiene {{ n === 1 ? '1 error' : n + ' errores' }}: no se puede generar</span> }
                    @else { <span class="arrow">→ {{ nameFor(p) }}</span> }
                  </label>
                } @empty {
                  <p class="problem">Este proyecto no tiene ninguna plantilla que sea una página.</p>
                }
                @for (p of partials(); track p) {
                  <div class="partial"><span aria-hidden="true" class="material-symbols-outlined">link</span>{{ p.slice(1) }} <span class="arrow">parcial, no se exporta</span></div>
                }
              </div>
            } @else {
              <label class="field">Plantilla
                <select data-testid="pdf-batch-entry" [disabled]="busy()" (change)="entry.set($any($event.target).value)">
                  @for (p of pages(); track p) { <option [value]="p" [selected]="p === entry()">{{ p.slice(1) }}{{ p === previewEntry() ? ' (la de la vista previa)' : '' }}</option> }
                </select>
              </label>
              <p class="note">La misma plantilla, una vez por cada juego de datos elegido. El nombre del juego va en el nombre del archivo.</p>
              <div class="list" data-testid="pdf-batch-list">
                @for (d of datasets(); track d.id) {
                  <label class="check"><input type="checkbox" [attr.data-testid]="'pdf-batch-ds-' + d.name" [checked]="chosenDatasets().has(d.id)" [disabled]="busy()" (change)="toggleDataset(d.id, $any($event.target).checked)" />
                    <span>{{ d.name }}</span><span class="arrow">→ {{ nameFor(d.id) }}</span></label>
                }
              </div>
              <label class="field">Nombre del archivo
                <input #patternInput type="text" data-testid="pdf-batch-pattern" placeholder="{{ patternPlaceholder }}" [value]="choices().pattern" [disabled]="busy()" (input)="setPattern($any($event.target).value)" />
              </label>
              @if (keys().length) {
                <div class="chips" data-testid="pdf-batch-keys"><span class="chips-label">Claves de los datos:</span>
                  @for (k of keys(); track k) { <button type="button" class="chip" [attr.data-testid]="'pdf-batch-key-' + k" [disabled]="busy()" (click)="insertKey(k, patternInput)">{{ '{' + k + '}' }}</button> }
                </div>
              }
              <p class="note">Pulsa una clave para añadirla donde está el cursor. Vacío = «plantilla - juego». La extensión .pdf se añade sola.</p>
              @for (w of patternWarnings(); track w.text) {
                <div class="bar" [class.warn]="w.kind === 'warn'" [class.info]="w.kind === 'info'" role="status" data-testid="pdf-batch-pattern-warning">
                  <span aria-hidden="true" class="material-symbols-outlined">{{ w.kind === 'warn' ? 'warning' : 'info' }}</span><span class="grow">{{ w.text }}</span></div>
              }
              @if (previewNames().length) {
                <div class="preview" data-testid="pdf-batch-preview"><div class="preview-title">Se guardarán como</div>
                  @for (n of previewNames(); track $index) { <div class="preview-name">→ {{ n }}</div> }
                </div>
              }
              @if (locales().length > 1) {
                <label class="field half">Idioma
                  <select data-testid="pdf-batch-locale" [disabled]="busy()" (change)="locale.set($any($event.target).value)">
                    @for (l of locales(); track l) { <option [value]="l" [selected]="l === locale()">{{ l === projectLocale() ? 'El del proyecto (' + l + ')' : l }}</option> }
                  </select>
                </label>
              }
            }
            <div class="two">
              <label class="field grow">Tamaño y márgenes
                <select data-testid="pdf-batch-paper" [disabled]="busy()" (change)="paper.set($any($event.target).value)">
                  <option value="doc" [selected]="paper() === 'doc'">Los de cada documento (&#64;page)</option>
                  <option value="a4" [selected]="paper() === 'a4'">A4 · 210 × 297 mm</option>
                  <option value="a5" [selected]="paper() === 'a5'">A5 · 148 × 210 mm</option>
                  <option value="letter" [selected]="paper() === 'letter'">Carta · 216 × 279 mm</option>
                </select>
              </label>
              <label class="field">Guardar como
                <select data-testid="pdf-batch-target" [disabled]="busy()" (change)="setTarget($any($event.target).value)">
                  <option value="folder" [selected]="choices().target === 'folder'">Archivos en una carpeta</option>
                  <option value="zip" [selected]="choices().target === 'zip'">Un .zip</option>
                </select>
              </label>
            </div>
            <label class="check"><input type="checkbox" data-testid="pdf-batch-page-numbers" [checked]="choices().pageNumbers" [disabled]="busy()" (change)="setPageNumbers($any($event.target).checked)" />Número de página abajo («3 de 12»)</label>
            <div class="two end">
              <label class="field grow">{{ choices().target === 'zip' ? 'Archivo' : 'Carpeta' }}
                <input type="text" readonly data-testid="pdf-batch-path" [value]="target()?.path ?? ''" />
              </label>
              <button type="button" class="btn secondary" data-testid="pdf-batch-pick" [disabled]="busy()" (click)="pick()">Elegir…</button>
            </div>
            @if (conflict(); as c) {
              <div class="bar warn" role="alert" data-testid="pdf-batch-conflict">
                <span aria-hidden="true" class="material-symbols-outlined">warning</span>
                <span class="grow">{{ c.text }}</span>
                <button type="button" class="btn secondary" data-testid="pdf-batch-replace" (click)="run('replace')">{{ c.replace }}</button>
                @if (choices().target === 'folder') { <button type="button" class="btn secondary" data-testid="pdf-batch-rename" (click)="run('rename')">Guardar con otro nombre</button> }
              </div>
            }
            @if (problem()) {
              <div class="bar error" role="alert" data-testid="pdf-batch-problem">
                <span aria-hidden="true" class="material-symbols-outlined">error</span><span class="grow">{{ problem() }}</span>
              </div>
            }
            @if (progress(); as pr) {
              <div class="bar progress" role="status" data-testid="pdf-batch-busy">
                <span aria-hidden="true" class="material-symbols-outlined">picture_as_pdf</span>
                <span class="grow">Generando <b>{{ pr.name }}</b> · {{ pr.index }} de {{ pr.total }}
                  <span class="track"><span class="fill" [style.width.%]="((pr.index - 1) / pr.total) * 100"></span></span></span>
              </div>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" data-testid="pdf-batch-cancel" (click)="busy() ? cancel() : close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="pdf-batch-go" [disabled]="busy() || count() === 0 || !target()" (click)="run()">
              <span aria-hidden="true" class="material-symbols-outlined">picture_as_pdf</span>Generar {{ count() }} PDF</button>
          </div>
        </div>
      </div>
    }
    @if (summary(); as s) {
      <div class="toast" role="status" data-testid="pdf-batch-done">
        <span aria-hidden="true" class="material-symbols-outlined" [class.ok-icon]="!s.failed.length && !s.canceled" [class.warn-icon]="s.failed.length || s.canceled">{{ s.failed.length || s.canceled ? 'warning' : 'check_circle' }}</span>
        <div class="grow">
          <div><b>{{ summaryTitle(s) }}</b></div>
          @if (s.done.length) { <div class="sub">{{ s.zip ? s.dir + ' · ' + s.zip : s.dir }} · {{ pagesOf(s) }} · {{ sizeOf(s) }}</div> }
          @for (f of s.failed; track f) { <div class="sub">No se generó {{ f }}</div> }
          <div class="actions">
            @if (s.reveal) { <button type="button" class="btn link" data-testid="pdf-batch-reveal" (click)="reveal(s)"><span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Mostrar en la carpeta</button> }
            @if (s.compileFailed) { <button type="button" class="btn link" data-testid="pdf-batch-see-problems" (click)="seeProblems()"><span aria-hidden="true" class="material-symbols-outlined">arrow_forward</span>Ver en Problemas</button> }
          </div>
        </div>
        <button type="button" class="close" aria-label="Cerrar aviso" data-testid="pdf-batch-done-close" (click)="summary.set(null)">×</button>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
    .seg { display: inline-flex; align-self: flex-start; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; }
    .seg button { height: 30px; padding: 0 12px; border: 0; background: var(--bg-input); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
    .seg button + button { border-left: 1px solid var(--border-color); }
    .seg button[aria-pressed="true"] { background: var(--bg-tertiary); color: var(--accent-color); }
    .note { margin: 0; font-size: 12px; line-height: 1.5; }
    .list { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); max-height: 220px; overflow: auto; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); overflow-wrap: anywhere; }
    .check input { accent-color: var(--accent-color); width: 15px; height: 15px; flex-shrink: 0; }
    .arrow { color: var(--text-secondary); font-size: 12px; }
    .warn { color: var(--warning-color); font-size: 12px; }
    .partial { display: flex; gap: 8px; align-items: center; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .chips-label { font-size: 12px; }
    .chip { height: 24px; padding: 0 8px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--accent-color); font-family: var(--font-mono); font-size: 11px; cursor: pointer; }
    .chip:disabled { opacity: 0.5; cursor: not-allowed; }
    .preview { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-tertiary); }
    .preview-title { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .preview-name { font-family: var(--font-mono); font-size: 12px; color: var(--text-primary); overflow-wrap: anywhere; }
    .partial .material-symbols-outlined { font-size: 15px; }
    .problem { margin: 0; font-size: 12px; color: var(--error-color); }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .field.half { width: 50%; }
    .field select, .field input { height: 34px; padding: 0 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font: inherit; font-size: 13px; min-width: 0; }
    .two { display: flex; gap: 12px; }
    .two.end { align-items: flex-end; gap: 8px; }
    .two.end .btn { height: 34px; }
    .grow { flex: 1; min-width: 0; }
    .bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
    .bar .material-symbols-outlined { font-size: 18px; }
    .bar.error { border-color: var(--error-color); } .bar.error .material-symbols-outlined { color: var(--error-color); }
    .bar.info { border-color: var(--info-color, var(--accent-color)); } .bar.info .material-symbols-outlined { color: var(--info-color, var(--accent-color)); }
    .bar.warn { border-color: var(--warning-color); } .bar.warn .material-symbols-outlined { color: var(--warning-color); }
    .bar.progress { border-color: var(--accent-color); } .bar.progress .material-symbols-outlined { color: var(--accent-color); }
    .track { display: block; height: 4px; margin-top: 6px; border-radius: 2px; background: var(--bg-input); overflow: hidden; }
    .fill { display: block; height: 100%; background: var(--accent-color); border-radius: 2px; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn .material-symbols-outlined { font-size: 16px; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn.link { background: none; border: none; color: var(--accent-color); padding: 6px 4px; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .toast { position: fixed; right: 16px; bottom: 40px; z-index: 2100; width: 440px; max-width: calc(100vw - 32px); display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); font-size: 13px; color: var(--text-primary); }
    .ok-icon { color: var(--success-color); font-size: 20px; }
    .warn-icon { color: var(--warning-color); font-size: 20px; }
    .sub { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }
    .actions { margin-top: 8px; display: flex; gap: 8px; }
    .close { width: 24px; height: 24px; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; font-size: 16px; }
  `],
})
export class PdfBatchDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly persistence = inject(PersistenceService);
  private readonly workspace = inject(WorkspaceService);
  private readonly previewState = inject(PreviewState);
  private readonly dataState = inject(DataState);
  private readonly projectState = inject(ProjectState);
  private readonly terminal = inject(TerminalState);

  protected readonly choices = signal<PdfBatchChoices>(this.persistence.loadPdfBatchChoices());
  protected readonly paper = signal<PdfPaper>('doc');
  protected readonly pages = signal<string[]>([]);
  protected readonly partials = signal<string[]>([]);
  protected readonly chosenPages = signal<Set<string>>(new Set());
  /** Plantillas que no compilan (con cuántos errores): no se pueden elegir. */
  protected readonly broken = signal<Map<string, number>>(new Map());
  protected readonly entry = signal('');
  protected readonly chosenDatasets = signal<Set<string>>(new Set());
  protected readonly locale = signal('');
  protected readonly target = signal<Target | null>(null);
  protected readonly busy = signal(false);
  protected readonly progress = signal<{ name: string; index: number; total: number } | null>(null);
  protected readonly conflict = signal<{ text: string; replace: string } | null>(null);
  protected readonly problem = signal<string | null>(null);
  protected readonly summary = signal<Summary | null>(null);

  protected readonly previewEntry = computed(() => this.previewState.entryPath());
  protected readonly datasets = computed(() => this.dataState.datasets());
  protected readonly datasetName = computed(() => this.dataState.activeDataset()?.name ?? 'Por defecto');
  protected readonly locales = computed(() => this.orchestrator.locales());
  protected readonly projectLocale = computed(() => this.orchestrator.activeLocale() ?? '');

  /** Lo que se va a generar, con su nombre de archivo ya sin repetir. */
  private readonly jobs = computed<Job[]>(() => {
    if (this.choices().mode === 'templates') {
      const paths = this.pages().filter((p) => this.chosenPages().has(p) && !this.broken().has(p));
      const names = uniquePdfNames(paths.map(templatePdfName));
      return paths.map((path, i) => ({ label: path.slice(1), name: names[i], path }));
    }
    const path = this.entry();
    if (!path) return [];
    return this.datasetJobs(path).map((j) => ({ label: j.label, name: j.name, path, data: j.data }));
  });
  /** Un trabajo por juego de datos elegido: el nombre sale del patrón o, si no hay patrón (o falta una clave), de «plantilla - juego». */
  private datasetJobs(path: string): { id: string; label: string; name: string; data: Record<string, unknown>; byPattern: boolean }[] {
    const activeId = this.dataState.activeId();
    const sets = this.datasets().filter((d) => this.chosenDatasets().has(d.id));
    const pattern = this.choices().pattern.trim();
    const raw = sets.map((d) => {
      // El juego activo se toma del estado vivo: puede tener cambios que aún no están en la lista de juegos.
      const data = d.id === activeId ? this.dataState.data() : d.data;
      const byPattern = pattern ? patternPdfName(pattern, data).name : null;
      return { id: d.id, label: `${path.slice(1)} con «${d.name}»`, name: byPattern ?? datasetPdfName(path, d.name), data, byPattern: byPattern !== null };
    });
    const names = uniquePdfNames(raw.map((r) => r.name));
    return raw.map((r, i) => ({ ...r, name: names[i] }));
  }
  protected readonly count = computed(() => this.jobs().length);
  /** Claves que se ofrecen para el patrón (de los datos de todos los juegos). */
  protected readonly keys = computed(() => dataKeys(this.datasets().map((d) => (d.id === this.dataState.activeId() ? this.dataState.data() : d.data))));
  protected readonly patternPlaceholder = 'plantilla - juego (por defecto)';
  protected readonly previewNames = computed(() => (this.choices().mode === 'datasets' ? this.jobs().slice(0, 3).map((j) => j.name) : []));
  protected readonly patternWarnings = computed<{ kind: 'warn' | 'info'; text: string }[]>(() => {
    const pattern = this.choices().pattern.trim();
    if (!pattern || this.choices().mode !== 'datasets') return [];
    const out: { kind: 'warn' | 'info'; text: string }[] = [];
    const path = this.entry();
    const sets = this.datasets().filter((d) => this.chosenDatasets().has(d.id));
    const activeId = this.dataState.activeId();
    const dataOf = (d: (typeof sets)[number]) => (d.id === activeId ? this.dataState.data() : d.data);
    const available = dataKeys(sets.map(dataOf));
    for (const key of patternKeys(pattern)) {
      const lacking = sets.filter((d) => patternPdfName(`{${key}}`, dataOf(d)).name === null);
      if (sets.length && lacking.length === sets.length) out.push({ kind: 'warn', text: `La clave {${key}} no existe en los datos.${available.length ? ` Claves que sí hay: ${available.slice(0, 5).join(', ')}${available.length > 5 ? '…' : ''}.` : ''}` });
      else if (lacking.length) out.push({ kind: 'warn', text: `{${key}} falta en ${lacking.length} ${lacking.length === 1 ? 'juego' : 'juegos'} (${lacking.slice(0, 2).map((d) => d.name).join(', ')}${lacking.length > 2 ? '…' : ''}): ahí se usa el nombre del juego.` });
    }
    const wanted = this.datasetJobs(path).map((j) => j.name);
    const first = sets.map((d) => (patternPdfName(pattern, dataOf(d)).name ?? datasetPdfName(path, d.name)));
    const renamed = wanted.find((n, i) => n !== first[i]);
    if (renamed) out.push({ kind: 'info', text: `Dos juegos dan el mismo nombre: el segundo pasa a ${renamed}.` });
    return out;
  });
  /** Nombre del PDF de una plantilla o de un juego de datos tal como saldría ahora (elegido o no). */
  private readonly allNames = computed(() => {
    const map = new Map<string, string>();
    if (this.choices().mode === 'templates') {
      const paths = this.pages().filter((p) => !this.broken().has(p));
      uniquePdfNames(paths.map(templatePdfName)).forEach((n, i) => map.set(paths[i], n));
    } else {
      for (const j of this.datasetJobs(this.entry())) map.set(j.id, j.name);
      // Los juegos sin elegir también enseñan su nombre.
      for (const d of this.datasets()) if (!map.has(d.id)) map.set(d.id, datasetPdfName(this.entry(), d.name));
    }
    return map;
  });

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;
  private canceled = false;
  private openSeq = 0;

  constructor() {
    effect(() => {
      if (this.ui.pdfBatchOpen()) {
        untracked(() => this.open());
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  private open(): void {
    const { pages, partials } = this.orchestrator.templatePages();
    this.pages.set(pages);
    this.partials.set(partials);
    this.chosenPages.set(new Set(pages));
    this.broken.set(new Map());
    const preview = this.previewState.entryPath();
    this.entry.set(preview && pages.includes(preview) ? preview : pages[0] ?? '');
    this.chosenDatasets.set(new Set(this.datasets().map((d) => d.id)));
    this.locale.set(this.projectLocale());
    this.paper.set('doc');
    this.busy.set(false);
    this.progress.set(null);
    this.conflict.set(null);
    this.problem.set(null);
    this.summary.set(null);
    this.target.set(null);
    void this.askTarget(false);
    void this.checkPages(pages, ++this.openSeq);
    this.restoreFocus = rememberFocus();
    setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
  }

  /** Compila cada página una vez para saber cuáles no se pueden generar (se dice antes, no al final). */
  private async checkPages(pages: string[], seq: number): Promise<void> {
    for (const p of pages) {
      const r = await this.orchestrator.renderStandalone(p);
      if (seq !== this.openSeq || !this.ui.pdfBatchOpen()) return;
      if (!r.html) this.broken.update((m) => new Map(m).set(p, Math.max(1, r.errors.length)));
    }
  }

  private async askTarget(pick: boolean): Promise<void> {
    const t = await desktopInvoke<Target | null>('pdf:batch-target', {
      kind: this.choices().target, workspaceId: this.workspace.active()?.id, projectName: this.projectState.projectName(), pick,
    }).catch(() => null);
    if (t) { this.target.set(t); this.conflict.set(null); }
  }

  protected nameFor(key: string): string { return this.allNames().get(key) ?? ''; }

  private setChoices(patch: Partial<PdfBatchChoices>): void {
    this.choices.update((c) => ({ ...c, ...patch }));
    this.persistence.savePdfBatchChoices(this.choices());
    this.conflict.set(null);
  }

  protected setMode(mode: PdfBatchMode): void { this.setChoices({ mode }); }

  protected setTarget(target: PdfBatchTarget): void {
    this.setChoices({ target });
    this.target.set(null);
    void this.askTarget(false);
  }

  protected setPageNumbers(on: boolean): void { this.setChoices({ pageNumbers: on }); }

  protected setPattern(pattern: string): void { this.setChoices({ pattern: pattern.slice(0, 150) }); }

  /** Añade `{clave}` donde está el cursor del campo del patrón. */
  protected insertKey(key: string, input: HTMLInputElement): void {
    const text = this.choices().pattern;
    const at = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? at;
    const next = `${text.slice(0, at)}{${key}}${text.slice(end)}`.slice(0, 150);
    this.setPattern(next);
    input.value = next;
    const caret = Math.min(next.length, at + key.length + 2);
    setTimeout(() => { input.focus(); input.setSelectionRange(caret, caret); });
  }

  protected pick(): void { void this.askTarget(true); }

  protected togglePage(path: string, on: boolean): void {
    const next = new Set(this.chosenPages());
    if (on) next.add(path); else next.delete(path);
    this.chosenPages.set(next);
    this.conflict.set(null);
  }

  protected toggleDataset(id: string, on: boolean): void {
    const next = new Set(this.chosenDatasets());
    if (on) next.add(id); else next.delete(id);
    this.chosenDatasets.set(next);
    this.conflict.set(null);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    if (this.busy()) return;
    this.ui.pdfBatchOpen.set(false);
  }

  protected cancel(): void {
    this.canceled = true;
    void desktopInvoke('pdf:cancel').catch(() => undefined);
  }

  /** `onExist`: lo que la persona ha decidido si ya hay archivos con esos nombres (sin decidir, se pregunta una vez). */
  protected async run(onExist?: 'replace' | 'rename'): Promise<void> {
    const jobs = this.jobs();
    const target = this.target();
    if (this.busy() || !jobs.length || !target) return;
    this.problem.set(null);
    if (!onExist) {
      const existing = await desktopInvoke<string[]>('pdf:batch-existing', { token: target.token, names: jobs.map((j) => j.name) }).catch(() => []);
      if (existing.length) {
        const zip = this.choices().target === 'zip';
        this.conflict.set(zip
          ? { text: `${existing[0]} ya existe en esa carpeta.`, replace: 'Reemplazarlo' }
          : { text: existing.length === 1 ? `${existing[0]} ya existe en esa carpeta.` : `${existing.length} de estos PDF ya existen en esa carpeta.`, replace: existing.length === 1 ? 'Reemplazarlo' : `Reemplazar los ${existing.length} que ya existen` });
        return;
      }
    }
    this.conflict.set(null);
    this.busy.set(true);
    this.canceled = false;
    const done: PdfBatchDone[] = [];
    const failed: string[] = [];
    let compileFailed = false;
    let stop: string | null = null;
    const locale = this.choices().mode === 'datasets' && this.locale() ? this.locale() : undefined;
    for (let i = 0; i < jobs.length && !this.canceled && !stop; i++) {
      const job = jobs[i];
      this.progress.set({ name: job.name, index: i + 1, total: jobs.length });
      const r = await this.orchestrator.renderStandalone(job.path, { data: job.data, locale });
      if (!r.html) {
        compileFailed = true;
        failed.push(`${job.label}: ${r.errors.length === 1 ? '1 error' : r.errors.length + ' errores'} al compilar.`);
        continue;
      }
      if (this.canceled) break;
      const size = detectPageSize(r.html, 'landscape');
      const req = buildPdfRequest(r.html, job.path, { paper: this.paper(), margins: 'doc', backgrounds: true, pageNumbers: this.choices().pageNumbers, openAfter: false },
        isLandscape(size) ? 'landscape' : 'portrait', size, parsePageRules(r.html).margin, this.workspace.active()?.id);
      const item = await desktopInvoke<ItemResult>('pdf:batch-item', { token: target.token, name: job.name, onExist: onExist ?? 'rename', req })
        .catch((err: Error): ItemResult => ({ ok: false, reason: 'error', message: err.message }));
      if (item.ok) done.push({ name: item.name ?? job.name, pages: item.pages ?? 0, bytes: item.bytes ?? 0 });
      else if (item.reason === 'canceled') break;
      // Sin permiso o sin sitio en la carpeta: los siguientes fallarían igual, así que se para y se dice.
      else if (item.reason === 'write' || item.reason === 'invalid') stop = `No se pudo guardar en ${item.path ?? target.path} (${item.message ?? 'sin permiso'}). Elige otra carpeta.`;
      else failed.push(`${job.label}: ${item.message ?? 'error desconocido'}.`);
    }
    const end = await desktopInvoke<FinishResult>('pdf:batch-finish', { token: target.token }).catch((err: Error): FinishResult => ({ ok: false, message: err.message }));
    if (!end.ok && done.length) { stop = `No se pudo guardar ${end.path ?? target.path} (${end.message ?? 'sin permiso'}). Elige otro sitio.`; done.length = 0; }
    this.busy.set(false);
    this.progress.set(null);
    // El permiso del destino es de un solo uso: se pide otro para el mismo sitio por si se repite.
    this.target.set(null);
    void this.askTarget(false);
    if (stop) {
      this.problem.set(stop);
      this.terminal.addEntry('error', 'Exportar', stop);
      if (!done.length) return;
    }
    const canceled = this.canceled;
    const where = end.zip ? `${end.dir}: ${end.zip}` : end.dir ?? target.path;
    if (done.length) this.terminal.addEntry('success', 'Exportar', `${pdfCount(done.length)} con el motor nativo en ${where}: ${describeBatch(done)}.`);
    for (const f of failed) this.terminal.addEntry('error', 'Exportar', `No se generó ${f}`);
    if (canceled) this.terminal.addEntry('warning', 'Exportar', `Cancelado: ${done.length} de ${jobs.length} PDF guardados.`);
    if (!done.length && !failed.length) return; // se canceló antes de terminar el primero: no hay nada que contar
    this.summary.set({ done, total: jobs.length, failed, compileFailed, canceled, dir: end.dir ?? target.path, reveal: end.reveal ?? null, zip: end.zip ?? null, bytes: end.bytes ?? 0 });
    if (done.length && !stop) this.ui.pdfBatchOpen.set(false);
  }

  protected summaryTitle(s: Summary): string {
    if (s.canceled) return `Cancelado: ${s.done.length} de ${s.total} PDF guardados`;
    if (!s.done.length) return 'No se guardó ningún PDF';
    return s.done.length === s.total ? `${pdfCount(s.done.length)} guardados` : `${s.done.length} de ${s.total} PDF guardados`;
  }

  protected pagesOf(s: Summary): string { return pageCount(s.done.reduce((n, d) => n + d.pages, 0)); }

  protected sizeOf(s: Summary): string { return formatBytes(s.bytes || s.done.reduce((n, d) => n + d.bytes, 0)); }

  protected reveal(s: Summary): void { if (s.reveal) void desktopInvoke('pdf:reveal', { path: s.reveal }).catch(() => undefined); }

  protected seeProblems(): void {
    this.summary.set(null);
    this.terminal.openProblems();
  }
}
