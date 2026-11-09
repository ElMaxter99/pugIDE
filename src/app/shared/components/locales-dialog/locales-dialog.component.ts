import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DataState } from '../../../core/state/data.state';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';

/**
 * «Idiomas del proyecto» (P-22): el idioma con el que se abre el proyecto y el idioma de reserva. Si una clave falta o está
 * vacía en el idioma activo, el preview usa el texto del idioma de reserva antes de enseñar la clave. Todo se guarda en
 * el proyecto (`.pugide/datasets.json`), nada sale del navegador.
 */
@Component({
  selector: 'app-locales-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.localesOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Idiomas del proyecto" tabindex="-1" data-testid="locales-dialog"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Idiomas del proyecto</h2></div>
          <div class="body">
            @if (locales().length === 0) {
              <p class="note">Aún no hay idiomas. Crea uno con «Añadir idioma…» (Ctrl+K) y vuelve aquí.</p>
            } @else {
              <label class="label" for="loc-default">Idioma por defecto</label>
              <select id="loc-default" class="input" data-testid="locales-default" [value]="defaultCode()" (change)="defaultCode.set($any($event.target).value)">
                <option value="">Sin elegir (el primero)</option>
                @for (c of locales(); track c) { <option [value]="c" [selected]="c === defaultCode()">{{ c }}</option> }
              </select>
              <p class="hint">Con el que se abre el proyecto cuando no se ha elegido otro en la vista previa.</p>
              <label class="label" for="loc-fallback">Idioma de reserva</label>
              <select id="loc-fallback" class="input" data-testid="locales-fallback" [value]="fallbackCode()" (change)="fallbackCode.set($any($event.target).value)">
                <option value="">Sin idioma de reserva</option>
                @for (c of locales(); track c) { <option [value]="c" [selected]="c === fallbackCode()">{{ c }}</option> }
              </select>
              <p class="hint">Si una clave falta o está vacía en el idioma activo, se usa su texto en el de reserva antes de enseñar la clave. El Registro avisa de cuáles.</p>
              @if (sameProblem()) { <p class="problem" role="alert">El idioma de reserva debe ser distinto del idioma por defecto.</p> }
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
            <button type="button" class="btn primary" data-testid="locales-save" [disabled]="locales().length === 0 || sameProblem()" (click)="save()">Guardar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 480px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; }
    .label { font-size: 12px; color: var(--text-secondary); margin-top: 8px; }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .hint { margin: 0; font-size: 12px; line-height: 1.5; }
    .note { margin: 4px 0 0; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); font-size: 12px; line-height: 1.5; }
    .problem { margin: 2px 0 0; font-size: 12px; color: var(--error-color, #ff8a80); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.secondary:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class LocalesDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly dataState = inject(DataState);

  protected readonly locales = this.orchestrator.locales;
  protected readonly defaultCode = signal('');
  protected readonly fallbackCode = signal('');
  protected readonly sameProblem = computed(() => !!this.fallbackCode() && this.fallbackCode() === this.defaultCode());

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.localesOpen()) {
        untracked(() => {
          this.defaultCode.set(this.dataState.defaultLocale() ?? '');
          this.fallbackCode.set(this.dataState.fallbackLocale() ?? '');
          this.restoreFocus = rememberFocus();
          setTimeout(() => {
            const el = this.dlg()?.nativeElement;
            (el ? focusableElements(el)[0] ?? el : null)?.focus();
          });
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void {
    this.ui.localesOpen.set(false);
  }

  protected save(): void {
    if (this.sameProblem()) return;
    this.orchestrator.setLocaleSettings({ defaultLocale: this.defaultCode() || null, fallbackLocale: this.fallbackCode() || null });
    this.close();
  }
}
