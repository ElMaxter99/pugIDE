import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { ProjectState } from '../../../core/state/project.state';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { ShareDecodeError, ShareExpiredError, ShareWrongPasswordError, decodeShare, decryptShare } from '../../../core/utils/share.util';
import { formatShareDate } from '../../../core/utils/share-options.util';

/** Intentos fallidos seguidos antes de pedir una espera, y cuánto (solo frena el tecleo a ciegas; no es una protección). */
const MAX_ATTEMPTS = 5;
const WAIT_MS = 30_000;

/**
 * Abrir un enlace compartido (P-16). Por defecto se abre como **proyecto nuevo**: el proyecto actual se guarda antes en
 * «Mis proyectos» y no se toca. Con contraseña, la pide primero; caducado o dañado, lo explica.
 */
@Component({
  selector: 'app-share-open-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (request(); as req) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="title()" tabindex="-1" data-testid="share-open"
          (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">{{ title() }}</h2></div>
          @if (req.problem) {
            <div class="body"><p class="problem" role="alert">{{ req.problem }}</p></div>
            <div class="footer"><button type="button" class="btn primary" (click)="close()">Cerrar</button></div>
          } @else if (!req.payload) {
            <div class="body">
              <p class="msg">Escribe la contraseña que te dieron para abrir el proyecto.</p>
              <label class="label" for="share-open-password">Contraseña</label>
              <input id="share-open-password" class="input" type="password" autocomplete="current-password" [value]="password()"
                (input)="password.set($any($event.target).value)" (keydown.enter)="submitPassword()"
                [attr.aria-invalid]="wrong() ? 'true' : null" [attr.aria-describedby]="wrong() ? 'share-open-err' : null" />
              @if (wrong(); as w) { <p class="problem" id="share-open-err" role="alert">{{ w }}</p> }
            </div>
            <div class="footer">
              <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
              <button type="button" class="btn primary" [disabled]="!password() || busy() || waiting()" (click)="submitPassword()">{{ busy() ? 'Abriendo…' : 'Abrir' }}</button>
            </div>
          } @else {
            <div class="body">
              <p class="msg"><strong>{{ req.payload.projectName }}</strong> · {{ req.payload.files.size }} {{ req.payload.files.size === 1 ? 'archivo' : 'archivos' }}
                · {{ hasData() ? 'con datos' : 'sin datos' }} · {{ req.payload.assets.length }} {{ req.payload.assets.length === 1 ? 'imagen' : 'imágenes' }}
                @if (req.payload.expiresAt) { <br>Caduca el {{ date(req.payload.expiresAt) }} }
                @if (req.payload.note) { <br>Nota: «{{ req.payload.note }}» }
              </p>
              <div class="choices" role="radiogroup" aria-label="Cómo abrirlo">
                <label class="choice" [class.on]="mode() === 'new'">
                  <input type="radio" name="share-open-mode" [checked]="mode() === 'new'" (change)="mode.set('new')" />
                  <span><strong>Abrir como proyecto nuevo</strong><br><span class="muted">Tu proyecto actual «{{ current() }}» se guarda en «Mis proyectos» y no se toca.</span></span>
                </label>
                <label class="choice" [class.on]="mode() === 'replace'">
                  <input type="radio" name="share-open-mode" [checked]="mode() === 'replace'" (change)="mode.set('replace')" />
                  <span><strong>Reemplazar mi sesión</strong><br><span class="muted">Perderás los cambios sin guardar de «{{ current() }}».</span></span>
                </label>
              </div>
            </div>
            <div class="footer">
              <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
              <button type="button" class="btn primary" (click)="open()">{{ mode() === 'new' ? 'Abrir como proyecto nuevo' : 'Reemplazar y abrir' }}</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
    .msg { margin: 0; line-height: 1.6; }
    .msg strong, .choice strong { color: var(--text-primary); }
    .muted { color: var(--text-secondary); font-size: 12px; }
    .label { font-size: 12px; color: var(--text-secondary); }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); }
    .problem { margin: 0; font-size: 13px; color: var(--error-color, #ff8a80); line-height: 1.5; }
    .choices { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
    .choice { display: flex; gap: 10px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; line-height: 1.5; }
    .choice.on { border-color: var(--accent-color); background: var(--bg-active); }
    .choice input { margin-top: 3px; accent-color: var(--accent-color); }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.secondary:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--bg-primary); }
    .btn.primary:hover:not(:disabled) { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ShareOpenDialogComponent {
  private readonly ui = inject(UiState);
  private readonly projectIo = inject(ProjectIoService);
  private readonly projectState = inject(ProjectState);

  protected readonly request = this.ui.shareOpen;
  protected readonly mode = signal<'new' | 'replace'>('new');
  protected readonly password = signal('');
  protected readonly busy = signal(false);
  protected readonly wrong = signal<string | null>(null);
  protected readonly waiting = signal(false);
  private failures = 0;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly current = computed(() => this.projectState.projectName() || 'tu proyecto');
  protected readonly title = computed(() => {
    const r = this.request();
    if (!r) return '';
    if (r.problem) return 'No se puede abrir el enlace';
    return r.payload ? 'Abrir proyecto compartido' : 'Este enlace tiene contraseña';
  });
  protected hasData(): boolean {
    return Object.keys(this.request()?.payload?.data ?? {}).length > 0;
  }
  protected date(ms: number): string {
    return formatShareDate(ms);
  }

  constructor() {
    effect(() => {
      const r = this.request();
      if (r) {
        untracked(() => {
          if (!this.restoreFocus) this.restoreFocus = rememberFocus();
          setTimeout(() => {
            const el = this.dlg()?.nativeElement;
            const items = el ? focusableElements(el) : [];
            (items.find((e) => e.tagName === 'INPUT' && (e as HTMLInputElement).type !== 'radio') ?? items.find((e) => (e as HTMLInputElement).checked) ?? items[items.length - 1] ?? el)?.focus();
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

  protected async submitPassword(): Promise<void> {
    const req = this.request();
    if (!req?.encrypted || !this.password() || this.busy() || this.waiting()) return;
    this.busy.set(true);
    this.wrong.set(null);
    try {
      const payload = decodeShare(await decryptShare(req.encrypted, this.password()));
      this.failures = 0;
      this.password.set('');
      if (!req.hasSession) {
        this.projectIo.loadShared(payload, 'new');
        this.finish();
      } else {
        this.mode.set('new');
        this.ui.shareOpen.set({ ...req, encrypted: null, payload });
      }
    } catch (err) {
      if (err instanceof ShareExpiredError) {
        this.ui.shareOpen.set({ ...req, encrypted: null, problem: `Este enlace caducó el ${formatShareDate(err.expiresAt)}.` });
      } else if (err instanceof ShareWrongPasswordError) {
        this.failures++;
        if (this.failures >= MAX_ATTEMPTS) {
          this.failures = 0;
          this.waiting.set(true);
          this.wrong.set('Contraseña incorrecta. Espera 30 s antes de volver a probar.');
          this.waitTimer = setTimeout(() => { this.waiting.set(false); this.wrong.set(null); }, WAIT_MS);
        } else {
          const left = MAX_ATTEMPTS - this.failures;
          this.wrong.set(`Contraseña incorrecta. Quedan ${left} ${left === 1 ? 'intento' : 'intentos'} antes de esperar 30 s.`);
        }
      } else {
        this.wrong.set(err instanceof ShareDecodeError ? err.message : 'No se pudo abrir el enlace.');
      }
    } finally {
      this.busy.set(false);
    }
  }

  protected open(): void {
    const payload = this.request()?.payload;
    if (!payload) return;
    this.projectIo.loadShared(payload, this.mode());
    this.finish();
  }

  protected close(): void {
    this.finish();
  }

  private finish(): void {
    if (this.waitTimer) { clearTimeout(this.waitTimer); this.waitTimer = null; }
    this.waiting.set(false);
    this.wrong.set(null);
    this.password.set('');
    this.failures = 0;
    this.ui.shareOpen.set(null);
    this.projectIo.clearShareHash();
  }
}
