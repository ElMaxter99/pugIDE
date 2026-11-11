import { Component, ChangeDetectionStrategy, computed, inject, input, output, signal } from '@angular/core';
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
        <button type="button" class="device-btn" [class.active]="!isLandscape()" [attr.aria-pressed]="!isLandscape()" title="Vertical" aria-label="Vertical" (click)="setOrientation('portrait')">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">crop_portrait</span>
          <span>Vertical</span>
        </button>
        <button type="button" class="device-btn" [class.active]="isLandscape()" [attr.aria-pressed]="isLandscape()" title="Horizontal" aria-label="Horizontal" (click)="setOrientation('landscape')">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">crop_landscape</span>
          <span>Horizontal</span>
        </button>
      </div>
      <div class="page-nav" role="group" aria-label="Páginas del documento">
        <button type="button" class="nav-btn" title="Página anterior (Re Pág)" aria-label="Página anterior" data-testid="pdf-prev" [disabled]="page() <= 1" (click)="goToPage.emit(page() - 1)">
          <span aria-hidden="true" class="material-symbols-outlined">keyboard_arrow_left</span>
        </button>
        <label class="pdf-size page-label">Página
          <input class="page-input" type="text" inputmode="numeric" aria-label="Ir a la página" data-testid="pdf-page" [value]="page()"
            (keydown.enter)="jump($any($event.target))" (blur)="jump($any($event.target))" (focus)="$any($event.target).select()" />
          de <span data-testid="pdf-count">{{ pageCount() }}</span></label>
        <button type="button" class="nav-btn" title="Página siguiente (Av Pág)" aria-label="Página siguiente" data-testid="pdf-next" [disabled]="page() >= pageCount()" (click)="goToPage.emit(page() + 1)">
          <span aria-hidden="true" class="material-symbols-outlined">keyboard_arrow_right</span>
        </button>
        <button type="button" class="device-btn pages-btn" [class.active]="pagesOpen()" [attr.aria-expanded]="pagesOpen()" aria-controls="pdf-pages" data-testid="pdf-pages-btn" (click)="pagesOpen.set(!pagesOpen())">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 16px;">grid_view</span>
          <span>Páginas</span>
        </button>
      </div>
      @if (issues().length) {
        <span class="pdf-size pdf-warn" [title]="issuesTitle()">
          <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 14px; vertical-align: -3px;">warning</span>
          {{ issues().length }} {{ issues().length === 1 ? 'aviso' : 'avisos' }} a revisar
        </span>
      }
      <button type="button" class="print-btn" title="Imprimir / Guardar como PDF" aria-label="Imprimir / Guardar como PDF" (click)="printRequested.emit()">
        <span aria-hidden="true" class="material-symbols-outlined" style="font-size: 18px;">print</span>
        <span>Imprimir</span>
      </button>
    </div>
    @if (pagesOpen()) {
      <div class="pages" id="pdf-pages" data-testid="pdf-pages" role="group" aria-label="Ir a una página" (keydown.escape)="pagesOpen.set(false)">
        @for (n of pageNumbers(); track n) {
          <button type="button" class="page-tile" [class.current]="n === page()" [attr.aria-current]="n === page() ? 'page' : null"
            [attr.aria-label]="'Ir a la página ' + n + (warned().has(n) ? ' (con aviso de corte)' : '')" [attr.title]="warned().has(n) ? 'Página ' + n + ': tiene un aviso de corte' : 'Página ' + n"
            (click)="goToPage.emit(n)">
            <span class="sheet" [class.landscape]="isLandscape()">@if (warned().has(n)) { <span class="dot"></span> }</span>
            <span class="num">{{ n }}</span>
          </button>
        }
      </div>
    }
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

    .page-nav { display: inline-flex; align-items: center; gap: 6px; }
    .page-label { display: inline-flex; align-items: center; gap: 6px; }
    .page-input { width: 40px; height: 26px; text-align: center; font: inherit; color: var(--text-primary); background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; }
    .page-input:focus { border-color: var(--accent-color); outline: none; }
    .nav-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 1px solid var(--border-color); border-radius: var(--radius); color: var(--text-primary); }
    .nav-btn .material-symbols-outlined { font-size: 18px; }
    .nav-btn:hover:not(:disabled) { background: var(--bg-surface-variant); }
    .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pages-btn { border: 1px solid var(--border-color); }
    .pages { display: flex; flex-wrap: wrap; gap: 8px; max-height: 168px; overflow-y: auto; padding: 8px 16px; border-bottom: 1px solid var(--border-color); background: var(--bg-surface-container-low); }
    .page-tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; border: 1px solid var(--border-color); border-radius: 4px; }
    .page-tile:hover { background: var(--bg-hover); }
    .page-tile.current { border: 2px solid var(--accent-color); padding: 3px; }
    .sheet { position: relative; display: block; width: 34px; height: 48px; background: #f9f9f9; border-radius: 2px; }
    .sheet.landscape { width: 48px; height: 34px; }
    .dot { position: absolute; top: 3px; right: 3px; width: 8px; height: 8px; border-radius: 50%; background: #c77700; }
    .num { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
    .page-tile.current .num { color: var(--accent-color); }

    .device-switcher {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px;
      background: var(--bg-surface-container-low);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
    }

    .print-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      min-height: 28px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 13px;
    }

    .print-btn:hover { background: var(--bg-surface-variant); }

    .device-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-height: 28px;
      padding: 0 8px;
      font-size: 13px;
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
  /** Página que se ve ahora (1 = primera). */
  readonly page = input(1);
  /** Ir a una página; quien mueve el documento es el preview. */
  readonly goToPage = output<number>();
  protected readonly pagesOpen = signal(false);
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  /** Páginas con un aviso de corte. */
  protected readonly warned = computed(() => new Set(this.issues().filter((i) => i.page > 0).map((i) => i.page)));

  protected jump(input: HTMLInputElement): void {
    const n = Math.round(Number(input.value));
    if (Number.isFinite(n) && n >= 1) this.goToPage.emit(Math.min(n, this.pageCount()));
    input.value = String(this.page());
  }
  /** La persona pide imprimir; la orden la ejecuta el preview, que es quien habla con el documento aislado. */
  readonly printRequested = output<void>();
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
