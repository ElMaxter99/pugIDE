import { Component, ChangeDetectionStrategy, ElementRef, effect, input, output, untracked, viewChild } from '@angular/core';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { SHORTCUT_GROUPS } from '../../../core/utils/shortcuts.util';

/** Lista de atajos de teclado de PugIDE (se abre desde la paleta de comandos). */
@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="overlay" (click)="closed.emit()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Atajos de teclado" tabindex="-1"
          (click)="$event.stopPropagation()" (keydown.escape)="closed.emit()" (keydown)="onKeydown($event)">
          <div class="header">
            <h3>Atajos de teclado</h3>
            <button class="icon" title="Cerrar" aria-label="Cerrar" (click)="closed.emit()">&times;</button>
          </div>
          <p class="hint">En macOS, Ctrl equivale a Cmd.</p>
          <div class="body">
            @for (g of groups; track g.title) {
              <h4>{{ g.title }}</h4>
              <dl>
                @for (s of g.items; track s.keys) {
                  <div class="row"><dt>{{ s.label }}</dt><dd><kbd>{{ s.keys }}</kbd></dd></div>
                }
              </dl>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 64px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 4px; }
    h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    h4 { margin: 14px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); }
    .icon { font-size: 20px; line-height: 1; color: var(--text-secondary); padding: 0 6px; }
    .hint { margin: 0; padding: 0 20px 4px; font-size: 12px; color: var(--text-secondary); }
    .body { overflow-y: auto; padding: 0 20px 16px; }
    dl { margin: 0; }
    .row { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 13px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); }
    dt, dd { margin: 0; }
    kbd { font-family: var(--font-mono); font-size: 12px; padding: 1px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-primary); color: var(--text-primary); white-space: nowrap; }
  `],
})
export class ShortcutsDialogComponent {
  readonly isOpen = input(false);
  readonly closed = output<void>();
  protected groups = SHORTCUT_GROUPS;

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        untracked(() => {
          this.restoreFocus = rememberFocus();
          setTimeout(() => this.dialog()?.nativeElement.focus());
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected onKeydown(e: KeyboardEvent): void {
    const dlg = this.dialog()?.nativeElement;
    if (dlg) trapTab(e, dlg);
  }
}
