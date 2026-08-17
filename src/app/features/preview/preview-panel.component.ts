import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  signal,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { PreviewState } from '../../core/state/preview.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { InspectorState } from '../../core/state/inspector.state';
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
            Vista previa en vivo
          </span>
          <div class="device-switcher">
            <button
              class="device-btn"
              title="Escritorio"
              [class.active]="previewState.deviceName() === 'Desktop'"
              (click)="setDevice('Desktop', 1200, 800)">
              <span class="material-symbols-outlined" style="font-size: 16px;">desktop_windows</span>
            </button>
            <button
              class="device-btn"
              title="Tableta"
              [class.active]="previewState.deviceName() === 'Tablet'"
              (click)="setDevice('Tablet', 768, 1024)">
              <span class="material-symbols-outlined" style="font-size: 16px;">tablet_mac</span>
            </button>
            <button
              class="device-btn"
              title="Móvil"
              [class.active]="previewState.deviceName() === 'Mobile'"
              (click)="setDevice('Mobile', 375, 812)">
              <span class="material-symbols-outlined" style="font-size: 16px;">smartphone</span>
            </button>
            <button
              class="device-btn"
              title="Tamaño personalizado"
              [class.active]="previewState.deviceName() === 'Custom'"
              (click)="customOpen.set(!customOpen())">
              <span class="material-symbols-outlined" style="font-size: 16px;">aspect_ratio</span>
            </button>
            @if (customOpen()) {
              <div class="custom-size-popover" (click)="$event.stopPropagation()">
                <input
                  type="number"
                  class="custom-size-input"
                  min="200"
                  [value]="previewState.deviceWidth()"
                  (change)="setCustomWidth($any($event.target).value)" />
                <span class="custom-size-x">×</span>
                <input
                  type="number"
                  class="custom-size-input"
                  min="200"
                  [value]="previewState.deviceHeight()"
                  (change)="setCustomHeight($any($event.target).value)" />
              </div>
            }
          </div>
        </div>
        <div class="preview-header-right">
          <button class="preview-action" [class.active]="inspectorState.isActive()" title="Inspeccionar elemento" (click)="inspectorState.toggleInspector()">
            <span class="material-symbols-outlined" style="font-size: 18px;">ads_click</span>
          </button>
          <button class="preview-action" title="Recargar" (click)="onReload()">
            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          </button>
          <button class="preview-action" title="Abrir en nueva pestaña" (click)="onOpenNewTab()">
            <span class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
          </button>
        </div>
      </div>
      <div class="preview-viewport">
        <div class="preview-canvas">
          <div class="checkerboard"></div>
          @if (previewState.isLoading()) {
            <div class="loading-overlay">
              <div class="spinner"></div>
            </div>
          }
          <iframe
            #previewFrame
            class="preview-iframe"
            sandbox="allow-scripts allow-same-origin"
            [style.width.px]="previewState.deviceWidth()"
            [style.height.px]="previewState.deviceHeight()"
            (load)="onIframeLoad()">
          </iframe>
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
      position: relative;
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

    .custom-size-popover {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 20;
    }

    .custom-size-input {
      width: 60px;
      padding: 3px 6px;
      background: var(--bg-input);
      border: 1px solid var(--border-color);
      border-radius: 3px;
      color: var(--text-primary);
      font-size: 12px;
      font-family: var(--font-mono);
    }

    .custom-size-x {
      color: var(--text-tertiary);
      font-size: 12px;
    }

    .preview-header-right {
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
      align-items: center;
      justify-content: center;
      padding: 32px;
      position: relative;
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
      position: relative;
      z-index: 1;
      max-width: 100%;
      max-height: 100%;
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
export class PreviewPanelComponent implements OnDestroy {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

  previewState = inject(PreviewState);
  protected inspectorState = inject(InspectorState);
  private orchestrator = inject(OrchestratorService);
  private lastBlobUrl: string | null = null;
  private messageListener = (e: MessageEvent): void => {
    if (e.source !== this.previewFrame?.nativeElement.contentWindow) return;
    if (e.data?.source === 'pugide-inspector') {
      this.inspectorState.selectElement({
        tagName: e.data.tagName,
        attrs: e.data.attrs ?? {},
        htmlLine: e.data.htmlLine,
        pugFile: e.data.pugFile,
        pugLine: e.data.pugLine,
        children: [],
      });
    }
  };

  constructor() {
    effect(() => {
      const html = this.previewState.compiledHtml();
      if (html && this.previewFrame) {
        this.updatePreview(html);
      }
    });

    effect(() => {
      const active = this.inspectorState.isActive();
      this.previewFrame?.nativeElement.contentWindow?.postMessage(
        { source: 'pugide-inspector-toggle', active },
        window.location.origin
      );
    });

    window.addEventListener('message', this.messageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.messageListener);
  }

  onIframeLoad(): void {
    this.previewFrame?.nativeElement.contentWindow?.postMessage(
      { source: 'pugide-inspector-toggle', active: this.inspectorState.isActive() },
      window.location.origin
    );
  }

  protected customOpen = signal(false);

  setDevice(name: string, width: number, height: number): void {
    this.previewState.setDevice(name, width, height);
    this.customOpen.set(false);
  }

  setCustomWidth(value: string): void {
    const width = Math.max(200, Number(value) || this.previewState.deviceWidth());
    this.previewState.setDevice('Custom', width, this.previewState.deviceHeight());
  }

  setCustomHeight(value: string): void {
    const height = Math.max(200, Number(value) || this.previewState.deviceHeight());
    this.previewState.setDevice('Custom', this.previewState.deviceWidth(), height);
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
