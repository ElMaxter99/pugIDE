import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { PersistenceService } from '../../../core/services/persistence.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { DataState } from '../../../core/state/data.state';
import { PreviewState } from '../../../core/state/preview.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { desktopInvoke } from '../../../core/utils/desktop.util';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { parsePageRules } from '../../../core/utils/page-rules.util';
import { detectPageSize, isLandscape } from '../../../core/utils/page-size.util';
import { PdfChoices, PdfOrientation, PdfPaper, buildPdfRequest, describeDocMargins, missingImages } from '../../../core/utils/pdf-export.util';
import { formatBytes } from '../../../core/utils/snapshot.util';

interface PdfResult { ok: boolean; reason?: string; message?: string; path?: string; dir?: string; name?: string; pages?: number; bytes?: number }

/**
 * «Exportar PDF» (P-39, solo escritorio): el PDF se genera con el Chromium de la app (sin diálogo de imprimir), con el
 * tamaño y los márgenes del documento, fondos, texto seleccionable y enlaces. Al terminar, un aviso con «Abrir» y
 * «Mostrar en la carpeta».
 */
@Component({
  selector: 'app-pdf-export-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.pdfExportOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'Exportar PDF · ' + fileLabel()" tabindex="-1" data-testid="pdf-export"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Exportar PDF · {{ fileLabel() }}</h2></div>
          <div class="body">
            <label class="field">Plantilla
              <select data-testid="pdf-entry" [value]="entry()" (change)="setEntry($any($event.target).value)" [disabled]="busy()">
                @for (p of pages(); track p) { <option [value]="p" [selected]="p === entry()">{{ p.slice(1) }}{{ p === previewEntry() ? ' (la de la vista previa)' : '' }}</option> }
              </select>
            </label>
            <div class="two">
              <label class="field grow">Tamaño
                <select data-testid="pdf-paper" (change)="setChoice('paper', $any($event.target).value)" [disabled]="busy()">
                  <option value="doc" [selected]="choices().paper === 'doc'">{{ docSizeLabel() }} (del documento)</option>
                  <option value="a4" [selected]="choices().paper === 'a4'">A4 · 210 × 297 mm</option>
                  <option value="a5" [selected]="choices().paper === 'a5'">A5 · 148 × 210 mm</option>
                  <option value="letter" [selected]="choices().paper === 'letter'">Carta · 216 × 279 mm</option>
                </select>
              </label>
              <label class="field">Orientación
                <select data-testid="pdf-orientation" (change)="orientation.set($any($event.target).value)" [disabled]="busy()">
                  <option value="portrait" [selected]="orientation() === 'portrait'">Vertical</option>
                  <option value="landscape" [selected]="orientation() === 'landscape'">Horizontal</option>
                </select>
              </label>
            </div>
            <label class="field">Márgenes
              <select data-testid="pdf-margins" (change)="setChoice('margins', $any($event.target).value)" [disabled]="busy()">
                <option value="doc" [selected]="choices().margins === 'doc'">{{ marginsLabel() }}</option>
                <option value="none" [selected]="choices().margins === 'none'">Sin márgenes</option>
              </select>
            </label>
            <label class="check"><input type="checkbox" data-testid="pdf-backgrounds" [checked]="choices().backgrounds" (change)="setChoice('backgrounds', $any($event.target).checked)" [disabled]="busy()" />Fondos y colores (como en la vista previa)</label>
            <label class="check"><input type="checkbox" data-testid="pdf-page-numbers" [checked]="choices().pageNumbers" (change)="setChoice('pageNumbers', $any($event.target).checked)" [disabled]="busy()" />Número de página abajo («3 de 12»)</label>
            <label class="check"><input type="checkbox" data-testid="pdf-open-after" [checked]="choices().openAfter" (change)="setChoice('openAfter', $any($event.target).checked)" [disabled]="busy()" />Abrir el PDF al terminar</label>
            <div class="info"><span>Datos: «{{ datasetName() }}»</span><span class="ok">Texto seleccionable y enlaces activos</span></div>
            @if (problem()) {
              <div class="bar error" role="alert" data-testid="pdf-problem">
                <span aria-hidden="true" class="material-symbols-outlined">error</span>
                <span class="grow">{{ problem() }}</span>
                @if (problemIsCompile()) { <button type="button" class="btn link" data-testid="pdf-see-problems" (click)="seeProblems()">Ver en Problemas</button> }
              </div>
            } @else if (missing() > 0) {
              <div class="bar warn" role="status" data-testid="pdf-missing-images">
                <span aria-hidden="true" class="material-symbols-outlined">warning</span>
                <span class="grow">{{ missing() === 1 ? '1 imagen no se encuentra: se verá su texto alternativo.' : missing() + ' imágenes no se encuentran: se verá su texto alternativo.' }}</span>
              </div>
            }
            @if (busy()) {
              <div class="bar progress" role="status" data-testid="pdf-busy">
                <span aria-hidden="true" class="material-symbols-outlined">picture_as_pdf</span>
                <span class="grow">Generando <b>{{ fileLabel() }}</b>…<span class="track"><span class="indeterminate"></span></span></span>
              </div>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" data-testid="pdf-cancel" (click)="busy() ? cancel() : close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="pdf-save" [disabled]="busy() || !canSave()" (click)="run()">
              <span aria-hidden="true" class="material-symbols-outlined">picture_as_pdf</span>Guardar PDF…</button>
          </div>
        </div>
      </div>
    }
    @if (result(); as r) {
      <div class="toast" role="status" data-testid="pdf-done">
        <span aria-hidden="true" class="material-symbols-outlined ok-icon">check_circle</span>
        <div class="grow">
          <div><b>{{ r.name }} guardado</b></div>
          <div class="sub">{{ r.pages === 1 ? '1 página' : r.pages + ' páginas' }} · {{ size(r.bytes ?? 0) }} · {{ r.dir }}</div>
          <div class="actions">
            <button type="button" class="btn secondary" data-testid="pdf-done-open" (click)="openPdf(r)"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Abrir</button>
            <button type="button" class="btn link" data-testid="pdf-done-reveal" (click)="reveal(r)"><span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Mostrar en la carpeta</button>
          </div>
        </div>
        <button type="button" class="close" aria-label="Cerrar aviso" data-testid="pdf-done-close" (click)="result.set(null)">×</button>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 480px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; overflow-wrap: anywhere; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
    .field select { height: 34px; padding: 0 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font: inherit; font-size: 13px; }
    .two { display: flex; gap: 12px; }
    .grow { flex: 1; min-width: 0; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); width: 15px; height: 15px; }
    .info { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
    .ok { color: var(--success-color); text-align: right; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; }
    .bar .material-symbols-outlined { font-size: 18px; }
    .bar.error { border-color: var(--error-color); } .bar.error .material-symbols-outlined { color: var(--error-color); }
    .bar.warn { border-color: var(--warning-color); } .bar.warn .material-symbols-outlined { color: var(--warning-color); }
    .bar.progress { border-color: var(--accent-color); } .bar.progress .material-symbols-outlined { color: var(--accent-color); }
    .track { display: block; height: 4px; margin-top: 6px; border-radius: 2px; background: var(--bg-input); overflow: hidden; position: relative; }
    .indeterminate { position: absolute; inset: 0 auto 0 0; width: 40%; background: var(--accent-color); border-radius: 2px; animation: slide 1.2s ease-in-out infinite; }
    @keyframes slide { from { left: -40%; } to { left: 100%; } }
    @media (prefers-reduced-motion: reduce) { .indeterminate { animation: none; width: 100%; opacity: 0.6; } }
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
export class PdfExportDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly persistence = inject(PersistenceService);
  private readonly workspace = inject(WorkspaceService);
  private readonly previewState = inject(PreviewState);
  private readonly dataState = inject(DataState);
  private readonly terminal = inject(TerminalState);

  protected readonly pages = signal<string[]>([]);
  protected readonly entry = signal('');
  protected readonly previewEntry = computed(() => this.previewState.entryPath());
  protected readonly choices = signal<PdfChoices>(this.persistence.loadPdfChoices());
  protected readonly orientation = signal<PdfOrientation>('portrait');
  /** HTML autocontenido de la plantilla elegida (null mientras se compila o si no compila). */
  private readonly html = signal<string | null>(null);
  private readonly errors = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly problemIsCompile = signal(false);
  protected readonly result = signal<PdfResult | null>(null);

  /** Solo con la plantilla ya compilada sin errores. */
  protected readonly canSave = computed(() => !!this.entry() && !!this.html());
  protected readonly fileLabel = computed(() => (this.entry().split('/').pop() || 'documento').replace(/\.(pug|jade)$/i, '') + '.pdf');
  protected readonly docSize = computed(() => detectPageSize(this.html() ?? '', 'landscape'));
  protected readonly docSizeLabel = computed(() => this.docSize().label.replace(/\s*(horizontal|vertical)$/i, ''));
  protected readonly marginsLabel = computed(() => describeDocMargins(parsePageRules(this.html() ?? '').margin));
  protected readonly missing = computed(() => missingImages(this.html() ?? ''));
  protected readonly datasetName = computed(() => this.dataState.activeDataset()?.name ?? 'Por defecto');

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;
  private renderSeq = 0;

  constructor() {
    effect(() => {
      if (this.ui.pdfExportOpen()) {
        untracked(() => {
          const pages = this.orchestrator.templatePages().pages;
          this.pages.set(pages);
          const preview = this.previewState.entryPath();
          this.problem.set(null);
          this.busy.set(false);
          this.result.set(null);
          void this.setEntry(preview && pages.includes(preview) ? preview : pages[0] ?? '');
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected async setEntry(path: string): Promise<void> {
    this.entry.set(path);
    this.html.set(null);
    this.problem.set(null);
    if (!path) { this.problem.set('Este proyecto no tiene ninguna plantilla que sea una página.'); return; }
    const seq = ++this.renderSeq;
    const r = await this.orchestrator.renderStandalone(path);
    if (seq !== this.renderSeq) return;
    this.html.set(r.html);
    this.errors.set(r.errors);
    if (!r.html) {
      const n = r.errors.length;
      this.problemIsCompile.set(true);
      this.problem.set(`No se puede generar el PDF: ${path.slice(1)} tiene ${n === 1 ? '1 error' : n + ' errores'}.`);
      return;
    }
    // La orientación de la vista PDF si es la misma plantilla; si no, la del documento.
    const wanted = path === this.previewState.entryPath() ? this.previewState.pdfOrientation() : null;
    this.orientation.set(wanted ?? (isLandscape(detectPageSize(r.html, 'landscape')) ? 'landscape' : 'portrait'));
  }

  protected setChoice<K extends keyof PdfChoices>(key: K, value: PdfChoices[K] | PdfPaper): void {
    this.choices.update((c) => ({ ...c, [key]: value }));
    this.persistence.savePdfChoices(this.choices());
  }

  protected size(bytes: number): string { return formatBytes(bytes); }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    if (this.busy()) return;
    this.ui.pdfExportOpen.set(false);
  }

  protected seeProblems(): void {
    this.ui.pdfExportOpen.set(false);
    this.terminal.openProblems();
  }

  protected cancel(): void {
    void desktopInvoke('pdf:cancel').catch(() => undefined);
    this.busy.set(false);
  }

  protected async run(): Promise<void> {
    const html = this.html();
    if (this.busy() || !html) return;
    this.busy.set(true);
    this.problem.set(null);
    const req = buildPdfRequest(html, this.entry(), this.choices(), this.orientation(), this.docSize(), parsePageRules(html).margin, this.workspace.active()?.id);
    let r: PdfResult;
    try {
      r = await desktopInvoke<PdfResult>('pdf:export', req);
    } catch (err) {
      r = { ok: false, reason: 'error', message: (err as Error).message };
    }
    if (!this.busy()) return; // se canceló mientras tanto
    this.busy.set(false);
    if (r.ok) {
      this.ui.pdfExportOpen.set(false);
      this.result.set(r);
      this.terminal.addEntry('success', 'Exportar', `${r.name} (${r.pages === 1 ? '1 página' : r.pages + ' páginas'}, ${formatBytes(r.bytes ?? 0)}) con el motor nativo: ${r.path}`);
      return;
    }
    if (r.reason === 'canceled') return;
    this.problemIsCompile.set(false);
    const text = r.reason === 'write' ? `No se pudo guardar el PDF en ${r.path ?? 'esa carpeta'} (${r.message ?? 'sin permiso'}). Elige otra carpeta.` : `No se pudo generar el PDF: ${r.message ?? 'error desconocido'}.`;
    this.problem.set(text);
    this.terminal.addEntry('error', 'Exportar', text);
  }

  protected openPdf(r: PdfResult): void { void desktopInvoke('pdf:open', { path: r.path }).catch(() => undefined); }

  protected reveal(r: PdfResult): void { void desktopInvoke('pdf:reveal', { path: r.path }).catch(() => undefined); }
}
