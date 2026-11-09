import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal, viewChild } from '@angular/core';

/** Una fila de un menú desplegable. Sin `id` es un separador o, con `heading`, un título de grupo. */
export interface MenuItem {
  id?: string;
  label?: string;
  /** Nombre de un icono de Material Symbols (autoalojado; ver `npm run fonts:icons`). */
  icon?: string;
  /** Atajo de teclado que se enseña a la derecha. */
  keys?: string;
  /** Texto de apoyo bajo la etiqueta. */
  hint?: string;
  disabled?: boolean;
  /** Estado de un ajuste: pinta una marca y expone `menuitemcheckbox` o, con `radio`, `menuitemradio`. */
  checked?: boolean;
  radio?: boolean;
  /** Elegir esta fila no cierra el menú (por ejemplo, «Otros dispositivos…» que despliega más filas). */
  keepOpen?: boolean;
  /** Título de grupo (no se puede elegir). */
  heading?: string;
  separator?: boolean;
}

/**
 * Menú desplegable accesible: botón con `aria-haspopup="menu"` y lista `role="menu"`.
 * Se abre con clic, Intro, Espacio o ↓; ↑/↓/Inicio/Fin se mueven; Esc cierra y devuelve el foco al botón;
 * Tab y los clics fuera lo cierran. No se pierde ninguna acción: `chosen` emite el `id` de la fila.
 */
@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      type="button"
      class="menu-trigger"
      [class.icon-only]="iconOnly()"
      [class.primary]="tone() === 'primary'" [class.bar]="tone() === 'barra'"
      [attr.data-testid]="testId()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="ariaLabel() || label()"
      [attr.title]="iconOnly() ? (ariaLabel() || label()) : null"
      (click)="onTriggerClick($event)"
      (keydown)="onTriggerKey($event)">
      @if (icon()) { <span aria-hidden="true" class="material-symbols-outlined menu-icon">{{ icon() }}</span> }
      @if (!iconOnly()) { <span class="menu-label">{{ label() }}</span> }
      @if (caret() && !iconOnly()) { <span aria-hidden="true" class="material-symbols-outlined menu-caret">keyboard_arrow_down</span> }
    </button>
    @if (open()) {
      <div class="menu-backdrop" (click)="close(false)"></div>
      <div #list class="menu" role="menu" [attr.aria-label]="ariaLabel() || label()" [class.align-right]="align() === 'right'" [class.above]="placement() === 'arriba'"
        [style.left.px]="pos()?.left" [style.top.px]="pos()?.top" [style.max-height.px]="pos()?.maxHeight" [style.visibility]="pos() ? null : 'hidden'" (keydown)="onMenuKey($event)">
        @for (item of items(); track $index) {
          @if (item.separator) {
            <div class="menu-separator" role="separator"></div>
          } @else if (item.heading) {
            <div class="menu-heading" role="presentation">{{ item.heading }}</div>
          } @else {
            <button
              type="button"
              class="menu-item"
              [attr.role]="item.checked === undefined ? 'menuitem' : (item.radio ? 'menuitemradio' : 'menuitemcheckbox')"
              [attr.aria-checked]="item.checked === undefined ? null : item.checked"
              [attr.data-menu-id]="item.id"
              [disabled]="item.disabled"
              tabindex="-1"
              (click)="choose(item)">
              @if (item.icon) { <span aria-hidden="true" class="material-symbols-outlined item-icon">{{ item.icon }}</span> }
              @else if (item.checked !== undefined) { <span aria-hidden="true" class="material-symbols-outlined item-icon">{{ item.checked ? 'check' : '' }}</span> }
              <span class="item-text">
                <span class="item-label">{{ item.label }}</span>
                @if (item.hint) { <span class="item-hint">{{ item.hint }}</span> }
              </span>
              @if (item.keys) { <kbd class="item-keys">{{ item.keys }}</kbd> }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-flex; }
    .menu-trigger { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 6px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .menu-trigger:hover { background: var(--bg-hover); }
    .menu-trigger[aria-expanded='true'] { background: var(--bg-active); }
    .menu-trigger.icon-only { width: 32px; justify-content: center; padding: 0; }
    .menu-trigger.primary { background: var(--accent-color); border-color: var(--accent-color); color: var(--on-accent, var(--bg-primary)); font-weight: 600; }
    /* Botón plano de la barra de estado: sin borde, a la altura de la barra y con su tipografía. */
    .menu-trigger.bar { border: 0; border-radius: 0; height: 32px; min-height: 32px; padding: 0 8px; font-size: inherit; letter-spacing: inherit; font-family: inherit; }
    .menu-trigger.bar .menu-icon, .menu-trigger.bar .menu-caret { font-size: 14px; width: auto; margin: 0; }
    .menu-icon, .item-icon { font-size: 18px; width: 18px; }
    .menu-caret { font-size: 18px; margin-left: -2px; }
    .menu-backdrop { position: fixed; inset: 0; z-index: 1190; }
    .menu { position: fixed; top: 0; left: 0; overflow-y: auto; z-index: 1200; min-width: 240px; max-width: min(360px, calc(100vw - 16px)); padding: 4px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35); }
    .menu-item { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 32px; padding: 6px 10px; border: 0; border-radius: 6px; background: none; color: var(--text-primary); font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .menu-item:hover:not(:disabled), .menu-item:focus-visible { background: var(--bg-hover); outline: 2px solid var(--accent-color); outline-offset: -2px; }
    .menu-item:disabled { opacity: 0.5; cursor: default; }
    .item-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .item-hint { font-size: 11px; color: var(--text-secondary); }
    .item-keys { margin-left: auto; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
    .menu-heading { padding: 8px 10px 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-secondary); }
    .menu-separator { height: 1px; margin: 4px 6px; background: var(--border-color); }
  `],
})
export class DropdownMenuComponent {
  readonly label = input.required<string>();
  readonly items = input.required<MenuItem[]>();
  readonly icon = input<string>('');
  /** Nombre accesible cuando difiere del texto (o cuando solo se ve el icono). */
  readonly ariaLabel = input<string>('');
  readonly iconOnly = input(false);
  readonly caret = input(true);
  readonly align = input<'left' | 'right'>('left');
  /** Hacia dónde se abre: «arriba» para los botones del borde inferior (barra de estado). */
  readonly placement = input<'abajo' | 'arriba'>('abajo');
  readonly tone = input<'neutral' | 'primary' | 'barra'>('neutral');
  readonly testId = input<string | null>(null);
  readonly chosen = output<string>();

  protected readonly open = signal(false);
  /** Dónde se pinta el menú (coordenadas de la ventana): se calcula al abrirlo para que nunca se salga de ella. */
  protected readonly pos = signal<{ left: number; top: number; maxHeight: number } | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  protected readonly enabledCount = computed(() => this.items().filter((i) => i.id && !i.disabled).length);

  /** `detail === 0` es una activación por teclado (Intro o Espacio): el foco pasa a la primera fila. */
  protected onTriggerClick(e: MouseEvent): void {
    if (this.open()) this.close(true);
    else this.openMenu(e.detail === 0);
  }

  private openMenu(focusFirst: boolean): void {
    this.pos.set(null);
    this.open.set(true);
    // Tras pintar la lista: se coloca dentro de la ventana y el foco va a la primera fila solo si se abrió con teclado.
    setTimeout(() => { this.reposition(); if (focusFirst) this.focusItem(0); });
  }

  /**
   * Coloca el menú junto a su botón pero dentro de la ventana: el borde derecho o izquierdo se ajusta (un botón al borde
   * del panel lateral no lo deja cortado), se abre hacia donde hay sitio y, si no cabe entero, se acota y hace scroll.
   * Va con `position: fixed`, así que tampoco lo recorta el `overflow: hidden` de los paneles.
   */
  private reposition(): void {
    const trigger = this.trigger()?.nativeElement;
    const menu = this.list()?.nativeElement;
    if (!trigger || !menu) return;
    const MARGIN = 8;
    const r = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const natural = menu.offsetHeight;
    let left = this.align() === 'right' ? r.right - width : r.left;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));
    const below = window.innerHeight - r.bottom - 4 - MARGIN;
    const above = r.top - 4 - MARGIN;
    const up = this.placement() === 'arriba' ? !(above < Math.min(natural, 160) && below > above) : natural > below && above > below;
    const room = Math.max(80, up ? above : below);
    const height = Math.min(natural, room);
    this.pos.set({ left, top: up ? r.top - 4 - height : r.bottom + 4, maxHeight: room });
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (this.open()) { this.pos.set(null); setTimeout(() => this.reposition()); }
  }

  close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) this.trigger()?.nativeElement.focus();
  }

  protected choose(item: MenuItem): void {
    if (!item.id || item.disabled) return;
    if (!item.keepOpen) this.close(true);
    this.chosen.emit(item.id);
  }

  private buttons(): HTMLButtonElement[] {
    return [...(this.list()?.nativeElement.querySelectorAll<HTMLButtonElement>('button.menu-item:not(:disabled)') ?? [])];
  }

  private focusItem(index: number): void {
    const b = this.buttons();
    if (b.length) b[(index + b.length) % b.length].focus();
  }

  protected onTriggerKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!this.open()) this.openMenu(true); else this.focusItem(e.key === 'ArrowDown' ? 0 : -1); }
    else if (e.key === 'Escape' && this.open()) { e.preventDefault(); this.close(true); }
  }

  protected onMenuKey(e: KeyboardEvent): void {
    const b = this.buttons();
    const at = b.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); this.focusItem(at + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.focusItem(at <= 0 ? -1 : at - 1); }
    else if (e.key === 'Home') { e.preventDefault(); this.focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); this.focusItem(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(true); }
    else if (e.key === 'Tab') this.close(false);
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    if (this.open() && !this.host.nativeElement.contains(document.activeElement)) this.close(false);
  }
}
