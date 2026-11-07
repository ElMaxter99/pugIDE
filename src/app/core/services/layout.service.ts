import { Injectable, computed, inject, signal } from '@angular/core';
import { PreferencesState } from './preferences.state';
import { PreviewState } from '../state/preview.state';
import { TerminalState } from '../state/terminal.state';
import { LAYOUTS, LayoutDef, LayoutId, PanelKey, PanelSizes, layoutById, planPdfLayoutChange, resolveLayout } from '../utils/layout.util';

/**
 * Disposición de la interfaz (P-08): la activa, los anchos que ha elegido la persona y los atajos que la cambian.
 * Todo se guarda en las preferencias del usuario (no viaja con el proyecto, el enlace ni las instantáneas).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly preferences = inject(PreferencesState);
  private readonly previewState = inject(PreviewState);
  private readonly terminalState = inject(TerminalState);

  readonly layouts = LAYOUTS;
  readonly def = computed<LayoutDef>(() => layoutById(this.preferences.layout()));
  /** Los datos son una columna propia (y no una pestaña) en esta disposición. */
  readonly dataColumn = computed(() => this.def().dataColumn);
  readonly dataVisible = computed(() => this.def().dataColumn && !this.preferences.dataCollapsed());
  /** Anchos que se están arrastrando ahora mismo: se pintan al instante y se guardan al soltar (`commitLive`). */
  private readonly live = signal<Partial<PanelSizes>>({});
  /** Anchos elegidos para la disposición activa (lo que falta se toma de sus valores de partida). */
  readonly sizes = computed<Partial<PanelSizes>>(() => ({ ...(this.preferences.panelSizes()[this.preferences.layout()] ?? {}), ...this.live() }));

  /** Ancho de la zona de paneles (lo mide `MainLayoutComponent`); con él se reparten las columnas. */
  private readonly containerWidth = signal(typeof window === 'undefined' ? 1440 : window.innerWidth);
  /** Ancho real de cada columna y límites de cada tirador para la disposición activa. */
  readonly resolved = computed(() =>
    resolveLayout(this.def(), { sidebarCollapsed: this.preferences.sidebarCollapsed(), dataVisible: this.dataVisible(), sizes: this.sizes() }, this.containerWidth()),
  );

  setContainerWidth(px: number): void {
    if (px > 0) this.containerWidth.set(Math.round(px));
  }

  /**
   * Cambia de disposición: ajusta el panel lateral y los datos a como la define. «Foco en la vista previa» pone el modo PDF y
   * recuerda el dispositivo que había; al salir a otra disposición se vuelve a él (salvo que se haya elegido otro a mano).
   */
  apply(id: LayoutId): void {
    const def = layoutById(id);
    this.preferences.update({ layout: id, sidebarCollapsed: def.sidebarCollapsed, dataCollapsed: false });
    const current = { name: this.previewState.deviceName(), width: this.previewState.deviceWidth(), height: this.previewState.deviceHeight() };
    const plan = planPdfLayoutChange(def.pdf, current, this.preferences.deviceBeforePdf());
    if (def.pdf) {
      this.previewState.setDevice('PDF', 0, 0);
      // Una sola llamada con la memoria incluida: así no la borra la regla de «dispositivo elegido a mano».
      this.preferences.update({ previewDevice: 'PDF', deviceBeforePdf: plan.memory });
    } else if (plan.restore) {
      this.previewState.setDevice(plan.restore.name, plan.restore.width, plan.restore.height);
      this.preferences.update({ previewDevice: plan.restore.name, deviceBeforePdf: null });
    } else if (this.preferences.deviceBeforePdf()) {
      this.preferences.update({ deviceBeforePdf: null });
    }
  }

  toggleSidebar(): void {
    this.preferences.toggleSidebar();
  }

  /** Abre el panel lateral en una pestaña (si la disposición tiene los datos aparte, «datos» no existe y se queda en archivos). */
  openSidebar(tab: 'archivos' | 'datos'): void {
    this.preferences.update({ sidebarCollapsed: false, sidebarTab: tab === 'datos' && this.dataColumn() ? 'archivos' : tab });
  }

  /** Mostrar u ocultar los datos, estén donde estén en la disposición activa. */
  toggleData(): void {
    if (this.dataColumn()) {
      this.preferences.toggleData();
      return;
    }
    const open = !this.preferences.sidebarCollapsed() && this.preferences.sidebarTab() === 'datos';
    if (open) this.preferences.update({ sidebarCollapsed: true });
    else this.openSidebar('datos');
  }

  toggleBottom(): void {
    this.terminalState.toggle();
  }

  /** Mueve un panel mientras se arrastra su tirador (sin escribir aún en las preferencias). */
  setLive(key: PanelKey, px: number): void {
    this.live.update((l) => ({ ...l, [key]: Math.round(px) }));
  }

  /** Guarda lo arrastrado en las preferencias del usuario. */
  commitLive(): void {
    const live = this.live();
    this.live.set({});
    for (const key of Object.keys(live) as PanelKey[]) this.setSize(key, live[key] as number);
  }

  /** Guarda el ancho de un panel para la disposición activa. */
  setSize(key: PanelKey, px: number): void {
    const id = this.preferences.layout();
    const all = this.preferences.panelSizes();
    this.preferences.update({ panelSizes: { ...all, [id]: { ...(all[id] ?? {}), [key]: Math.round(px) } } });
  }

  /** Vuelve un panel a su ancho de partida en la disposición activa. */
  resetSize(key: PanelKey): void {
    const id = this.preferences.layout();
    const all = this.preferences.panelSizes();
    const { [key]: _removed, ...rest } = all[id] ?? {};
    const next = { ...all };
    if (Object.keys(rest).length) next[id] = rest;
    else delete next[id];
    this.preferences.update({ panelSizes: next });
  }

  /** «Restablecer los tamaños»: borra los anchos elegidos en la disposición activa. */
  resetSizes(): void {
    const id = this.preferences.layout();
    const next = { ...this.preferences.panelSizes() };
    delete next[id];
    this.preferences.update({ panelSizes: next });
  }
}
