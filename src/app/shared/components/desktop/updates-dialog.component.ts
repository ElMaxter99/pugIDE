import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { DesktopUpdateService } from '../../../core/services/desktop-update.service';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';

/**
 * Escritorio (P-27): la pregunta de una sola vez «¿Avisarte de las versiones nuevas?» y el diálogo «Buscar actualizaciones».
 * La consulta va a github.com y solo lleva el número de versión que se pide; nada de los proyectos.
 */
@Component({
  selector: 'app-updates-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (asking()) {
      <div class="overlay">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="¿Avisarte de las versiones nuevas?" tabindex="-1" data-testid="update-ask" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">¿Avisarte de las versiones nuevas?</h2></div>
          <div class="body">
            <p>PugIDE funciona sin conexión y no hace ninguna llamada de red por su cuenta. Si lo permites, una vez al día (y al abrir la app) consultará en <strong>github.com</strong> el número de la última versión. No se envía nada de tus proyectos.</p>
            <p class="small">No descarga ni instala nada por su cuenta: te avisa y tú decides si actualizar. Se cambia cuando quieras en Ayuda → Buscar actualizaciones.</p>
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" data-testid="update-ask-no" (click)="updates.answer(false)">No, gracias</button>
            <button type="button" class="btn primary" data-testid="update-ask-yes" (click)="updates.answer(true)">Sí, avisarme</button>
          </div>
        </div>
      </div>
    } @else if (ui.updatesOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Buscar actualizaciones" tabindex="-1" data-testid="updates-dialog"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Buscar actualizaciones</h2></div>
          <div class="body">
            @if (updates.state(); as s) {
              <div class="line" data-testid="updates-status">
                @if (updates.lastManual() === 'offline') {
                  <span aria-hidden="true" class="material-symbols-outlined warn">cloud_off</span>
                  <div><div class="strong">No se pudo consultar (¿sin conexión?)</div><div class="small">PugIDE sigue funcionando igual. Las versiones están en github.com/ElMaxter99/pugIDE/releases.</div></div>
                } @else if (s.latest) {
                  <span aria-hidden="true" class="material-symbols-outlined">update</span>
                  <div><div class="strong">Hay una versión nueva: {{ s.latest.version }}</div><div class="small">Tienes la {{ s.current }}{{ when() ? ' · comprobado: ' + when() : '' }}.</div>
                    <button type="button" class="btn link" data-testid="updates-notes" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Ver novedades en GitHub</button></div>
                } @else if (s.lastCheck) {
                  <span aria-hidden="true" class="material-symbols-outlined ok">check_circle</span>
                  <div><div class="strong">Tienes la última versión ({{ s.current }})</div><div class="small">Comprobado: {{ when() }}.</div></div>
                } @else {
                  <span aria-hidden="true" class="material-symbols-outlined">info</span>
                  <div><div class="strong">Tienes la versión {{ s.current }}</div><div class="small">Aún no se ha buscado ninguna versión nueva.</div></div>
                }
              </div>
              <label class="check"><input type="checkbox" data-testid="updates-enabled" [checked]="s.enabled" (change)="updates.answer($any($event.target).checked)" /> Avisarme de las versiones nuevas (una consulta al día a github.com)</label>
            }
          </div>
          <div class="footer">
            <button type="button" class="btn secondary" data-testid="updates-check" [disabled]="updates.checking()" (click)="updates.check()">{{ updates.checking() ? 'Buscando…' : 'Buscar ahora' }}</button>
            @if (updates.state()?.latest) {
              <button type="button" class="btn secondary" (click)="close()">Cerrar</button>
              @if (updates.canUpdate()) {
                <button type="button" class="btn primary" data-testid="updates-update" (click)="updateNow()">Actualizar</button>
              } @else {
                <button type="button" class="btn primary" data-testid="updates-download" (click)="updates.openRelease()">Descargar</button>
              }
            } @else {
              <button type="button" class="btn primary" (click)="close()">Cerrar</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2200; }
    .dialog { width: 480px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 10px; line-height: 1.5; }
    .body p { margin: 0; }
    .small { font-size: 12px; }
    .strong { color: var(--text-primary); font-weight: 600; }
    .line { display: flex; gap: 10px; align-items: flex-start; }
    .line .material-symbols-outlined { font-size: 20px; color: var(--accent-color); }
    .line .ok { color: var(--success-color); }
    .line .warn { color: var(--warning-color); }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; flex-wrap: wrap; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--text-on-primary); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.link { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 2px 0; background: none; border: 0; color: var(--accent-color); }
    .btn.link:hover { text-decoration: underline; }
    .line .btn.link .material-symbols-outlined { font-size: 16px; }
  `],
})
export class UpdatesDialogComponent {
  protected readonly ui = inject(UiState);
  protected readonly updates = inject(DesktopUpdateService);
  /** La pregunta espera a que no haya otro diálogo de arranque encima (bienvenida, espacios). */
  protected readonly asking = computed(() => this.updates.mustAsk() && !this.ui.welcomeOpen() && !this.ui.workspacesOpen() && !this.ui.tourOpen());
  protected readonly when = computed(() => {
    const t = this.updates.state()?.lastCheck ?? 0;
    return t ? new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  });

  /** Empieza la descarga y cierra: el progreso sigue en la barra (P-35, caso 2). */
  protected updateNow(): void {
    void this.updates.update();
    this.close();
  }

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      const open = this.asking() || this.ui.updatesOpen();
      if (open) {
        untracked(() => {
          if (!this.restoreFocus) this.restoreFocus = rememberFocus();
          setTimeout(() => { const el = this.dlg()?.nativeElement; const f = el ? focusableElements(el) : []; (f[f.length - 1] ?? el)?.focus(); });
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

  protected close(): void { this.ui.updatesOpen.set(false); }
}
