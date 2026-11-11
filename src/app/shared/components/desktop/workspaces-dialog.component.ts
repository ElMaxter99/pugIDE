import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { PickedFolder, WorkspaceService } from '../../../core/services/workspace.service';
import { UiState } from '../../../core/state/ui.state';
import { focusableElements, rememberFocus, trapTab } from '../../../core/utils/focus-trap.util';
import { PROJECT_TEMPLATES } from '../../../core/utils/templates.util';
import { WorkspaceInfo, lastOpenedText } from '../../../core/utils/workspace.util';

/**
 * Escritorio (P-26): «Espacios de trabajo». Cada espacio es una carpeta del disco con nombre y color (un cliente, un
 * trabajo). Lista, búsqueda, nuevo espacio, carpeta que ya no se encuentra y vuelta a los proyectos guardados en la app.
 */
@Component({
  selector: 'app-workspaces-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.workspacesOpen()) {
      <div class="overlay" (click)="close()">
        <div #dlg class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="creating() ? 'Nuevo espacio de trabajo' : 'Espacios de trabajo'" tabindex="-1" data-testid="workspaces"
          (click)="$event.stopPropagation()" (keydown.escape)="creating() ? cancelNew() : close()" (keydown)="onKeydown($event)">
          @if (!creating()) {
            <div class="header">
              <h2 class="title">Espacios de trabajo</h2>
              <button type="button" class="btn primary" data-testid="workspace-new" (click)="startNew()">Nuevo espacio…</button>
            </div>
            <p class="hint">Un espacio es una carpeta de tu equipo (un cliente, un trabajo). Lo que editas se guarda en sus archivos: puedes usar git u otro editor a la vez. Nada sale de tu equipo.</p>
            @if (workspace.workspaces().length > 4) {
              <input class="input search" type="search" placeholder="Buscar un espacio" aria-label="Buscar un espacio" [value]="query()" (input)="query.set($any($event.target).value)" />
            }
            <ul class="list" data-testid="workspace-list">
              @for (w of shown(); track w.id) {
                <li class="row" [class.current]="w.id === workspace.active()?.id" [class.missing]="!w.exists">
                  <span class="avatar" [style.background]="w.color" aria-hidden="true">{{ w.name.charAt(0).toUpperCase() }}</span>
                  <div class="info">
                    @if (editingId() === w.id) {
                      <input class="input name-input" #nm [value]="w.name" aria-label="Nombre del espacio" (keydown.enter)="saveEdit(w, nm.value)" (keydown.escape)="editingId.set(null)" />
                      <div class="colors" role="radiogroup" aria-label="Color">
                        @for (c of workspace.colors(); track c) {
                          <button type="button" class="color" role="radio" [attr.aria-checked]="editColor() === c" [attr.aria-label]="'Color ' + ($index + 1)" [style.background]="c" [class.on]="editColor() === c" (click)="editColor.set(c)"></button>
                        }
                        <button type="button" class="btn small" (click)="saveEdit(w, nm.value)">Guardar</button>
                      </div>
                    } @else {
                      <span class="name">{{ w.name }} @if (w.id === workspace.active()?.id) { <span class="badge">abierto</span> }</span>
                      <span class="path">{{ w.path }}</span>
                      @if (!w.exists) { <span class="warn">No se encuentra la carpeta (¿disco desconectado o movida?)</span> }
                    }
                  </div>
                  <span class="meta">{{ when(w) }}</span>
                  <div class="actions">
                    @if (w.exists) {
                      @if (w.id !== workspace.active()?.id) { <button type="button" class="btn primary small" [attr.data-testid]="'workspace-open-' + w.name" [disabled]="busy()" (click)="open(w)">Abrir</button> }
                    } @else {
                      <button type="button" class="btn small" (click)="relocate(w)">Buscar la carpeta…</button>
                    }
                    <button type="button" class="btn small" (click)="edit(w)">Nombre y color</button>
                    @if (confirmId() === w.id) {
                      <button type="button" class="btn small danger" (click)="forget(w)">Confirmar</button>
                    } @else {
                      <button type="button" class="btn small" title="Quita el espacio de esta lista; no borra nada del disco" (click)="confirmId.set(w.id)">Quitar de la lista</button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="empty">{{ query() ? 'Ningún espacio coincide.' : 'Aún no tienes espacios de trabajo. Crea uno con «Nuevo espacio…» y elige la carpeta donde están (o estarán) las plantillas de un cliente.' }}</li>
              }
            </ul>
            <div class="footer">
              @if (workspace.active()) {
                <button type="button" class="btn" data-testid="workspace-close" (click)="closeWorkspace()">Cerrar el espacio y volver a los proyectos guardados en la app</button>
              } @else {
                <span class="hint flat">Sin espacio abierto se usan los proyectos guardados en la app («Proyecto → Mis proyectos…»).</span>
              }
              <button type="button" class="btn" (click)="close()">Cerrar</button>
            </div>
          } @else {
            <div class="header"><h2 class="title">Nuevo espacio de trabajo</h2></div>
            <div class="body">
              <label class="label" for="ws-name">Nombre del cliente o del trabajo</label>
              <input id="ws-name" class="input" type="text" maxlength="60" data-testid="workspace-name" [value]="name()" (input)="name.set($any($event.target).value)" />
              <div class="label" id="ws-color">Color</div>
              <div class="colors" role="radiogroup" aria-labelledby="ws-color">
                @for (c of workspace.colors(); track c) {
                  <button type="button" class="color" role="radio" [attr.aria-checked]="color() === c" [attr.aria-label]="'Color ' + ($index + 1)" [style.background]="c" [class.on]="color() === c" (click)="color.set(c)"></button>
                }
              </div>
              <div class="label">Carpeta</div>
              <div class="folder">
                <span class="path box" data-testid="workspace-folder">{{ picked()?.path ?? 'Sin elegir' }}</span>
                <button type="button" class="btn" data-testid="workspace-pick" (click)="pick()">Elegir…</button>
              </div>
              @if (picked(); as p) {
                @if (p.tooBig) {
                  <p class="warn" role="alert">Esa carpeta tiene demasiados archivos o pesa demasiado (máximo 2000 archivos y 60 MB). Elige la carpeta de las plantillas, no la del proyecto entero.</p>
                } @else if (p.pugCount > 0) {
                  <p class="note" data-testid="workspace-found">Se usará lo que ya hay en la carpeta ({{ p.pugCount }} {{ p.pugCount === 1 ? 'plantilla .pug' : 'plantillas .pug' }}).</p>
                } @else {
                  <label class="label" for="ws-tpl">La carpeta no tiene plantillas: empezar con</label>
                  <select id="ws-tpl" class="input" [value]="templateId()" (change)="templateId.set($any($event.target).value)">
                    <option value="">Una plantilla mínima (main.pug)</option>
                    @for (t of templates; track t.id) { <option [value]="t.id">{{ t.name }}</option> }
                  </select>
                }
              }
            </div>
            <div class="footer">
              <button type="button" class="btn" (click)="cancelNew()">Cancelar</button>
              <button type="button" class="btn primary" data-testid="workspace-create" [disabled]="busy() || !canCreate()" (click)="create()">Crear espacio</button>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .dialog { width: min(820px, calc(100vw - 32px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3); }
    .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px 6px; }
    .title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .hint { margin: 0; padding: 0 20px 10px; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
    .hint.flat { padding: 0; flex: 1; }
    .search { margin: 0 20px 8px; width: calc(100% - 40px); }
    .list { list-style: none; margin: 0; padding: 0 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 8px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-input); flex-wrap: wrap; }
    .row.current { border-color: var(--accent-color); }
    .row.missing { border-style: dashed; }
    .avatar { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #16111b; flex-shrink: 0; }
    .info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 200px; }
    .name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow-wrap: anywhere; }
    .badge { font-size: 11px; font-weight: 400; color: var(--accent-color); margin-left: 6px; }
    .path { font-family: var(--font-mono); font-size: 11px; color: var(--text-secondary); overflow-wrap: anywhere; }
    .path.box { flex: 1; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-input); }
    .meta { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .warn { font-size: 12px; color: var(--warning-color); margin: 0; }
    .note { font-size: 12px; color: var(--text-secondary); margin: 0; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .empty { padding: 20px 8px; color: var(--text-secondary); font-size: 13px; line-height: 1.5; }
    .body { padding: 8px 20px 12px; display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-secondary); overflow-y: auto; }
    .label { font-size: 12px; margin-top: 4px; }
    .input { padding: 8px 10px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary); font-size: 13px; font-family: inherit; box-sizing: border-box; }
    .input:focus { border-color: var(--accent-color); outline: none; }
    .name-input { padding: 4px 8px; }
    .colors { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .color { width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--border-color); }
    .color.on { outline: 3px solid var(--text-primary); outline-offset: 1px; }
    .folder { display: flex; gap: 8px; align-items: stretch; }
    .footer { display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 20px 16px; flex-wrap: wrap; }
    .btn { padding: 6px 14px; border-radius: 4px; font-size: 12px; font-weight: 500; font-family: inherit; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); }
    .btn:hover:not(:disabled) { background: var(--bg-hover); }
    .btn.small { padding: 4px 10px; }
    .btn.primary { background: var(--accent-color); border-color: var(--accent-color); color: var(--text-on-primary); font-weight: 600; }
    .btn.danger { background: #b3261e; border-color: #b3261e; color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class WorkspacesDialogComponent {
  protected readonly ui = inject(UiState);
  protected readonly workspace = inject(WorkspaceService);
  protected readonly templates = PROJECT_TEMPLATES;

  protected readonly query = signal('');
  protected readonly creating = signal(false);
  protected readonly busy = signal(false);
  protected readonly name = signal('');
  protected readonly color = signal('');
  protected readonly picked = signal<PickedFolder | null>(null);
  protected readonly templateId = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly editColor = signal('');
  protected readonly confirmId = signal<string | null>(null);

  protected readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.workspace.workspaces().filter((w) => !q || w.name.toLowerCase().includes(q) || w.path.toLowerCase().includes(q));
  });
  protected readonly canCreate = computed(() => !!this.name().trim() && !!this.picked() && !this.picked()!.tooBig);

  private readonly dlg = viewChild<ElementRef<HTMLElement>>('dlg');
  private restoreFocus: (() => void) | null = null;

  constructor() {
    effect(() => {
      if (this.ui.workspacesOpen()) {
        untracked(() => {
          this.creating.set(false); this.query.set(''); this.editingId.set(null); this.confirmId.set(null); this.busy.set(false);
          void this.workspace.refresh();
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
    setTimeout(() => { const el = this.dlg()?.nativeElement; (el ? focusableElements(el)[0] ?? el : null)?.focus(); });
  }

  protected when(w: WorkspaceInfo): string { return lastOpenedText(w.lastOpened); }

  protected onKeydown(event: KeyboardEvent): void {
    const el = this.dlg()?.nativeElement;
    if (el) trapTab(event, el);
  }

  protected close(): void { this.ui.workspacesOpen.set(false); }

  protected startNew(): void {
    this.name.set(''); this.picked.set(null); this.templateId.set('');
    this.color.set(this.workspace.colors()[this.workspace.workspaces().length % Math.max(1, this.workspace.colors().length)] ?? '');
    this.creating.set(true);
    this.focusFirst();
  }

  protected cancelNew(): void { this.creating.set(false); this.focusFirst(); }

  protected async pick(): Promise<void> {
    const p = await this.workspace.pickFolder();
    if (!p) return;
    this.picked.set(p);
    if (!this.name().trim()) this.name.set(p.path.split(/[\\/]/).filter(Boolean).pop() ?? '');
  }

  protected async create(): Promise<void> {
    const p = this.picked();
    if (!p || !this.canCreate() || this.busy()) return;
    this.busy.set(true);
    const ok = await this.workspace.create(this.name(), this.color(), p.token, this.templateId() || undefined);
    this.busy.set(false);
    if (ok) this.close();
  }

  protected async open(w: WorkspaceInfo): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const ok = await this.workspace.open(w.id);
    this.busy.set(false);
    if (ok) this.close();
  }

  protected edit(w: WorkspaceInfo): void { this.editColor.set(w.color); this.editingId.set(w.id); }

  protected async saveEdit(w: WorkspaceInfo, name: string): Promise<void> {
    this.editingId.set(null);
    await this.workspace.rename(w.id, name, this.editColor());
  }

  protected async relocate(w: WorkspaceInfo): Promise<void> { await this.workspace.relocate(w.id); }

  protected async forget(w: WorkspaceInfo): Promise<void> { this.confirmId.set(null); await this.workspace.forget(w.id); }

  protected async closeWorkspace(): Promise<void> { await this.workspace.close(); this.close(); }
}
