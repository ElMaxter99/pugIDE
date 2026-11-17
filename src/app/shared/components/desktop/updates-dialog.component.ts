import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { DesktopUpdateService } from '../../../core/services/desktop-update.service';
import { APP_VERSION } from '../../../core/models/version.token';
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
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-label="Versión y actualizaciones" tabindex="-1" data-testid="updates-dialog"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">Versión y actualizaciones</h2></div>
          <div class="body">
            <div class="line" data-testid="updates-version">
              <span aria-hidden="true" class="material-symbols-outlined">info</span>
              <div>
                <div class="strong">PugIDE {{ version }} @if (isTest()) { <span class="badge" data-testid="updates-badge">pruebas</span> }</div>
                <div class="small" data-testid="updates-install">{{ installLine() }}</div>
              </div>
            </div>
            @if (updates.state(); as s) {
              @if (s.channel) {
                <fieldset class="channels" data-testid="updates-channels">
                  <legend class="strong">Qué versiones quieres recibir</legend>
                  <label class="radio"><input type="radio" name="channel" value="stable" data-testid="channel-stable" [checked]="s.channel === 'stable'" (change)="updates.setChannel('stable')" />
                    <span><span class="strong">Estable (recomendado)</span><span class="small block">Solo versiones publicadas y probadas.</span></span></label>
                  <label class="radio"><input type="radio" name="channel" value="rc" data-testid="channel-rc" [checked]="s.channel === 'rc'" (change)="updates.setChannel('rc')" />
                    <span><span class="strong">Pruebas</span><span class="small block">Versiones candidatas (<code>-rc.N</code>) antes de que sean estables. Pueden tener fallos.</span></span></label>
                  @if (s.channel === 'rc') {
                    <p class="note warn-note" data-testid="channel-rc-note">Con «Pruebas» recibes también las estables. Si vuelves a «Estable» no se baja de versión: la app espera a la siguiente estable.</p>
                  } @else if (s.prerelease) {
                    <p class="note" data-testid="channel-back-note">Tienes una versión de pruebas. Con «Estable» seguirás en ella hasta que salga la siguiente estable; no se baja de versión.</p>
                  }
                </fieldset>
              }
              <div class="line" data-testid="updates-status">
                @if (updates.lastManual() === 'offline') {
                  <span aria-hidden="true" class="material-symbols-outlined warn">cloud_off</span>
                  <div><div class="strong">No se pudo consultar (¿sin conexión?)</div><div class="small">PugIDE sigue funcionando igual. Las versiones están en github.com/ElMaxter99/pugIDE/releases.</div></div>
                } @else if (s.latest) {
                  <span aria-hidden="true" class="material-symbols-outlined">update</span>
                  <div><div class="strong">Hay una versión nueva: {{ s.latest.version }}@if (s.latest.prerelease) { <span class="badge">pruebas</span> }</div><div class="small">Tienes la {{ s.current }}{{ when() ? ' · comprobado: ' + when() : '' }}.</div>
                    <button type="button" class="btn link" data-testid="updates-notes" (click)="updates.openRelease()"><span aria-hidden="true" class="material-symbols-outlined">open_in_new</span>Ver novedades en GitHub</button></div>
                } @else if (s.lastCheck) {
                  <span aria-hidden="true" class="material-symbols-outlined ok">check_circle</span>
                  <div><div class="strong">{{ s.channel === 'rc' ? 'No hay versiones de pruebas más nuevas' : 'Tienes la última versión (' + s.current + ')' }}</div><div class="small">Comprobado: {{ when() }}.</div></div>
                } @else {
                  <span aria-hidden="true" class="material-symbols-outlined">info</span>
                  <div><div class="strong">Tienes la versión {{ s.current }}</div><div class="small">Aún no se ha buscado ninguna versión nueva.</div></div>
                }
              </div>
              @if (explain(); as e) {
                <p class="note" data-testid="updates-explain">{{ e }}</p>
              }
              @if (self()?.error === 'password') {
                <p class="note warn-note" data-testid="updates-password">Se cerró el cuadro de la contraseña y no se instaló nada. La descarga sigue guardada: pulsa «Reiniciar y actualizar» en la barra para volver a intentarlo.</p>
              } @else if (self()?.error === 'missing') {
                <p class="note warn-note" data-testid="updates-missing">El instalador de esta versión aún se está preparando. Vuelve a probar en unos minutos.</p>
              }
              <label class="check"><input type="checkbox" data-testid="updates-enabled" [checked]="s.enabled" (change)="updates.answer($any($event.target).checked)" /> Avisarme de las versiones nuevas (una consulta al día a github.com)</label>
            } @else {
              <p class="note" data-testid="updates-web">Esta es la versión web: se actualiza sola al abrir la página. Las novedades de cada versión están en
                <a href="https://github.com/ElMaxter99/pugIDE/releases" target="_blank" rel="noopener noreferrer">github.com/ElMaxter99/pugIDE/releases</a>.</p>
            }
          </div>
          <div class="footer">
            @if (updates.state()) {
              <button type="button" class="btn secondary" data-testid="updates-check" [disabled]="updates.checking()" (click)="updates.check()">{{ updates.checking() ? 'Buscando…' : 'Buscar actualizaciones' }}</button>
            }
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
    .badge { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 600; background: var(--accent-color); color: var(--text-on-primary); }
    .channels { border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px 10px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .channels legend { padding: 0 4px; }
    .radio { display: flex; gap: 8px; align-items: flex-start; color: var(--text-primary); }
    .radio input { accent-color: var(--accent-color); margin-top: 3px; }
    .block { display: block; }
    .note { padding: 8px 10px; border-radius: 6px; background: var(--bg-input); font-size: 12px; }
    .warn-note { border-left: 3px solid var(--warning-color); }
    code { font-family: var(--font-mono, monospace); font-size: 11px; }
    a { color: var(--accent-color); }
  `],
})
export class UpdatesDialogComponent {
  protected readonly version = inject(APP_VERSION);
  protected readonly ui = inject(UiState);
  protected readonly updates = inject(DesktopUpdateService);
  /** La pregunta espera a que no haya otro diálogo de arranque encima (bienvenida, espacios). */
  protected readonly asking = computed(() => this.updates.mustAsk() && !this.ui.welcomeOpen() && !this.ui.workspacesOpen() && !this.ui.tourOpen());
  protected readonly when = computed(() => {
    const t = this.updates.state()?.lastCheck ?? 0;
    return t ? new Date(t).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  });

  protected readonly self = this.updates.self;
  protected readonly isTest = computed(() => !!this.updates.state()?.prerelease || /-/.test(this.version));
  /** Cómo está instalada esta copia (P-48), en una línea. */
  protected readonly installLine = computed(() => {
    const s = this.updates.state();
    if (!s) return 'Versión web';
    switch (s.install) {
      case 'installer': return 'Instalada con el instalador de Windows';
      case 'portable': return 'Versión portable de Windows';
      case 'appimage': return 'Instalada como AppImage de Linux';
      case 'deb': return 'Instalada con el paquete .deb';
      case 'rpm': return 'Instalada con el paquete .rpm';
      case 'mac': return 'Instalada en macOS';
      case 'dev': return 'Ejecutada desde el código (sin instalación)';
      default: return 'Instalación de escritorio';
    }
  });
  /** Qué pasará al actualizar en esta instalación (P-48): contraseña, descarga manual… */
  protected readonly explain = computed(() => {
    switch (this.updates.state()?.install) {
      case 'installer': return 'Se instala solo para tu usuario: no pide contraseña de administrador.';
      case 'portable': return 'Al actualizar se descarga el nuevo .exe desde GitHub; sustitúyelo tú donde tengas el actual.';
      case 'appimage': return 'La app sustituye su propio archivo AppImage. No pide contraseña.';
      case 'deb':
      case 'rpm': return 'Al instalar, el sistema te pedirá la contraseña de administrador. Si la cancelas, la descarga queda guardada.';
      case 'mac': return 'En macOS no se actualiza sola: se descarga el .dmg desde GitHub. Ábrelo, arrastra PugIDE a Aplicaciones y la primera vez abre con clic derecho → Abrir.';
      default: return null;
    }
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
