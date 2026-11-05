import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { PreviewState } from '../../core/state/preview.state';
import { PageBreakIssue } from '../../core/utils/paginate.util';
import { describePageIssue } from '../../core/utils/preview-layout.util';

/** Barra del modo PDF: tamaño de hoja, orientación, número de páginas y avisos a revisar (cortes y funciones sin soporte). */
@Component({
  selector: 'app-pdf-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pdf-bar">
      <span class="pdf-size" [title]="previewState.pageSize().source === 'css' ? 'Tamaño leído de @page { size }' : 'Sin @page en la plantilla: A4 por defecto'">
        {{ previewState.pageSize().label }} · {{ previewState.pageSize().width }}×{{ previewState.pageSize().height }}px
        @if (previewState.pageSize().source === 'default') { <em>(por defecto)</em> } @else if (previewState.pageSize().source === 'manual') { <em>(girado)</em> }
      </span>
      <div class="device-switcher">
        <button class="device-btn" [class.active]="isLandscape()" title="Horizontal" aria-label="Horizontal" (click)="setOrientation('landscape')">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">crop_landscape</span>
        </button>
        <button class="device-btn" [class.active]="!isLandscape()" title="Vertical" aria-label="Vertical" (click)="setOrientation('portrait')">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">crop_portrait</span>
        </button>
      </div>
      <span class="pdf-size">{{ pageCount() }} {{ pageCount() === 1 ? 'página' : 'páginas' }}</span>
      @if (issues().length) {
        <span class="pdf-size pdf-warn" [title]="issuesTitle()">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px; vertical-align: -3px;">warning</span>
          {{ issues().length }} {{ issues().length === 1 ? 'aviso' : 'avisos' }} a revisar
        </span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }

    .pdf-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding: 4px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-surface-container-low);
    }

    .pdf-size {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .pdf-warn { color: #e0a030; cursor: help; }

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
  `],
})
export class PdfBarComponent {
  protected previewState = inject(PreviewState);

  readonly pageCount = input.required<number>();
  /** Elementos que se partirían mal al imprimir. */
  readonly issues = input<PageBreakIssue[]>([]);

  protected issuesTitle = computed(() => this.issues().map(describePageIssue).join('\n'));

  protected isLandscape(): boolean {
    const { width, height } = this.previewState.pageSize();
    return width >= height;
  }

  protected setOrientation(o: 'landscape' | 'portrait'): void {
    this.previewState.pdfOrientation.set(o);
  }
}
