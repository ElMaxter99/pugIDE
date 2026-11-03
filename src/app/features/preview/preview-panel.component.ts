import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  signal,
  untracked,
  computed,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { PreferencesState } from '../../core/services/preferences.state';
import { PageBreakIssue, PageGeometry, pageGeometry } from '../../core/utils/paginate.util';
import { AssetState } from '../../core/state/asset.state';
import { injectIntoBody } from '../../core/utils/html-injection.util';
import { loadPreviewRuntime } from '../../core/render/preview-runtime';
import { openInHost } from '../../core/render/preview-host';
import { A11yIssue, a11yReport, buildPageChrome, describePageIssue, fitScale, pageCountFor, pageIssuesKey } from '../../core/utils/preview-layout.util';
import { PreviewState } from '../../core/state/preview.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { ProjectIoService } from '../../core/services/project-io.service';
import { InspectorState } from '../../core/state/inspector.state';
import { DEVICE_PRESETS, findDevicePreset, ColorSchemeSim } from '../../core/utils/device-presets.util';
import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from '../../core/state/terminal.state';
import { findPugSource } from '../../core/utils/pug-source-map.util';
import { PdfBarComponent } from './pdf-bar.component';
import { InspectorPanelComponent } from '../inspector/inspector-panel.component';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [InspectorPanelComponent, PdfBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="preview-section">
      <div class="preview-header">
        <div class="preview-header-left">
          <span class="preview-title">
            <span class="live-dot"></span>
            Live Preview
          </span>
          <div class="device-switcher">
            <button
              class="device-btn"
              title="Escritorio"
              [class.active]="!previewState.isPdf() && deviceKind() === 'desktop'"
              (click)="selectDevice('Desktop')">
              <span class="material-symbols-outlined" style="font-size: 16px;">desktop_windows</span>
            </button>
            <button
              class="device-btn"
              title="Tablet"
              [class.active]="!previewState.isPdf() && deviceKind() === 'tablet'"
              (click)="selectDevice('Tablet')">
              <span class="material-symbols-outlined" style="font-size: 16px;">tablet_mac</span>
            </button>
            <button
              class="device-btn"
              title="Movil"
              [class.active]="!previewState.isPdf() && deviceKind() === 'mobile'"
              (click)="selectDevice('Mobile')">
              <span class="material-symbols-outlined" style="font-size: 16px;">smartphone</span>
            </button>
            <button
              class="device-btn"
              [class.active]="previewState.isPdf()"
              title="PDF / página impresa"
              (click)="setDevice('PDF', 0, 0)">
              <span class="material-symbols-outlined" style="font-size: 16px;">picture_as_pdf</span>
            </button>
          </div>
        </div>
        <div class="preview-header-right">
          @if (orchestrator.locales().length) {
            <select class="zoom-select locale-select" data-testid="preview-locale" title="Idioma de las traducciones (locales/)" aria-label="Idioma de las traducciones"
                    (change)="orchestrator.setTranslationLocale($any($event.target).value)">
              @for (code of orchestrator.locales(); track code) {
                <option [value]="code" [selected]="code === orchestrator.activeLocale()">{{ code }}</option>
              }
            </select>
          }
          @if (!previewState.isPdf()) {
            <select class="zoom-select device-select" title="Dispositivo" [value]="previewState.deviceName()" (change)="selectDevice($any($event.target).value)">
              @for (d of presets; track d.name) {
                <option [value]="d.name">{{ d.name }} ({{ d.width }}x{{ d.height }})</option>
              }
            </select>
            @if (deviceKind() !== 'desktop') {
              <button class="preview-action" title="Girar" (click)="rotateDevice()">
                <span class="material-symbols-outlined" style="font-size: 18px;">screen_rotation</span>
              </button>
            }
          }
          <button class="preview-action" [class.active]="previewState.colorScheme() !== 'auto'" [title]="'Modo de color simulado: ' + previewState.colorScheme()" [attr.aria-label]="'Modo de color simulado: ' + previewState.colorScheme()" (click)="cycleColorScheme()">
            <span class="material-symbols-outlined" style="font-size: 18px;">{{ schemeIcon() }}</span>
          </button>
          <button class="preview-action" title="Auditoria de accesibilidad (resultados en la terminal)" (click)="runA11y()">
            <span class="material-symbols-outlined" style="font-size: 18px;">accessibility_new</span>
          </button>
          <select class="zoom-select" title="Zoom" [value]="zoomValue()" (change)="onZoom($any($event.target).value)">
            <option value="fit">Ajustar ({{ scalePercent() }}%)</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </select>
          @if (previewState.isPdf()) {
            <button class="preview-action" title="Imprimir / Guardar como PDF" (click)="onPrint()">
              <span class="material-symbols-outlined" style="font-size: 18px;">print</span>
            </button>
          }
          <button class="preview-action" [class.active]="inspectorState.isActive()" title="Inspeccionar elemento" aria-label="Inspeccionar elemento" (click)="inspectorState.toggleInspector()">
            <span class="material-symbols-outlined" style="font-size: 18px;">ads_click</span>
          </button>
          <button class="preview-action" title="Descargar captura PNG de la vista previa" aria-label="Descargar captura PNG de la vista previa" (click)="projectIo.exportPng()">
            <span class="material-symbols-outlined" style="font-size: 18px;">photo_camera</span>
          </button>
          <button class="preview-action" title="Recargar vista previa" aria-label="Recargar vista previa" (click)="onReload()">
            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          </button>
          <button class="preview-action" title="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva" (click)="onOpenNewTab()">
            <span class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
          </button>
        </div>
      </div>
      @if (previewState.isPdf()) {
        <app-pdf-bar [pageCount]="pageCount()" [issues]="pageIssues()" />
      }
      @if (previewState.hasErrors()) {
        <div class="compile-error" role="alert">
          <span class="material-symbols-outlined" style="font-size: 16px;">error</span>
          <span class="compile-error-text">
            <strong>{{ previewState.errors().length === 1 ? 'Error de compilación' : previewState.errors().length + ' errores de compilación' }}:</strong>
            {{ previewState.errors()[0].message }}
          </span>
          <button class="compile-error-btn" (click)="terminal.isVisible.set(true)">Ver terminal</button>
        </div>
      }
      <div class="preview-viewport">
        <div class="preview-canvas" #canvas>
          <div class="checkerboard"></div>
          @if (previewState.isLoading()) {
            <div class="loading-overlay">
              <div class="spinner"></div>
            </div>
          }
          <div class="frame-wrap" [style.width.px]="frameWidth() * scale()" [style.height.px]="frameHeight() * scale()">
            <iframe
              #previewFrame
              class="preview-iframe"
              sandbox="allow-scripts allow-modals"
              [style.width.px]="frameWidth()"
              [style.height.px]="frameHeight()"
              [style.transform]="'scale(' + scale() + ')'"
              (load)="onIframeLoad()">
            </iframe>
            @if (previewState.isPdf()) {
              <div class="page-guides" [style.background-size]="'100% ' + (previewState.pageSize().height * scale()) + 'px'"></div>
              @if (pageChrome().length) {
                <div class="page-chrome" aria-hidden="true"
                  [style.width.px]="frameWidth()" [style.height.px]="frameHeight()" [style.transform]="'scale(' + scale() + ')'">
                  @for (b of pageChrome(); track b.id) {
                    <div class="pg-box" [style]="b.style">{{ b.text }}</div>
                  }
                </div>
              }
            }
          </div>
        </div>
        @if (inspectorState.isActive()) {
          <div class="inspector-dock">
            <app-inspector-panel />
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1.2;
      min-width: 320px;
      height: 100%;
      overflow: hidden;
      background: var(--bg-surface);
    }

    .preview-section {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .preview-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 4px 12px;
      min-height: 36px;
      padding: 4px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container);
      flex-shrink: 0;
    }

    .preview-header-left {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .preview-title {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--secondary-color);
      animation: pulse-primary 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    .device-switcher {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      background: var(--bg-surface-container-low);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
    }

    .device-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 24px;
      border-radius: 3px;
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .device-btn:hover {
      color: var(--text-primary);
    }

    .device-btn.active {
      background: var(--accent-container);
      color: var(--text-on-primary-container);
    }

    .preview-header-right {
      flex-wrap: wrap;
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .preview-action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius);
      color: var(--text-secondary);
      transition: all 0.15s;
    }

    .preview-action:hover {
      background: var(--bg-surface-variant);
      color: var(--text-primary);
    }

    .preview-action.active {
      color: var(--accent-color);
      background: var(--accent-container);
    }

    .preview-viewport {
      flex: 1;
      min-height: 0;
      display: flex;
      background: var(--bg-surface-dim);
    }

    .inspector-dock {
      width: 240px;
      flex-shrink: 0;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-color);
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.2);
    }

    .preview-canvas {
      flex: 1;
      min-width: 0;
      overflow: auto;
      display: flex;
      padding: 32px;
      position: relative;
    }

    /* margin:auto centres without clipping the top/left when the frame overflows. */
    .frame-wrap {
      position: relative;
      margin: auto;
      flex-shrink: 0;
      z-index: 1;
    }

    .page-guides {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 2;
      background-image: linear-gradient(to bottom, transparent calc(100% - 2px), rgba(255, 64, 129, 0.75) calc(100% - 2px));
      background-repeat: repeat-y;
    }

    .page-chrome {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      pointer-events: none;
    }

    .pg-box {
      color: #000;
      font: 16px 'Times New Roman', Times, serif;
    }

    .device-select { max-width: 150px; }
    .locale-select { max-width: 110px; }

    .zoom-select {
      height: 24px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      background: var(--bg-surface-container-low);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
    }

    .checkerboard {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      pointer-events: none;
      background-image: radial-gradient(#eadfed 1px, transparent 0);
      background-size: 24px 24px;
    }

    .preview-iframe {
      border: none;
      border-radius: var(--radius-lg);
      background: white;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
    }

    .compile-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 82, 82, 0.12);
      border-bottom: 1px solid rgba(255, 82, 82, 0.4);
      color: #ff8a80;
      font-size: 12px;
    }
    .compile-error-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .compile-error-btn {
      background: transparent;
      border: 1px solid currentColor;
      border-radius: 4px;
      color: inherit;
      font-size: 11px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(22, 17, 27, 0.8);
      z-index: 10;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color);
      border-top-color: var(--accent-color);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse-primary {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `],
})
export class PreviewPanelComponent implements AfterViewInit, OnDestroy {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLElement>;

  previewState = inject(PreviewState);
  protected inspectorState = inject(InspectorState);
  protected orchestrator = inject(OrchestratorService);
  protected projectIo = inject(ProjectIoService);
  private preferences = inject(PreferencesState);
  private editorState = inject(EditorState);
  protected terminal = inject(TerminalState);
  protected readonly presets = DEVICE_PRESETS;
  protected readonly deviceKind = computed(() => findDevicePreset(this.previewState.deviceName())?.kind ?? 'desktop');
  protected readonly schemeIcon = computed(() => {
    const m = this.previewState.colorScheme();
    return m === 'dark' ? 'dark_mode' : m === 'light' ? 'light_mode' : 'contrast';
  });
  private canvasObserver: ResizeObserver | null = null;
  private assetState = inject(AssetState);
  private updateSeq = 0;

  private readonly canvasSize = signal({ width: 0, height: 0 });
  /** Alto del contenido del documento PDF, medido dentro del iframe y recibido por mensaje. */
  private readonly contentHeight = signal(0);

  protected readonly frameWidth = computed(() =>
    this.previewState.isPdf() ? this.previewState.pageSize().width : this.previewState.deviceWidth());

  /** PDF: as many whole pages as the content needs, so the frame ends on a page boundary. */
  protected readonly pageCount = computed(() => {
    return pageCountFor(this.contentHeight(), this.previewState.pageSize().height);
  });

  /** Hoja con sus márgenes (`@page { margin }`): lo que se descuenta del área de contenido de cada página. */
  private readonly geometry = computed<PageGeometry>(() =>
    pageGeometry(this.previewState.pageSize().height, this.previewState.pageRules().margin));

  protected readonly frameHeight = computed(() =>
    this.previewState.isPdf() ? this.pageCount() * this.previewState.pageSize().height : this.previewState.deviceHeight());

  /** Cajas de margen (cabeceras y pies) de cada página, ya posicionadas sobre la hoja. */
  protected readonly pageChrome = computed(() =>
    this.previewState.isPdf() ? buildPageChrome(this.previewState.pageRules(), this.previewState.pageSize(), this.pageCount()) : []);

  protected readonly scale = computed(() =>
    fitScale(this.previewState.zoomMode(), this.canvasSize(), { width: this.frameWidth(), height: this.frameHeight() }, this.previewState.isPdf()));

  protected readonly scalePercent = computed(() => Math.round(this.scale() * 100));
  protected readonly zoomValue = computed(() => String(this.previewState.zoomMode()));
  /**
   * El documento del preview es contenido del usuario y se ejecuta en un iframe de origen opaco: sus mensajes
   * no son de fiar. Solo se aceptan los de ese iframe, con la forma esperada, y un mensaje raro no rompe la app.
   */
  private messageListener = (e: MessageEvent): void => {
    if (e.source !== this.previewFrame?.nativeElement.contentWindow) return;
    const d = e.data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object') return;
    try {
      switch (d['source']) {
        case 'pugide-inspector': {
          const loc = this.locatePug(d['sig']);
          this.inspectorState.selectElement({
            tagName: String(d['tagName'] ?? ''),
            attrs: (d['attrs'] && typeof d['attrs'] === 'object' ? d['attrs'] : {}) as Record<string, string>,
            htmlLine: typeof d['htmlLine'] === 'number' ? d['htmlLine'] : undefined,
            pugLine: loc?.line,
            pugPath: loc?.path,
            pugApproximate: loc?.approximate,
            children: [],
          });
          if (loc) this.editorState.revealLine(loc.path, loc.line);
          break;
        }
        case 'pugide-a11y':
          this.reportA11y(Array.isArray(d['issues']) ? (d['issues'] as unknown[]).slice(0, 200).map(toA11yIssue) : []);
          break;
        case 'pugide-layout-result':
          if (typeof d['contentHeight'] === 'number' && Number.isFinite(d['contentHeight'])) this.contentHeight.set(d['contentHeight']);
          this.reportPageIssues(Array.isArray(d['issues']) ? (d['issues'] as PageBreakIssue[]) : []);
          break;
        case 'pugide-runtime-ready':
          this.sendFrameState();
          break;
      }
    } catch {
      /* un mensaje mal formado no debe afectar a la app */
    }
  };

  constructor() {
    this.restoreDevice();
    effect(() => {
      const html = this.previewState.compiledHtml();
      // Un html vacío (plantilla borrada) también se muestra: si no, el preview se quedaría con el render anterior.
      if (this.previewFrame) {
        this.updatePreview(html);
      }
    });

    // Re-flow when switching to/from PDF or when the sheet size / orientation changes.
    effect(() => {
      this.previewState.isPdf();
      this.previewState.pageSize();
      this.previewState.pageRules();
      untracked(() => this.sendLayout());
    });

    effect(() => {
      const active = this.inspectorState.isActive();
      this.postToFrame({ source: 'pugide-inspector-toggle', active });
    });

    effect(() => {
      this.previewState.colorScheme();
      untracked(() => this.postColorScheme());
    });

    window.addEventListener('message', this.messageListener);
  }

  private locatePug(sig: any) {
    const entry = this.previewState.entryPath();
    if (!sig || !entry) return null;
    const files = this.editorState.allFileContents();
    const code = this.editorState.activeTab()?.path === entry ? this.editorState.editorContent() : (files.get(entry) ?? '');
    return findPugSource(code, files, entry, sig);
  }

  /** El iframe tiene origen opaco: el destino de `postMessage` solo puede ser '*' (los mensajes no llevan nada sensible). */
  private postToFrame(message: Record<string, unknown>): void {
    this.previewFrame?.nativeElement.contentWindow?.postMessage(message, '*');
  }

  private postColorScheme(): void {
    const mode = this.previewState.colorScheme();
    this.postToFrame({ source: 'pugide-color-scheme', scheme: mode === 'auto' ? null : mode });
  }

  /** Pide al documento del preview que pagine (PDF) o muestre el flujo normal, y que mida su contenido. */
  private sendLayout(): void {
    this.postToFrame({ source: 'pugide-layout', pdf: this.previewState.isPdf(), geometry: this.geometry() });
  }

  /** Estado que el documento necesita al arrancar. */
  private sendFrameState(): void {
    this.postColorScheme();
    this.postToFrame({ source: 'pugide-inspector-toggle', active: this.inspectorState.isActive() });
    this.sendLayout();
  }

  cycleColorScheme(): void {
    const order: ColorSchemeSim[] = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(this.previewState.colorScheme()) + 1) % order.length];
    this.previewState.colorScheme.set(next);
  }

  selectDevice(name: string): void {
    const d = findDevicePreset(name);
    if (d) this.setDevice(d.name, d.width, d.height);
  }

  rotateDevice(): void {
    this.setDevice(this.previewState.deviceName(), this.previewState.deviceHeight(), this.previewState.deviceWidth());
  }

  runA11y(): void {
    if (!this.previewFrame?.nativeElement.contentWindow || !this.previewState.compiledHtml()) {
      this.terminal.addEntry('warning', 'A11y', 'No hay vista previa compilada que auditar.');
      return;
    }
    this.terminal.isVisible.set(true);
    this.postToFrame({ source: 'pugide-a11y-run' });
  }

  private reportA11y(issues: A11yIssue[]): void {
    for (const line of a11yReport(issues, (sig) => this.locatePug(sig))) this.terminal.addEntry(line.type, 'A11y', line.message);
  }

  ngAfterViewInit(): void {
    const el = this.canvas.nativeElement;
    this.canvasObserver = new ResizeObserver(() => this.canvasSize.set({ width: el.clientWidth, height: el.clientHeight }));
    this.canvasObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.canvasObserver?.disconnect();
    window.removeEventListener('message', this.messageListener);
  }

  onIframeLoad(): void {
    this.sendFrameState();
  }

  setDevice(name: string, width: number, height: number): void {
    this.previewState.setDevice(name, width, height);
    this.preferences.update({ previewDevice: name });
  }

  onZoom(value: string): void {
    this.previewState.zoomMode.set(value === 'fit' ? 'fit' : Number(value));
  }

  /** Imprime solo el documento del preview; `@page` de la plantilla (o el A4 que se muestra) fija la hoja. */
  onPrint(): void {
    const size = this.previewState.pageSize();
    let css: string | null = null;
    if (size.source !== 'css') {
      const m = this.previewState.pageRules().margin;
      const hasMargins = m.top + m.right + m.bottom + m.left > 0; // los márgenes de la plantilla se respetan
      css = `@page { size: ${size.width}px ${size.height}px;${hasMargins ? '' : ' margin: 0;'} }`;
    }
    this.postToFrame({ source: 'pugide-print', css });
  }

  private restoreDevice(): void {
    const saved = this.preferences.previewDevice();
    const preset = findDevicePreset(saved);
    if (preset) this.previewState.setDevice(preset.name, preset.width, preset.height);
    else if (saved === 'PDF') this.previewState.setDevice('PDF', 0, 0);
  }

  private lastIssueKey = '';

  /** PDF: elementos que se partirían mal al imprimir (imágenes cortadas, encabezados al final de página). */
  protected readonly pageIssues = signal<PageBreakIssue[]>([]);
  private reportPageIssues(issues: PageBreakIssue[]): void {
    this.pageIssues.set(issues);
    const key = pageIssuesKey(issues);
    if (key === this.lastIssueKey) return;
    this.lastIssueKey = key;
    for (const i of issues) this.terminal.addEntry('warning', 'PDF', describePageIssue(i));
  }

  onReload(): void {
    this.orchestrator.manualCompile();
  }

  /** Pestaña nueva con la vista previa: se abre una página de la app que la ejecuta en un iframe aislado. */
  onOpenNewTab(): void {
    const html = this.previewState.compiledHtml();
    if (!html) return;
    if (!openInHost({ kind: 'html', html: this.withDataUris(html) })) {
      this.terminal.addEntry('warning', 'Preview', 'El navegador bloqueó la pestaña nueva: permite las ventanas emergentes para este sitio.');
    }
  }

  /** Los `blob:` de los assets no cargan en un documento de origen opaco: se sustituyen por data URIs. */
  private withDataUris(html: string): string {
    let out = html;
    for (const [blob, uri] of this.assetState.blobToDataUri()) if (out.includes(blob)) out = out.split(blob).join(uri);
    return out;
  }

  /**
   * Muestra el HTML en el iframe aislado (`srcdoc`, origen opaco) junto con el programa que pagina, mide e
   * imprime desde dentro. El estado compilado no cambia: solo el documento que se enseña lleva ese programa.
   */
  private async updatePreview(html: string): Promise<void> {
    const seq = ++this.updateSeq;
    const runtime = await loadPreviewRuntime();
    if (seq !== this.updateSeq || !this.previewFrame) return; // llegó una compilación más reciente
    const doc = html && runtime ? injectIntoBody(this.withDataUris(html), `<script>${runtime}</script>`) : this.withDataUris(html);
    this.previewFrame.nativeElement.srcdoc = doc;
  }
}

/** Una incidencia de accesibilidad enviada por el iframe, con los tipos asegurados. */
function toA11yIssue(raw: unknown): A11yIssue {
  const i = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    rule: String(i['rule'] ?? ''),
    message: String(i['message'] ?? ''),
    element: String(i['element'] ?? ''),
    severity: String(i['severity'] ?? 'warning'),
    htmlLine: typeof i['htmlLine'] === 'number' ? i['htmlLine'] : undefined,
    sig: i['sig'],
  };
}
