import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { PreviewState } from '../../core/state/preview.state';
import { OrchestratorService } from '../../core/services/orchestrator.service';

@Component({
  selector: 'app-preview-panel',
  standalone: true,
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
              [class.active]="previewState.deviceName() === 'Desktop'"
              (click)="setDevice('Desktop', 1200, 800)">
              <span class="material-symbols-outlined" style="font-size: 16px;">desktop_windows</span>
            </button>
            <button
              class="device-btn"
              [class.active]="previewState.deviceName() === 'Mobile'"
              (click)="setDevice('Mobile', 375, 812)">
              <span class="material-symbols-outlined" style="font-size: 16px;">smartphone</span>
            </button>
          </div>
        </div>
        <div class="preview-header-right">
          <button class="preview-action" title="Refresh" (click)="onReload()">
            <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
          </button>
          <button class="preview-action" title="Open in New Tab" (click)="onOpenNewTab()">
            <span class="material-symbols-outlined" style="font-size: 18px;">open_in_new</span>
          </button>
        </div>
      </div>
      <div class="preview-viewport">
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
          [style.height.px]="previewState.deviceHeight()">
        </iframe>
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

    .preview-viewport {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      position: relative;
      background: var(--bg-surface-dim);
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
export class PreviewPanelComponent {
  @ViewChild('previewFrame') previewFrame!: ElementRef<HTMLIFrameElement>;

  previewState = inject(PreviewState);
  private orchestrator = inject(OrchestratorService);
  private lastBlobUrl: string | null = null;

  constructor() {
    effect(() => {
      const html = this.previewState.compiledHtml();
      if (html && this.previewFrame) {
        this.updatePreview(html);
      }
    });
  }

  setDevice(name: string, width: number, height: number): void {
    this.previewState.setDevice(name, width, height);
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
