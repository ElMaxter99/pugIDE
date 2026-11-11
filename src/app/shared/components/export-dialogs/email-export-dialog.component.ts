import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { EditorState } from '../../../core/state/editor.state';
import { PreviewState } from '../../../core/state/preview.state';
import { ProjectState } from '../../../core/state/project.state';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { DEFAULT_EMAIL_OPTIONS, EmailResult, GMAIL_CLIP_BYTES, emailKb } from '../../../core/utils/email-export.util';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';

/**
 * «Exportar para correo» (P-23): pasa el CSS a atributos `style`, quita lo que el correo no admite, mide el peso contra
 * el límite de Gmail y dice qué revisar. Trabaja sobre lo que se ve en la vista previa; nada sale del navegador.
 */
@Component({
  selector: 'app-email-export-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.emailExportOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Exportar para correo" tabindex="-1" data-testid="email-export"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Exportar para correo · {{ entryName() }}</h2></div>
          <div class="body">
            <label class="check"><input type="checkbox" data-testid="email-inline" [checked]="inlineCss()" (change)="inlineCss.set($any($event.target).checked)" /> Pasar el CSS a atributos <code>style</code> (CSS en línea)</label>
            <label class="check"><input type="checkbox" [checked]="removeScripts()" (change)="removeScripts.set($any($event.target).checked)" /> Quitar <code>&lt;script&gt;</code> y atributos de eventos</label>
            <label class="check"><input type="checkbox" [checked]="keepMedia()" [disabled]="!inlineCss()" (change)="keepMedia.set($any($event.target).checked)" /> Conservar las reglas <code>&#64;media</code> en un <code>&lt;style&gt;</code> (para móvil)</label>
            <label class="check"><input type="checkbox" data-testid="email-embed" [checked]="embedImages()" (change)="embedImages.set($any($event.target).checked)" /> Incrustar las imágenes locales (aumenta el peso)</label>
            <label class="label" for="email-preheader">Texto de vista previa del correo (opcional)</label>
            <input id="email-preheader" class="input" type="text" maxlength="200" [value]="preheader()" (input)="preheader.set($any($event.target).value)" />
            @if (result(); as r) {
              <div class="meter-row"><span>Peso del HTML</span><span data-testid="email-weight" [class.over]="over()" [class.ok]="!over()">{{ weightText() }}</span></div>
              <div class="meter" role="img" [attr.aria-label]="weightText()"><div class="meter-fill" [class.over]="over()" [style.width.%]="percent()"></div></div>
              <div class="warn-box" data-testid="email-warnings">
                <div class="warn-title">{{ r.warnings.length === 0 ? 'Sin avisos de compatibilidad' : r.warnings.length + (r.warnings.length === 1 ? ' aviso' : ' avisos') + ' de compatibilidad' }}</div>
                @for (w of r.warnings; track w.title) {
                  <div class="warn" [class.err]="w.level === 'error'">
                    <span aria-hidden="true" class="material-symbols-outlined">{{ w.level === 'error' ? 'error' : 'warning' }}</span>
                    <div><div class="warn-name">{{ w.title }}</div><div class="warn-detail">{{ w.detail }}</div></div>
                  </div>
                }
              </div>
            } @else {
              <p class="problem" role="alert">No hay vista previa que exportar: corrige los errores de la plantilla y vuelve a intentarlo.</p>
            }
            @if (copied()) { <p class="done" role="status">HTML copiado al portapapeles.</p> }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()">Cerrar</button>
            <button type="button" class="btn secondary" data-testid="email-copy" [disabled]="!result()" (click)="copy()">Copiar HTML</button>
            <button type="button" class="btn primary" data-testid="email-download" [disabled]="!result()" (click)="download()">Descargar .html</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 600px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); }
    code { font-family: var(--font-mono); font-size: 12px; }
    .label { font-size: 12px; margin-top: 6px; }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .meter-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-top: 8px; }
    .ok { color: var(--success-color); }
    .over { color: var(--error-color); }
    .meter { height: 6px; border-radius: 3px; background: var(--bg-input); overflow: hidden; }
    .meter-fill { height: 100%; background: var(--success-color); }
    .meter-fill.over { background: var(--error-color); }
    .warn-box { border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
    .warn-title { font-size: 12px; font-weight: 600; color: var(--text-primary); }
    .warn { display: flex; gap: 8px; align-items: flex-start; }
    .warn .material-symbols-outlined { font-size: 16px; color: var(--warning-color); }
    .warn.err .material-symbols-outlined { color: var(--error-color); }
    .warn-name { color: var(--text-primary); }
    .warn-detail { font-size: 12px; line-height: 1.5; }
    .problem { margin: 6px 0 0; font-size: 12px; color: var(--error-color); }
    .done { margin: 4px 0 0; font-size: 12px; color: var(--success-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.secondary:hover:not(:disabled) { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class EmailExportDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly projectIo = inject(ProjectIoService);
  private readonly previewState = inject(PreviewState);
  private readonly editorState = inject(EditorState);
  private readonly projectState = inject(ProjectState);
  private readonly terminal = inject(TerminalState);

  protected readonly inlineCss = signal(DEFAULT_EMAIL_OPTIONS.inlineCss);
  protected readonly removeScripts = signal(DEFAULT_EMAIL_OPTIONS.removeScripts);
  protected readonly keepMedia = signal(DEFAULT_EMAIL_OPTIONS.keepMedia);
  protected readonly embedImages = signal(false);
  protected readonly preheader = signal('');
  protected readonly copied = signal(false);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly entryName = computed(() => (this.previewState.entryPath() ?? this.editorState.activeTab()?.path ?? '').replace(/^\//, ''));

  /** Se recalcula al cambiar una opción o la vista previa. */
  protected readonly result = computed<EmailResult | null>(() => {
    if (!this.ui.emailExportOpen()) return null;
    this.previewState.compiledHtml();
    return this.projectIo.buildEmailHtml({ inlineCss: this.inlineCss(), removeScripts: this.removeScripts(), keepMedia: this.keepMedia(), preheader: this.preheader() }, this.embedImages());
  });
  protected readonly over = computed(() => (this.result()?.bytes ?? 0) > GMAIL_CLIP_BYTES);
  protected readonly percent = computed(() => Math.min(100, Math.round(((this.result()?.bytes ?? 0) / GMAIL_CLIP_BYTES) * 100)));
  protected readonly weightText = computed(() => {
    const kb = emailKb(this.result()?.bytes ?? 0);
    return this.over() ? `${kb} de 102 KB: Gmail lo recortará` : `${kb} de 102 KB (Gmail no lo recorta)`;
  });

  constructor() {
    effect(() => {
      if (this.ui.emailExportOpen()) {
        untracked(() => {
          this.copied.set(false);
          this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    this.ui.emailExportOpen.set(false);
  }

  private fileName(): string {
    const base = (this.entryName().split('/').pop() ?? '').replace(/\.(pug|jade)$/i, '') || this.projectState.projectName() || 'correo';
    return `${base}-correo.html`;
  }

  private summary(r: EmailResult): string {
    return `${emailKb(r.bytes)}${this.inlineCss() ? ', CSS en línea' : ''}, ${r.warnings.length} ${r.warnings.length === 1 ? 'aviso' : 'avisos'}`;
  }

  protected async copy(): Promise<void> {
    const r = this.result();
    if (!r) return;
    try {
      await navigator.clipboard.writeText(r.html);
      this.copied.set(true);
      this.terminal.addEntry('success', 'Exportar', `HTML para correo copiado (${this.summary(r)}).`);
    } catch {
      this.terminal.addEntry('error', 'Exportar', 'No se pudo copiar al portapapeles: usa «Descargar .html».');
    }
  }

  protected download(): void {
    const r = this.result();
    if (!r) return;
    this.projectIo.downloadText(r.html, this.fileName());
    this.terminal.addEntry(r.warnings.some((w) => w.level === 'error') ? 'warning' : 'success', 'Exportar', `${this.fileName()} descargado (${this.summary(r)}).`);
    this.close();
  }
}
