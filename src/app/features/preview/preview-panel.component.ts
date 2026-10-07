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
import { paginateDocument, resetPagination } from '../../core/utils/paginate.util';
import { PreviewState } from '../../core/state/preview.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { InspectorState } from '../../core/state/inspector.state';
import { DEVICE_PRESETS, findDevicePreset, ColorSchemeSim } from '../../core/utils/device-presets.util';
import { EditorState } from '../../core/state/editor.state';
import { TerminalState } from '../../core/state/terminal.state';
import { findPugSource } from '../../core/utils/pug-source-map.util';
import { InspectorPanelComponent } from '../inspector/inspector-panel.component';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
  imports: [InspectorPanelComponent],
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
          <button class="preview-action" [class.active]="previewState.colorScheme() !== 'auto'" [title]="'Modo de color simulado: ' + previewState.colorScheme()" (click)="cycleColorScheme()">
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
          <button class="preview-action" [class.active]="inspectorState.isActive()" title="Inspect Element" (click)="inspectorState.toggleInspector()">
            <span class="material-symbols-outlined" style="font-size: 18px;">ads_click</span>
          </button>
          <button class="preview-action" title="Refresh" (click)="onReload()">
            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          </button>
          <button class="preview-action" title="Open in New Tab" (click)="onOpenNewTab()">
            <span class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
          </button>
        </div>
      </div>
      @if (previewState.isPdf()) {
        <div class="pdf-bar">
          <span class="pdf-size" [title]="previewState.pageSize().source === 'css' ? 'Tamaño leído de @page { size }' : 'Sin @page en la plantilla: A4 por defecto'">
            {{ previewState.pageSize().label }} · {{ previewState.pageSize().width }}×{{ previewState.pageSize().height }}px
            @if (previewState.pageSize().source === 'default') { <em>(por defecto)</em> } @else if (previewState.pageSize().source === 'manual') { <em>(girado)</em> }
          </span>
          <div class="device-switcher">
            <button class="device-btn" [class.active]="isLandscape()" title="Horizontal" (click)="setOrientation('landscape')">
              <span class="material-symbols-outlined" style="font-size: 16px;">crop_landscape</span>
            </button>
            <button class="device-btn" [class.active]="!isLandscape()" title="Vertical" (click)="setOrientation('portrait')">
              <span class="material-symbols-outlined" style="font-size: 16px;">crop_portrait</span>
            </button>
          </div>
          <span class="pdf-size">{{ pageCount() }} {{ pageCount() === 1 ? 'página' : 'páginas' }}</span>
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
              sandbox="allow-scripts allow-same-origin allow-modals"
              [style.width.px]="frameWidth()"
              [style.height.px]="frameHeight()"
              [style.transform]="'scale(' + scale() + ')'"
              (load)="onIframeLoad()">
            </iframe>
            @if (previewState.isPdf()) {
              <div class="page-guides" [style.background-size]="'100% ' + (previewState.pageSize().height * scale()) + 'px'"></div>
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
      align-items: center;
      justify-content: space-between;
      height: 36px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container);
      flex-shrink: 0;
    }

    .preview-header-left {
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
      flex-shrink: 0;
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

    .pdf-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 4px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
      flex-shrink: 0;
    }

    .pdf-size {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .device-select { max-width: 150px; }

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
  private orchestrator = inject(OrchestratorService);
  private preferences = inject(PreferencesState);
  private editorState = inject(EditorState);
  private terminal = inject(TerminalState);
  protected readonly presets = DEVICE_PRESETS;
  protected readonly deviceKind = computed(() => findDevicePreset(this.previewState.deviceName())?.kind ?? 'desktop');
  protected readonly schemeIcon = computed(() => {
    const m = this.previewState.colorScheme();
    return m === 'dark' ? 'dark_mode' : m === 'light' ? 'light_mode' : 'contrast';
  });
  private lastBlobUrl: string | null = null;
  private canvasObserver: ResizeObserver | null = null;
  private contentObserver: ResizeObserver | null = null;

  private readonly canvasSize = signal({ width: 0, height: 0 });
  /** Rendered height of the PDF document's content, measured inside the iframe. */
  private readonly contentHeight = signal(0);

  protected readonly frameWidth = computed(() =>
    this.previewState.isPdf() ? this.previewState.pageSize().width : this.previewState.deviceWidth());

  /** PDF: as many whole pages as the content needs, so the frame ends on a page boundary. */
  protected readonly pageCount = computed(() => {
    const page = this.previewState.pageSize().height;
    return Math.max(1, Math.ceil(this.contentHeight() / page));
  });

  protected readonly frameHeight = computed(() =>
    this.previewState.isPdf() ? this.pageCount() * this.previewState.pageSize().height : this.previewState.deviceHeight());

  protected readonly scale = computed(() => {
    const mode = this.previewState.zoomMode();
    if (mode !== 'fit') return mode / 100;
    const { width, height } = this.canvasSize();
    if (!width || !height) return 1;
    const availW = Math.max(width - 64, 100);
    const availH = Math.max(height - 64, 100);
    // A PDF scrolls vertically (many pages), so it only has to fit the width.
    const s = this.previewState.isPdf()
      ? availW / this.frameWidth()
      : Math.min(availW / this.frameWidth(), availH / this.frameHeight());
    return Math.min(1, s);
  });

  protected readonly scalePercent = computed(() => Math.round(this.scale() * 100));
  protected readonly zoomValue = computed(() => String(this.previewState.zoomMode()));
  private messageListener = (e: MessageEvent): void => {
    if (e.source !== this.previewFrame?.nativeElement.contentWindow) return;
    if (e.data?.source === 'pugide-inspector') {
      const loc = this.locatePug(e.data.sig);
      this.inspectorState.selectElement({
        tagName: e.data.tagName,
        attrs: e.data.attrs ?? {},
        htmlLine: e.data.htmlLine,
        pugLine: loc?.line,
        pugPath: loc?.path,
        pugApproximate: loc?.approximate,
        children: [],
      });
      if (loc) this.editorState.revealLine(loc.path, loc.line);
    } else if (e.data?.source === 'pugide-a11y') {
      this.reportA11y(e.data.issues ?? []);
    }
  };

  constructor() {
    this.restoreDevice();
    effect(() => {
      const html = this.previewState.compiledHtml();
      if (html && this.previewFrame) {
        this.updatePreview(html);
      }
    });

    // Re-flow when switching to/from PDF or when the sheet size / orientation changes.
    effect(() => {
      this.previewState.isPdf();
      this.previewState.pageSize();
      untracked(() => this.reflow());
    });

    effect(() => {
      const active = this.inspectorState.isActive();
      this.previewFrame?.nativeElement.contentWindow?.postMessage(
        { source: 'pugide-inspector-toggle', active },
        window.location.origin
      );
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

  private postColorScheme(): void {
    const mode = this.previewState.colorScheme();
    this.previewFrame?.nativeElement.contentWindow?.postMessage(
      { source: 'pugide-color-scheme', scheme: mode === 'auto' ? null : mode },
      window.location.origin
    );
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
    const win = this.previewFrame?.nativeElement.contentWindow;
    if (!win || !this.previewState.compiledHtml()) {
      this.terminal.addEntry('warning', 'A11y', 'No hay vista previa compilada que auditar.');
      return;
    }
    this.terminal.isVisible.set(true);
    win.postMessage({ source: 'pugide-a11y-run' }, window.location.origin);
  }

  private reportA11y(issues: any[]): void {
    if (issues.length === 0) {
      this.terminal.addEntry('success', 'A11y', 'Auditoria basica: sin problemas detectados (contraste, alt, labels, encabezados).');
      return;
    }
    this.terminal.addEntry('info', 'A11y', `Auditoria basica: ${issues.length} problema(s).`);
    for (const i of issues) {
      const loc = this.locatePug(i.sig);
      const where = loc ? ` (${loc.path}:${loc.line}${loc.approximate ? ' ~' : ''})` : i.htmlLine ? ` (HTML linea ${i.htmlLine})` : '';
      this.terminal.addEntry(i.severity === 'error' ? 'error' : 'warning', 'A11y', `[${i.rule}] ${i.message} <${i.element}>${where}`);
    }
  }

  ngAfterViewInit(): void {
    const el = this.canvas.nativeElement;
    this.canvasObserver = new ResizeObserver(() => this.canvasSize.set({ width: el.clientWidth, height: el.clientHeight }));
    this.canvasObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.canvasObserver?.disconnect();
    this.contentObserver?.disconnect();
    window.removeEventListener('message', this.messageListener);
  }

  onIframeLoad(): void {
    this.observeContent();
    this.postColorScheme();
    this.previewFrame?.nativeElement.contentWindow?.postMessage(
      { source: 'pugide-inspector-toggle', active: this.inspectorState.isActive() },
      window.location.origin
    );
  }

  setDevice(name: string, width: number, height: number): void {
    this.previewState.setDevice(name, width, height);
    this.preferences.update({ previewDevice: name });
  }

  protected isLandscape(): boolean {
    const { width, height } = this.previewState.pageSize();
    return width >= height;
  }

  setOrientation(o: 'landscape' | 'portrait'): void {
    this.previewState.pdfOrientation.set(o);
  }

  onZoom(value: string): void {
    this.previewState.zoomMode.set(value === 'fit' ? 'fit' : Number(value));
  }

  /** Prints just the preview document; `@page` of the template (or the shown A4 fallback) sets the sheet. */
  onPrint(): void {
    const win = this.previewFrame?.nativeElement.contentWindow;
    const doc = win?.document;
    if (!win || !doc) return;
    let injected: HTMLStyleElement | null = null;
    const size = this.previewState.pageSize();
    if (size.source !== 'css') {
      injected = doc.createElement('style');
      injected.textContent = `@page { size: ${size.width}px ${size.height}px; margin: 0; }`;
      doc.head.appendChild(injected);
    }
    win.addEventListener('afterprint', () => injected?.remove(), { once: true });
    win.focus();
    win.print();
  }

  private restoreDevice(): void {
    const saved = this.preferences.previewDevice();
    const preset = findDevicePreset(saved);
    if (preset) this.previewState.setDevice(preset.name, preset.width, preset.height);
    else if (saved === 'PDF') this.previewState.setDevice('PDF', 0, 0);
  }

  /** Tracks the document height inside the iframe (same-origin blob) so the PDF view shows whole pages. */
  private observeContent(): void {
    this.contentObserver?.disconnect();
    const doc = this.previewFrame?.nativeElement.contentDocument;
    if (!doc?.body) return;
    this.reflow();
    this.contentObserver = new ResizeObserver(() => {
      // Images / fonts finishing late move everything below them: paginate again when the height changed.
      if (doc.body.scrollHeight !== this.paginatedHeight) this.reflow();
      else this.measure();
    });
    this.contentObserver.observe(doc.body);
    // Web fonts change text metrics after load; paginate again once they are in.
    void doc.fonts?.ready.then(() => this.reflow());
  }

  private paginatedHeight = -1;

  private measure(): void {
    const body = this.previewFrame?.nativeElement.contentDocument?.body;
    if (body) this.contentHeight.set(Math.max(body.scrollHeight, body.offsetHeight));
  }

  /** PDF: emulate page breaks inside the preview document; other devices show the plain flow. */
  private reflow(): void {
    const doc = this.previewFrame?.nativeElement.contentDocument;
    if (!doc?.body) return;
    resetPagination(doc);
    if (this.previewState.isPdf()) paginateDocument(doc, this.previewState.pageSize().height);
    this.paginatedHeight = doc.body.scrollHeight;
    this.measure();
  }

  onReload(): void {
    this.orchestrator.manualCompile();
  }

  onOpenNewTab(): void {
    const html = this.previewState.compiledHtml();
    if (html) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }

  private updatePreview(html: string): void {
    if (!this.previewFrame) return;
    const iframe = this.previewFrame.nativeElement;
    if (this.lastBlobUrl) {
      URL.revokeObjectURL(this.lastBlobUrl);
    }
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.lastBlobUrl = url;
    iframe.src = url;
  }
}
