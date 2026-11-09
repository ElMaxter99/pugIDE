import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ProjectIoService } from '../../../core/services/project-io.service';
import { TerminalState } from '../../../core/state/terminal.state';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { shareBaseUrl } from '../../../core/utils/desktop.util';
import { SHARE_MIN_PASSWORD, ShareLink } from '../../../core/utils/share.util';
import { EXPIRY_CHOICES, ExpiryChoice, expiryFrom, formatShareDate } from '../../../core/utils/share-options.util';

/**
 * «Compartir proyecto» (P-15): caducidad, contraseña, qué viaja y una nota. El enlace se genera en el navegador y se copia
 * al portapapeles; nada se sube a ningún sitio. Dice con claridad qué garantiza cada opción (la caducidad es una cortesía).
 */
@Component({
  selector: 'app-share-create-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.shareCreateOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="result() ? 'Enlace copiado' : 'Compartir proyecto'" tabindex="-1"
          data-testid="share-create" (click)="$event.stopPropagation()" (keydown.escape)="close()" (keydown)="onKeydown($event)">
          <div class="header"><h2 class="title">{{ result() ? 'Enlace copiado' : 'Compartir proyecto' }}</h2></div>
          @if (!result()) {
            <div class="body">
              <div class="label" id="share-expiry-label">Caduca</div>
              <div class="expiry-row" role="radiogroup" aria-labelledby="share-expiry-label">
                @for (c of choices; track c.id) {
                  <button type="button" class="expiry-chip" role="radio" [attr.aria-checked]="expiry() === c.id" [class.on]="expiry() === c.id" (click)="expiry.set(c.id)">{{ c.label }}</button>
                }
              </div>
              <label class="label" for="share-password">Contraseña (opcional, mínimo {{ minPassword }} caracteres)</label>
              <input id="share-password" class="input" type="password" autocomplete="new-password" [value]="password()" (input)="password.set($any($event.target).value)"
                [attr.aria-invalid]="passwordProblem() ? 'true' : null" [attr.aria-describedby]="passwordProblem() ? 'share-password-err' : null" />
              @if (passwordProblem(); as p) { <p class="problem" id="share-password-err" role="alert">{{ p }}</p> }
              <label class="check"><input type="checkbox" [checked]="includeData()" (change)="includeData.set($any($event.target).checked)" /> Incluir los datos de ejemplo</label>
              <label class="check"><input type="checkbox" [checked]="includeAssets()" (change)="includeAssets.set($any($event.target).checked)" /> Incluir imágenes y fuentes (hasta 60 KB)</label>
              <label class="label" for="share-note">Nota para quien lo abra (opcional)</label>
              <input id="share-note" class="input" type="text" maxlength="300" [value]="note()" (input)="note.set($any($event.target).value)" />
              <p class="note">La contraseña cifra el contenido: sin ella no se puede leer. La caducidad la respeta PugIDE, pero no impide que quien ya tenga el enlace lo copie. Comparte la contraseña por otro canal.</p>
              @if (error(); as e) { <p class="problem" role="alert">{{ e }}</p> }
            </div>
            <div class="footer">
              <button type="button" class="btn secondary" (click)="close()">Cancelar</button>
              <button type="button" class="btn primary" [disabled]="!!passwordProblem() || busy()" (click)="create()">{{ busy() ? 'Generando…' : 'Copiar enlace' }}</button>
            </div>
          } @else {
            <div class="body">
              <div class="summary"><strong>{{ summary() }}</strong></div>
              <label class="label" for="share-url">{{ copied() ? 'Enlace' : 'No se pudo copiar automáticamente: cópialo desde aquí' }}</label>
              <input id="share-url" class="input mono" type="text" readonly [value]="result()!.url" (focus)="$any($event.target).select()" />
              <p class="note">El enlace se generó en tu navegador; no se ha subido a ningún sitio.</p>
              @if (result()!.included.length) { <p class="note">Incluye {{ result()!.included.length }} asset(s) pequeño(s).</p> }
              @if (result()!.omitted.length) { <p class="problem" role="status">No caben en el enlace: {{ result()!.omitted.join(', ') }}.</p> }
              @if (result()!.tooLong) {
                <p class="problem" role="status">El enlace es muy largo ({{ result()!.length }} caracteres) y puede no funcionar en algunos navegadores o aplicaciones de mensajería.
                  <button type="button" class="link" (click)="downloadZip()">Descargar .zip completo</button></p>
              }
            </div>
            <div class="footer"><button type="button" class="btn primary" (click)="close()">Hecho</button></div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px); overflow: auto; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { padding: 16px 20px 8px; }
    .title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .body { padding: 8px 20px 16px; font-size: 13px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 8px; }
    .label { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }
    .expiry-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .expiry-chip { padding: 4px 12px; border: 1px solid var(--border-color); border-radius: 999px; background: none; color: var(--text-primary); font: inherit; font-size: 12px; cursor: pointer; }
    .expiry-chip.on { border-color: var(--accent-color); background: var(--bg-active); }
    .input { width: 100%; padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; }
    .input.mono { font-family: var(--font-mono); font-size: 12px; }
    .input:focus { border-color: var(--accent-color); }
    .check { display: flex; gap: 8px; align-items: center; color: var(--text-primary); }
    .check input { accent-color: var(--accent-color); }
    .note { margin: 4px 0 0; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-input); font-size: 12px; line-height: 1.5; }
    .problem { margin: 2px 0 0; font-size: 12px; color: var(--error-color, #ff8a80); line-height: 1.5; }
    .summary { color: var(--text-primary); }
    .link { background: none; border: 0; padding: 0; color: var(--accent-color); font: inherit; text-decoration: underline; cursor: pointer; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; padding: 0 20px 16px; }
    .btn { padding: 6px 16px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn.secondary { background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn.secondary:hover { background: var(--bg-hover); }
    .btn.primary { background: var(--accent-color); border: none; color: var(--bg-primary); }
    .btn.primary:hover:not(:disabled) { opacity: 0.9; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ShareCreateDialogComponent {
  protected readonly ui = inject(UiState);
  private readonly projectIo = inject(ProjectIoService);
  private readonly terminal = inject(TerminalState);

  protected readonly choices = EXPIRY_CHOICES;
  protected readonly minPassword = SHARE_MIN_PASSWORD;
  protected readonly expiry = signal<ExpiryChoice>('7d');
  protected readonly password = signal('');
  protected readonly includeData = signal(true);
  protected readonly includeAssets = signal(true);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly result = signal<ShareLink | null>(null);
  protected readonly copied = signal(true);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  protected readonly passwordProblem = computed(() => {
    const p = this.password();
    return p.length > 0 && p.length < SHARE_MIN_PASSWORD ? `Necesita al menos ${SHARE_MIN_PASSWORD} caracteres (ahora tiene ${p.length}).` : null;
  });

  protected readonly summary = computed(() => {
    const r = this.result();
    if (!r) return '';
    const parts = [r.expiresAt ? `Caduca el ${formatShareDate(r.expiresAt)}` : 'Sin caducidad'];
    if (r.encrypted) parts.push('con contraseña');
    parts.push(`${(r.length / 1024).toFixed(1).replace('.', ',')} KB`);
    return parts.join(' · ');
  });

  constructor() {
    effect(() => {
      if (this.ui.shareCreateOpen()) {
        untracked(() => {
          this.expiry.set('7d'); this.password.set(''); this.includeData.set(true); this.includeAssets.set(true);
          this.note.set(''); this.busy.set(false); this.error.set(null); this.result.set(null); this.copied.set(true);
          this.restoreFocus = rememberFocus();
          this.focusFirst();
        });
      } else if (this.restoreFocus) {
        this.restoreFocus();
        this.restoreFocus = null;
      }
    });
  }

  private focusFirst(): void {
    setTimeout(() => {
      const el = this.dlg()?.nativeElement;
      const items = el ? focusableElements(el) : [];
      (items.find((e) => e.getAttribute('role') === 'radio' && e.getAttribute('aria-checked') === 'true') ?? items[0] ?? el)?.focus();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected async create(): Promise<void> {
    if (this.passwordProblem() || this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const link = await this.projectIo.buildShareLinkProtected(shareBaseUrl(location.origin) + '/ide', {
        expiresAt: expiryFrom(this.expiry(), Date.now()),
        password: this.password() || undefined,
        includeData: this.includeData(),
        includeAssets: this.includeAssets(),
        note: this.note(),
      });
      let copied = true;
      try { await navigator.clipboard.writeText(link.url); } catch { copied = false; }
      if (!copied) history.replaceState(null, '', link.url);
      this.copied.set(copied);
      this.result.set(link);
      const text = `Enlace ${copied ? 'copiado al portapapeles' : 'generado'}${link.encrypted ? ' (con contraseña)' : ''}${link.expiresAt ? `, caduca el ${formatShareDate(link.expiresAt)}` : ''}.`;
      this.terminal.addEntry(link.tooLong || link.omitted.length ? 'warning' : 'success', 'Compartir', text);
      this.focusFirst();
    } catch (err) {
      this.error.set((err as Error).message || 'No se pudo generar el enlace.');
    } finally {
      this.busy.set(false);
    }
  }

  protected downloadZip(): void {
    this.projectIo.downloadZip();
  }

  protected close(): void {
    this.ui.shareCreateOpen.set(false);
  }
}
