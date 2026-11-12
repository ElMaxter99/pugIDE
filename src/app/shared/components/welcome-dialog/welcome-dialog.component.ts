import { Component, ChangeDetectionStrategy, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { OrchestratorService } from '../../../core/services/orchestrator.service';
import { PersistenceService } from '../../../core/services/persistence.service';
import { ProjectLibraryService } from '../../../core/services/project-library.service';
import { UiState } from '../../../core/state/ui.state';
import { defaultProjectFiles } from '../../../core/utils/default-project.util';
import { rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';
import { WELCOME_TEMPLATE_ORDER, templateBadge } from '../../../core/utils/tour.util';

/**
 * Bienvenida del primer uso (mesa P-06): plantillas de un clic, acceso a los proyectos guardados y a importar,
 * y la oferta del recorrido. Se enseña una sola vez: cerrarla de cualquier manera la da por vista.
 */
@Component({
  selector: 'app-welcome-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.welcomeOpen()) {
      <div class="overlay" (click)="dismiss()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-intro" tabindex="-1" data-testid="welcome"
          (click)="$event.stopPropagation()" (keydown.escape)="dismiss()" (keydown)="onKeydown($event)">
          <div class="header">
            <div>
              <p class="eyebrow">Bienvenida</p>
              <h2 id="welcome-title">Te damos la bienvenida a PugIDE</h2>
            </div>
            <button type="button" class="close" title="Cerrar" aria-label="Cerrar la bienvenida" data-testid="welcome-close" (click)="dismiss()">
              <span aria-hidden="true" class="material-symbols-outlined">close</span>
            </button>
          </div>
          <p id="welcome-intro" class="intro">Escribe Pug, rellena datos de ejemplo y mira el resultado al instante. Todo ocurre en tu navegador: tu código y tus datos no salen de tu equipo.</p>
          <h3>Empieza con una plantilla</h3>
          <div class="cards">
            @for (t of templates; track t.id) {
              <button type="button" class="card" [attr.data-testid]="'welcome-template-' + t.id" [disabled]="busy()" (click)="useTemplate(t.id)">
                <span class="card-name">{{ t.name }}</span>
                <span class="card-desc">{{ t.description }}</span>
                <span class="card-badge">{{ t.badge }}</span>
              </button>
            }
            <button type="button" class="card" data-testid="welcome-template-empty" [disabled]="busy()" (click)="useEmpty()">
              <span class="card-name"><span aria-hidden="true" class="material-symbols-outlined plus">add</span>Proyecto vacío</span>
              <span class="card-desc">Una página en blanco con main.pug y mixins.pug para empezar desde cero.</span>
              <span class="card-badge">{{ emptyBadge }}</span>
            </button>
          </div>
          <div class="links">
            @if (hasSaved()) {
              <button type="button" class="link" data-testid="welcome-open-saved" (click)="openSaved()">
                <span aria-hidden="true" class="material-symbols-outlined">folder_open</span>Abrir un proyecto guardado…
              </button>
            }
            <button type="button" class="link" data-testid="welcome-import" (click)="importProject()">
              <span aria-hidden="true" class="material-symbols-outlined">upload</span>Importar proyecto (carpeta o .zip)…
            </button>
            <button type="button" class="link tour" data-testid="welcome-tour" (click)="startTour()">
              <span aria-hidden="true" class="material-symbols-outlined">arrow_forward</span>Ver el recorrido · 1 minuto
            </button>
          </div>
          <p class="tip">Consejo: <kbd>Ctrl+K</kbd> busca cualquier comando o archivo · <kbd>Ctrl+S</kbd> guarda · <kbd>Ctrl+Enter</kbd> compila al momento</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; align-items: center; justify-content: center; z-index: 2200; }
    .dialog { width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 20px 24px 18px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4); color: var(--text-primary); }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .eyebrow { margin: 0 0 2px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-secondary); }
    h2 { margin: 0; font-size: 22px; font-weight: 600; }
    h3 { margin: 4px 0 0; font-size: 14px; font-weight: 600; }
    .intro { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
    .close { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; color: var(--text-secondary); }
    .close:hover { background: var(--bg-hover); color: var(--text-primary); }
    .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .card { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; text-align: left; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary); min-height: 96px; }
    .card:hover:not(:disabled) { border-color: var(--accent-color); background: var(--bg-hover); }
    .card:disabled { opacity: 0.6; cursor: default; }
    .card-name { display: inline-flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 600; }
    .card-desc { font-size: 13px; line-height: 1.4; color: var(--text-secondary); }
    .card-badge { margin-top: auto; font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); }
    .plus { font-size: 18px; width: 18px; margin-left: -2px; }
    .links { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; }
    .link { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 6px; font-size: 13px; color: var(--text-primary); border-radius: 6px; }
    .link .material-symbols-outlined { font-size: 18px; width: 18px; color: var(--text-secondary); }
    .link:hover { background: var(--bg-hover); }
    .link.tour { margin-left: auto; color: var(--accent-color); font-weight: 600; }
    .link.tour .material-symbols-outlined { color: var(--accent-color); }
    .tip { margin: 0; padding-top: 10px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-secondary); }
    kbd { font-family: var(--font-mono); font-size: 11px; padding: 1px 6px; color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 4px; }
    @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } .link.tour { margin-left: 0; } }
  `],
})
export class WelcomeDialogComponent {
  protected ui = inject(UiState);
  private orchestrator = inject(OrchestratorService);
  private persistence = inject(PersistenceService);
  private library = inject(ProjectLibraryService);

  protected readonly busy = signal(false);
  protected readonly hasSaved = signal(false);
  protected readonly templates = [...PROJECT_TEMPLATES]
    .sort((a, b) => WELCOME_TEMPLATE_ORDER.indexOf(a.id) - WELCOME_TEMPLATE_ORDER.indexOf(b.id))
    .map((t) => ({ id: t.id, name: t.name, description: t.description, badge: templateBadge(t.id, Object.keys(t.files).length) }));
  protected readonly emptyBadge = `${defaultProjectFiles().size} archivos`;

  private dialog = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.welcomeOpen()) {
        untracked(() => {
          this.restoreFocus = rememberFocus();
          void this.library.list().then((list) => this.hasSaved.set(list.length > 0));
          setTimeout(() => this.dialog()?.nativeElement.querySelector<HTMLElement>('.card')?.focus());
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

  /** Cerrarla de cualquier manera la da por vista: no vuelve a salir sola. */
  protected dismiss(): void {
    this.persistence.saveWelcomeSeen();
    this.ui.welcomeOpen.set(false);
  }

  protected async useTemplate(id: string): Promise<void> {
    this.busy.set(true);
    try {
      await this.orchestrator.startFromTemplate(id);
    } finally {
      this.busy.set(false);
    }
    this.dismiss();
  }

  protected useEmpty(): void {
    this.dismiss();
  }

  protected openSaved(): void {
    this.dismiss();
    this.ui.projectsOpen.set(true);
  }

  protected importProject(): void {
    this.dismiss();
    this.ui.projectsImportMenu.set(true);
    this.ui.projectsOpen.set(true);
  }

  protected startTour(): void {
    this.dismiss();
    this.ui.tourOpen.set(true);
  }
}
