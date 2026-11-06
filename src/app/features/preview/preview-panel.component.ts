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
import { injectIntoBody, pinBaseUrl } from '../../core/utils/html-injection.util';
import { openInHost } from '../../core/render/preview-host';
import { A11yIssue, a11yReport, buildPageChrome, describePageIssue, fitScale, pageCountFor, pageIssuesKey } from '../../core/utils/preview-layout.util';
import { PreviewState } from '../../core/state/preview.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { DiagnosticsState } from '../../core/state/diagnostics.state';
import { ProblemsListComponent } from './problems-list.component';
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
  imports: [InspectorPanelComponent, PdfBarComponent, ProblemsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="preview-section" aria-label="Vista previa">
      <div class="preview-header">
        <div class="preview-header-left">
          <span class="preview-title">
            <span class="live-dot"></span>
            Vista previa
          </span>
          <div class="device-switcher">
            <button
              class="device-btn"
              title="Escritorio" aria-label="Escritorio"
              [class.active]="!previewState.isPdf() && deviceKind() === 'desktop'"
              (click)="selectDevice('Desktop')">
              <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">desktop_windows</span>
            </button>
            <button
              class="device-btn"
              title="Tableta" aria-label="Tableta"
              [class.active]="!previewState.isPdf() && deviceKind() === 'tablet'"
              (click)="selectDevice('Tablet')">
              <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">tablet_mac</span>
            </button>
            <button
              class="device-btn"
              title="Móvil" aria-label="Móvil"
              [class.active]="!previewState.isPdf() && deviceKind() === 'mobile'"
              (click)="selectDevice('Mobile')">
              <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">smartphone</span>
            </button>
            <button
              class="device-btn"
              [class.active]="previewState.isPdf()"
              title="PDF / página impresa" aria-label="PDF / página impresa"
              (click)="setDevice('PDF', 0, 0)">
              <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">picture_as_pdf</span>
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
            <select class="zoom-select device-select" title="Dispositivo" aria-label="Dispositivo" (change)="selectDevice($any($event.target).value)">
              @for (d of presets; track d.name) {
                <option [value]="d.name" [selected]="d.name === previewState.deviceName()">{{ d.label }} ({{ d.width }}×{{ d.height }})</option>
              }
            </select>
            @if (deviceKind() !== 'desktop') {
              <button class="preview-action" title="Girar" aria-label="Girar" (click)="rotateDevice()">
                <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">screen_rotation</span>
              </button>
            }
          }
          <button class="preview-action" [class.active]="previewState.colorScheme() !== 'auto'" [title]="'Modo de color simulado: ' + previewState.colorScheme()" [attr.aria-label]="'Modo de color simulado: ' + previewState.colorScheme()" (click)="cycleColorScheme()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">{{ schemeIcon() }}</span>
          </button>
          <button class="preview-action" title="Auditoría de accesibilidad (resultados en el Registro)" aria-label="Auditoría de accesibilidad (resultados en el Registro)" (click)="runA11y()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">accessibility_new</span>
          </button>
          <select class="zoom-select" title="Zoom" aria-label="Zoom" [value]="zoomValue()" (change)="onZoom($any($event.target).value)">
            <option value="fit">Ajustar ({{ scalePercent() }}%)</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
          </select>
          @if (previewState.isPdf()) {
            <button class="preview-action" title="Imprimir / Guardar como PDF" aria-label="Imprimir / Guardar como PDF" (click)="onPrint()">
              <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">print</span>
            </button>
          }
          <button class="preview-action" [class.active]="inspectorState.isActive()" title="Inspeccionar elemento" aria-label="Inspeccionar elemento" (click)="inspectorState.toggleInspector()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">ads_click</span>
          </button>
          <button class="preview-action" title="Descargar captura PNG de la vista previa" aria-label="Descargar captura PNG de la vista previa" (click)="projectIo.exportPng()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">photo_camera</span>
          </button>
          <button class="preview-action" title="Recargar vista previa" aria-label="Recargar vista previa" (click)="onReload()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          </button>
          <button class="preview-action" title="Abrir en una pestaña nueva" aria-label="Abrir en una pestaña nueva" (click)="onOpenNewTab()">
            <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
          </button>
        </div>
      </div>
      @if (previewState.isPdf()) {
        <app-pdf-bar [pageCount]="pageCount()" [issues]="pageIssues()" />
      }
      @if (previewState.hasErrors()) {
        <div class="compile-error" role="alert">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">error</span>
          <span class="compile-error-text">
            <strong>{{ previewState.errors().length === 1 ? 'Error de compilación' : previewState.errors().length + ' errores de compilación' }}:</strong>
            {{ previewState.errors()[0].message }}
            @if (previewState.errors()[0].hint; as hint) {
              <span class="compile-error-hint">{{ hint }}</span>
            }
          </span>
          @if (errorLocation(); as loc) {
            <button class="compile-error-btn" (click)="goToError()" [title]="'Abrir ' + loc.path + ' en la línea ' + loc.line">
              Ir al error ({{ loc.name }}:{{ loc.line }})
            </button>
          }
          @if (previewState.errors()[0].fix; as fix) {
            <button class="compile-error-btn compile-error-fix" (click)="orchestrator.applyFix(fix)">{{ fix.label }}</button>
          }
          @if (diagnosticsState.diagnostics().length > 1) {
            <button class="compile-error-btn" (click)="problemsOpen.update(v => !v)" [attr.aria-expanded]="problemsOpen()">
              {{ problemsOpen() ? 'Ocultar problemas' : 'Todos los problemas (' + diagnosticsState.diagnostics().length + ')' }}
            </button>
          }
          <button class="compile-error-btn" (click)="terminal.isVisible.set(true)">Ver Registro</button>
        </div>
        @if (problemsOpen() && diagnosticsState.diagnostics().length > 1) {
          <app-problems-list />
        }
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
              title="Vista previa de la plantilla"
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
      flex-wrap: wrap;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 82, 82, 0.12);
      border-bottom: 1px solid rgba(255, 82, 82, 0.4);
      color: #ff8a80;
      font-size: 12px;
    }
    .compile-error-text {
      flex: 1 1 220px;
      min-width: 0;
      max-height: 96px;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .compile-error-hint {
      display: block;
      margin-top: 2px;
      color: var(--text-secondary, #ffcdd2);
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
  /**
   * Estado del iframe del preview: 'none' (sin cargar), 'loading' (cargando el programa), 'ready' (el programa recibe
   * documentos por mensaje, sin recargar) o 'legacy' (respaldo: `srcdoc` completo con los assets como data URI).
   */
  private frameState: 'none' | 'loading' | 'ready' | 'legacy' = 'none';
  private currentHtml = '';
  private pendingHtml: string | null = null;
  /** Assets ya enviados a este iframe (huella de sus URL); null = el iframe es nuevo y no tiene ninguno. */
  private sentAssetsKey: string | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private watchdogFailures = 0;

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
          this.clearWatchdog();
          this.watchdogFailures = 0;
          if (this.frameState === 'loading' && d['hasDoc'] === false) {
            this.frameState = 'ready';
            this.sentAssetsKey = null; // iframe nuevo: aún no tiene assets
            if (this.pendingHtml !== null) this.deliver();
          }
          this.sendFrameState();
          break;
        case 'pugide-doc-error':
          // El navegador no dejó reescribir el documento o crear las URL: se vuelve al srcdoc completo.
          this.clearWatchdog();
          this.useLegacy();
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
      this.terminal.addEntry('warning', 'Accesibilidad', 'No hay vista previa compilada que auditar.');
      return;
    }
    this.terminal.isVisible.set(true);
    this.postToFrame({ source: 'pugide-a11y-run' });
  }

  private reportA11y(issues: A11yIssue[]): void {
    for (const line of a11yReport(issues, (sig) => this.locatePug(sig))) this.terminal.addEntry(line.type, 'Accesibilidad', line.message);
  }

  ngAfterViewInit(): void {
    const el = this.canvas.nativeElement;
    this.canvasObserver = new ResizeObserver(() => this.canvasSize.set({ width: el.clientWidth, height: el.clientHeight }));
    this.canvasObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.canvasObserver?.disconnect();
    window.removeEventListener('message', this.messageListener);
    this.clearWatchdog();
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
  /** Archivo y línea del primer error si se conocen (sin archivo, el de entrada). */
  readonly errorLocation = computed(() => {
    const e = this.previewState.errors()[0];
    const path = e?.path ?? this.previewState.entryPath();
    if (!e || !e.line || !path) return null;
    return { path, line: e.line, name: path.split('/').pop() ?? path };
  });

  protected problemsOpen = signal(false);
  protected diagnosticsState = inject(DiagnosticsState);

  goToError(): void {
    const loc = this.errorLocation();
    if (loc) this.editorState.revealLine(loc.path, loc.line);
  }

  onOpenNewTab(): void {
    const html = this.previewState.compiledHtml();
    if (!html) return;
    if (!openInHost({ kind: 'html', html: this.withDataUris(html) })) {
      this.terminal.addEntry('warning', 'Vista previa', 'El navegador bloqueó la pestaña nueva: permite las ventanas emergentes para este sitio.');
    }
  }

  /**
   * Prepara el HTML para un iframe de origen opaco: los `blob:` de los assets no cargan ahí y se sustituyen por data
   * URIs, y se fija la URL base para que las referencias relativas no se pidan al servidor de la app.
   */
  private withDataUris(html: string): string {
    if (!html) return html;
    let out = pinBaseUrl(html);
    for (const [blob, uri] of this.assetState.blobToDataUri()) if (out.includes(blob)) out = out.split(blob).join(uri);
    return out;
  }

  /**
   * Respaldo: añade el programa del preview como `<script src>` absoluto (un `srcdoc` hereda la CSP de la app, que admite
   * scripts propios pero no inline; sin cabeceras, como en `ng serve`, no hay CSP y funciona igual).
   */
  private withLegacyRuntime(html: string): string {
    return html ? injectIntoBody(html, `<script src="${new URL('assets/preview-runtime.js', document.baseURI).href}"></script>`) : html;
  }

  /**
   * Muestra el HTML en el iframe aislado (origen opaco). El iframe se carga una vez con `assets/preview-frame.html`
   * (documento propio, con su Content-Security-Policy por cabecera: con `srcdoc` el código del usuario heredaría la
   * CSP de la app, que no admite scripts inline ni `eval`), cuyo programa `preview-runtime.js` pagina, mide e imprime
   * desde dentro. Después recibe cada compilación por `postMessage` (`pugide-doc`): el HTML conserva las URL `blob:`
   * de los assets como marcador y el programa las sustituye por URL propias creadas a partir de los `Blob` que la app
   * le envía (`pugide-assets`) solo cuando los assets cambian, sin volver a codificarlos en base64 en cada
   * compilación. El estado compilado no cambia.
   * Respaldo: si el documento no es de origen opaco (servidor sin las cabeceras de vercel.json, como `ng serve`), el
   * navegador no deja reescribirlo o el iframe no confirma, se usa un `srcdoc` completo con `sandbox` en el atributo y los
   * assets como data URI (`withDataUris`). Hereda la CSP de la app: con las cabeceras de producción el programa carga
   * (`script-src 'self'`) pero los `<script>` inline de la plantilla no se ejecutan; sin cabeceras funciona todo.
   */
  private updatePreview(html: string): void {
    this.currentHtml = html;
    if (this.frameState === 'legacy') {
      this.renderLegacy(html);
      return;
    }
    this.pendingHtml = html;
    if (this.frameState === 'ready') this.deliver();
    else if (this.frameState === 'none') this.loadShell();
    // 'loading': el documento pendiente se envía cuando el programa avise de que está listo.
  }

  private loadShell(): void {
    this.frameState = 'loading';
    this.sentAssetsKey = null;
    this.armWatchdog(() => this.useLegacy());
    const frame = this.previewFrame.nativeElement;
    // Sin atributo `sandbox`: el aislamiento lo da la cabecera `Content-Security-Policy: sandbox` de ese documento (origen
    // opaco igualmente) y así la navegación del iframe pasa por el service worker, que no intercepta las de un iframe con
    // el atributo (sin conexión no cargaría). El programa se niega a recibir el HTML si el documento no es de origen opaco.
    frame.removeAttribute('sandbox');
    frame.removeAttribute('srcdoc');
    frame.src = 'assets/preview-frame.html';
  }

  /** Envía al iframe el documento pendiente, precedido de los assets si cambiaron desde la última vez. */
  private deliver(): void {
    const html = this.pendingHtml;
    if (html === null) return;
    this.pendingHtml = null;
    this.sendAssetsIfChanged();
    this.postToFrame({ source: 'pugide-doc', html: html ? pinBaseUrl(html) : '' });
    // El programa avisa al terminar de escribirlo; si no (el documento navegó fuera, p. ej. un enlace), se recarga el iframe.
    this.armWatchdog(() => {
      this.frameState = 'none';
      if (++this.watchdogFailures > 1) {
        this.useLegacy();
        return;
      }
      this.pendingHtml = this.currentHtml;
      this.loadShell();
    });
  }

  private sendAssetsIfChanged(): void {
    const entries = this.assetState.blobEntries();
    const key = entries.map((e) => e.url).sort().join('|');
    if (key === (this.sentAssetsKey ?? '')) {
      this.sentAssetsKey = key;
      return;
    }
    this.sentAssetsKey = key;
    this.postToFrame({ source: 'pugide-assets', files: entries });
  }

  private useLegacy(): void {
    this.frameState = 'legacy';
    this.pendingHtml = null;
    this.renderLegacy(this.currentHtml);
  }

  private renderLegacy(html: string): void {
    if (!this.previewFrame) return;
    const frame = this.previewFrame.nativeElement;
    // Respaldo: aquí el aislamiento es el atributo, que se fija antes de navegar.
    frame.setAttribute('sandbox', 'allow-scripts allow-modals');
    frame.removeAttribute('src');
    frame.srcdoc = this.withLegacyRuntime(this.withDataUris(html));
  }

  private armWatchdog(onTimeout: () => void): void {
    this.clearWatchdog();
    this.watchdog = setTimeout(() => {
      this.watchdog = null;
      onTimeout();
    }, 4000);
  }

  private clearWatchdog(): void {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
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
