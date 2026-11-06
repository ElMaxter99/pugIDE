import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { stepSize } from '../../../core/utils/layout.util';

/**
 * Tirador entre dos paneles (P-08). `value` es el ancho en px del panel que controla; `grow` dice hacia dónde crece:
 * +1 si arrastrar a la derecha lo agranda (panel a la izquierda del tirador), -1 si lo estrecha (panel a la derecha).
 * Cuatro estados: reposo (línea de 1 px, zona de agarre de 12 px), puntero (4 px de acento), teclado (anillo de foco) y arrastre (ancho en px).
 * Con el teclado: ← → mueven 16 px (Mayús, 64), Inicio y Fin van a los extremos; el doble clic lo restablece.
 */
@Component({
  selector: 'app-panel-resizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.edge-left]': "edge() === 'left'", '[class.edge-right]': "edge() === 'right'" },
  template: `
    <div
      class="grip"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      [class.dragging]="dragging()"
      [attr.aria-label]="label()"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuemin]="min()"
      [attr.aria-valuemax]="max()"
      [attr.aria-valuetext]="value() + ' px'"
      [attr.data-testid]="testId()"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp($event)"
      (pointercancel)="onPointerUp($event)"
      (dblclick)="restore.emit()"
      (keydown)="onKey($event)">
      <span class="line" aria-hidden="true"></span>
      @if (dragging()) {
        <span class="readout" aria-hidden="true">{{ shown() }} px</span>
      }
    </div>
  `,
  styles: [`
    /* Ocupa 0 px de ancho: no mueve el reparto de los paneles; la zona de agarre se superpone a la frontera. */
    /* Vive dentro del panel que controla (así queda en su área con nombre) y se pega a su borde. */
    :host { position: absolute; top: 0; bottom: 0; width: 12px; z-index: 20; }
    :host(.edge-left) { left: 0; }
    :host(.edge-right) { right: 0; }
    .grip { position: absolute; top: 0; bottom: 0; left: 0; right: 0; width: auto; cursor: col-resize; touch-action: none; display: flex; justify-content: center; outline: none; }
    .line { width: 1px; height: 100%; background: transparent; transition: width 0.1s, background 0.1s; }
    .grip:hover .line, .grip.dragging .line { width: 4px; background: var(--accent-color); }
    .grip:focus-visible { outline: 2px solid var(--accent-color); outline-offset: -2px; }
    .grip:focus-visible .line { width: 2px; background: var(--accent-color); }
    :host(.edge-right) .grip { justify-content: flex-end; }
    :host(.edge-left) .grip { justify-content: flex-start; }
    /* El ancho en px se pinta hacia dentro del panel, para que no lo recorte el borde de la ventana ni el panel vecino. */
    :host(.edge-right) .readout { right: 16px; }
    :host(.edge-left) .readout { left: 16px; }
    .readout { position: absolute; top: 12px; padding: 2px 8px; border-radius: 4px; background: var(--accent-color); color: var(--bg-primary); font-family: var(--font-mono); font-size: 11px; font-weight: 600; white-space: nowrap; pointer-events: none; }
  `],
})
export class PanelResizerComponent {
  readonly value = input.required<number>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly label = input.required<string>();
  readonly grow = input<1 | -1>(1);
  /** Borde del panel contenedor al que se pega. */
  readonly edge = input<'left' | 'right'>('right');
  readonly testId = input<string | null>(null);
  /** Ancho propuesto (px) mientras se arrastra o se usa el teclado. */
  readonly sizeChange = output<number>();
  /** Fin de un arrastre o pulsación de teclado: es el momento de guardar. */
  readonly committed = output<void>();
  readonly restore = output<void>();

  protected readonly dragging = signal(false);
  private readonly live = signal<number | null>(null);
  protected readonly shown = computed(() => this.live() ?? this.value());
  private startX = 0;
  private startValue = 0;

  protected onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.startX = e.clientX;
    this.startValue = this.value();
    this.live.set(this.startValue);
    this.dragging.set(true);
  }

  protected onPointerMove(e: PointerEvent): void {
    if (!this.dragging()) return;
    const next = Math.round(Math.min(Math.max(this.startValue + this.grow() * (e.clientX - this.startX), this.min()), this.max()));
    this.live.set(next);
    this.sizeChange.emit(next);
  }

  protected onPointerUp(e: PointerEvent): void {
    if (!this.dragging()) return;
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    this.dragging.set(false);
    this.live.set(null);
    this.committed.emit();
  }

  protected onKey(e: KeyboardEvent): void {
    const next = stepSize(this.value(), e.key, e.shiftKey, this.grow(), this.min(), this.max());
    if (next === null) return;
    e.preventDefault();
    if (next !== this.value()) this.sizeChange.emit(next);
    this.committed.emit();
  }
}
