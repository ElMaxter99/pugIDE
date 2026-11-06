import { Component, ChangeDetectionStrategy, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { PersistenceService } from '../../../core/services/persistence.service';
import { UiState } from '../../../core/state/ui.state';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { Box, TOUR_STEPS, TourPart, placePopover } from '../../../core/utils/tour.util';

/**
 * Recorrido de 4 pasos (mesa P-12): cada paso ilumina una zona con un halo de acento y dice qué hacer en dos frases.
 * Se puede saltar en cualquier momento (Esc) y, al terminar o saltar, no vuelve a salir solo.
 */
@Component({
  selector: 'app-tour',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.tourOpen()) {
      <div class="blocker" aria-hidden="true"></div>
      @if (halo(); as h) {
        <div class="halo" aria-hidden="true" data-testid="tour-halo" [style.left.px]="h.left" [style.top.px]="h.top" [style.width.px]="h.width" [style.height.px]="h.height"></div>
      }
      <div #pop class="pop" role="dialog" aria-modal="true" aria-labelledby="tour-title" tabindex="-1" data-testid="tour"
        [class.placed]="placed()" [style.left.px]="pos().left" [style.top.px]="pos().top" (keydown)="onKeydown($event)">
        <p class="count" data-testid="tour-count">{{ step() + 1 }} de {{ total }}</p>
        <div aria-live="polite" aria-atomic="true">
          <h2 id="tour-title">{{ current().title }}</h2>
          @if (current().body.length) {
            <p class="body">@for (p of current().body; track $index) { @if (isText(p)) {{{ p }}} @else if (isKbd(p)) {<kbd>{{ kbdText(p) }}</kbd>} @else {<code>{{ codeText(p) }}</code>} }</p>
          }
          @if (current().shortcuts; as list) {
            <ul class="keys">
              @for (s of list; track s.keys) { <li><kbd>{{ s.keys }}</kbd> <span>{{ s.label }}</span></li> }
            </ul>
          }
        </div>
        <div class="actions">
          <button type="button" class="skip" data-testid="tour-skip" (click)="finish()">Saltar el recorrido</button>
          <span class="spacer"></span>
          @if (step() > 0) { <button type="button" class="btn" data-testid="tour-prev" (click)="go(-1)">Anterior</button> }
          <button #next type="button" class="btn primary" data-testid="tour-next" (click)="step() === total - 1 ? finish() : go(1)">{{ step() === total - 1 ? 'Terminar' : 'Siguiente' }}</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .blocker { position: fixed; inset: 0; z-index: 2400; background: transparent; }
    .halo { position: fixed; z-index: 2401; pointer-events: none; border-radius: 8px; outline: 3px solid var(--accent-color); outline-offset: 0; box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.5); }
    .pop { position: fixed; z-index: 2402; width: min(360px, calc(100vw - 24px)); box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; padding: 16px 18px 14px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--accent-color); border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45); opacity: 0; }
    .pop.placed { opacity: 1; }
    .count { margin: 0; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-secondary); }
    h2 { margin: 0 0 4px; font-size: 16px; font-weight: 600; }
    .body { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-secondary); }
    kbd, code { font-family: var(--font-mono); font-size: 12px; padding: 0 5px; color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; }
    .keys { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); }
    .keys kbd { min-width: 96px; display: inline-block; text-align: center; margin-right: 6px; }
    .actions { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .spacer { flex: 1; }
    .skip { min-height: 32px; padding: 0 4px; font-size: 13px; color: var(--text-secondary); text-decoration: underline; }
    .skip:hover { color: var(--text-primary); }
    .btn { min-height: 32px; padding: 0 14px; font-size: 13px; color: var(--text-primary); background: var(--bg-surface-container-highest, var(--bg-hover)); border-radius: 6px; }
    .btn.primary { background: var(--accent-color); color: var(--text-on-primary); font-weight: 600; }
    .btn:hover { filter: brightness(1.12); }
    @media (prefers-reduced-motion: no-preference) {
      .halo { transition: left 0.15s ease, top 0.15s ease, width 0.15s ease, height 0.15s ease; }
    }
  `],
})
export class TourComponent {
  protected ui = inject(UiState);
  private persistence = inject(PersistenceService);

  protected readonly total = TOUR_STEPS.length;
  protected readonly step = signal(0);
  protected readonly current = computed(() => TOUR_STEPS[this.step()]);
  protected readonly halo = signal<Box | null>(null);
  protected readonly pos = signal({ left: 12, top: 12 });
  protected readonly placed = signal(false);

  private pop = viewChild<ElementRef<HTMLElement>>('pop');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      const open = this.ui.tourOpen();
      this.step();
      untracked(() => {
        if (!open) {
          if (this.restoreFocus) { this.restoreFocus(); this.restoreFocus = null; }
          return;
        }
        // El foco se recuerda un instante después de abrir: si se lanzó desde la paleta, ella aún está devolviendo
        // el foco a donde estaba, y eso es lo que hay que recuperar al terminar. Siempre antes de mover el foco al aviso.
        if (!this.restoreFocus) {
          setTimeout(() => { if (this.ui.tourOpen() && !this.restoreFocus) this.restoreFocus = rememberFocus(); });
        }
        this.placed.set(false);
        // Tras pintar el aviso (para medirlo) se coloca junto a la zona iluminada.
        requestAnimationFrame(() => requestAnimationFrame(() => this.layoutStep(true)));
      });
    });
  }

  /** Esc salta el recorrido esté donde esté el foco (también si aún no ha entrado en el aviso). */
  @HostListener('document:keydown.escape', ['$event'])
  protected onEscape(e: Event): void {
    if (!this.ui.tourOpen()) return;
    e.preventDefault();
    this.finish();
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (this.ui.tourOpen()) this.layoutStep(false);
  }

  private layoutStep(focus: boolean): void {
    const pop = this.pop()?.nativeElement;
    if (!pop || !this.ui.tourOpen()) return;
    const el = document.querySelector<HTMLElement>(this.current().target);
    const r = el?.getBoundingClientRect();
    // Una zona sin tamaño (panel oculto) o fuera de la ventana no se ilumina: el aviso se centra.
    const visible = !!r && r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight;
    const box: Box | null = visible ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
    this.halo.set(box ? { left: box.left - 3, top: box.top - 3, width: box.width + 6, height: box.height + 6 } : null);
    const p = placePopover(box, { width: pop.offsetWidth, height: pop.offsetHeight }, { width: window.innerWidth, height: window.innerHeight });
    this.pos.set({ left: p.left, top: p.top });
    this.placed.set(true);
    if (focus) pop.querySelector<HTMLElement>('[data-testid="tour-next"]')?.focus();
  }

  protected go(delta: number): void {
    this.step.update((s) => Math.max(0, Math.min(TOUR_STEPS.length - 1, s + delta)));
  }

  /** Terminar o saltar: se da por hecho y no vuelve a salir solo (siempre queda «Ver el recorrido» en la paleta). */
  protected finish(): void {
    this.persistence.saveTourDone();
    this.ui.tourOpen.set(false);
    this.step.set(0);
  }

  protected onKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight' && this.step() < this.total - 1) { e.preventDefault(); this.go(1); return; }
    if (e.key === 'ArrowLeft' && this.step() > 0) { e.preventDefault(); this.go(-1); return; }
    const pop = this.pop()?.nativeElement;
    if (pop) trapTab(e, pop);
  }

  protected isText(p: TourPart): p is string { return typeof p === 'string'; }
  protected isKbd(p: TourPart): boolean { return typeof p !== 'string' && 'kbd' in p; }
  protected kbdText(p: TourPart): string { return typeof p !== 'string' && 'kbd' in p ? p.kbd : ''; }
  protected codeText(p: TourPart): string { return typeof p !== 'string' && 'code' in p ? p.code : ''; }
}
