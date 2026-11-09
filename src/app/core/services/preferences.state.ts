import { Injectable, signal, computed, inject } from '@angular/core';
import { AppPreferences, ThemeChoice } from '../models/index';
import { PersistenceService } from './persistence.service';
import { DEFAULT_JSON_VIEW, JsonViewPrefs, sanitizeJsonView } from '../utils/json-view.util';
import { DEFAULT_LAYOUT, DeviceMemory, LayoutId, PanelSizes } from '../utils/layout.util';

@Injectable({ providedIn: 'root' })
export class PreferencesState {
  /** Lo que eligió la persona: Automático (sigue al sistema), Oscuro o Claro. */
  readonly theme = signal<ThemeChoice>('auto');
  /** El tema del sistema (`prefers-color-scheme`); se actualiza si cambia mientras la app está abierta. */
  readonly systemDark = signal(true);
  /** El tema que se pinta de verdad. */
  readonly resolvedTheme = computed<'dark' | 'light'>(() => {
    const t = this.theme();
    return t === 'auto' ? (this.systemDark() ? 'dark' : 'light') : t;
  });
  readonly fontSize = signal(14);
  readonly tabSize = signal(2);
  readonly minimap = signal(true);
  readonly wordWrap = signal(false);
  readonly formatOnSave = signal(true);
  readonly sortAttributes = signal(false);
  readonly autoCompile = signal(true);
  readonly previewDevice = signal('Desktop');
  readonly zoom = signal(100);
  readonly sidebarCollapsed = signal(false);
  readonly dataCollapsed = signal(false);
  readonly layout = signal<LayoutId>(DEFAULT_LAYOUT);
  readonly panelSizes = signal<Partial<Record<LayoutId, Partial<PanelSizes>>>>({});
  readonly sidebarTab = signal<'archivos' | 'datos'>('archivos');
  readonly deviceBeforePdf = signal<DeviceMemory | null>(null);
  readonly jsonView = signal<JsonViewPrefs>(DEFAULT_JSON_VIEW);
  readonly monacoTheme = computed(() =>
    this.resolvedTheme() === 'dark' ? 'vs-dark' : 'vs-light'
  );

  private readonly persistence = inject(PersistenceService);

  constructor() {
    this.load();
    try {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      this.systemDark.set(!mq.matches);
      mq.addEventListener('change', (e) => this.systemDark.set(!e.matches));
    } catch { /* sin matchMedia: oscuro, como antes */ }
  }

  load(): void {
    const prefs = this.persistence.loadPreferences();
    this.theme.set(prefs.theme);
    this.fontSize.set(prefs.fontSize);
    this.tabSize.set(prefs.tabSize);
    this.minimap.set(prefs.minimap);
    this.wordWrap.set(prefs.wordWrap);
    this.formatOnSave.set(prefs.formatOnSave);
    this.sortAttributes.set(!!prefs.sortAttributes);
    this.autoCompile.set(prefs.autoCompile);
    this.previewDevice.set(prefs.previewDevice);
    this.zoom.set(prefs.zoom);
    this.sidebarCollapsed.set(!!prefs.sidebarCollapsed);
    this.dataCollapsed.set(!!prefs.dataCollapsed);
    this.layout.set(prefs.layout);
    this.panelSizes.set(prefs.panelSizes);
    this.sidebarTab.set(prefs.sidebarTab);
    this.deviceBeforePdf.set(prefs.deviceBeforePdf ?? null);
    this.jsonView.set(sanitizeJsonView(prefs.jsonView));
  }

  update(partial: Partial<AppPreferences>): void {
    // Elegir un dispositivo a mano (barra del preview, paleta) anula lo recordado para volver del modo PDF de la disposición.
    if (partial.previewDevice !== undefined && partial.deviceBeforePdf === undefined && this.deviceBeforePdf()) partial = { ...partial, deviceBeforePdf: null };
    if (partial.theme !== undefined) this.theme.set(partial.theme);
    if (partial.fontSize !== undefined) this.fontSize.set(partial.fontSize);
    if (partial.tabSize !== undefined) this.tabSize.set(partial.tabSize);
    if (partial.minimap !== undefined) this.minimap.set(partial.minimap);
    if (partial.wordWrap !== undefined) this.wordWrap.set(partial.wordWrap);
    if (partial.formatOnSave !== undefined) this.formatOnSave.set(partial.formatOnSave);
    if (partial.sortAttributes !== undefined) this.sortAttributes.set(partial.sortAttributes);
    if (partial.autoCompile !== undefined) this.autoCompile.set(partial.autoCompile);
    if (partial.previewDevice !== undefined) this.previewDevice.set(partial.previewDevice);
    if (partial.zoom !== undefined) this.zoom.set(partial.zoom);
    if (partial.sidebarCollapsed !== undefined) this.sidebarCollapsed.set(partial.sidebarCollapsed);
    if (partial.dataCollapsed !== undefined) this.dataCollapsed.set(partial.dataCollapsed);
    if (partial.layout !== undefined) this.layout.set(partial.layout);
    if (partial.panelSizes !== undefined) this.panelSizes.set(partial.panelSizes);
    if (partial.sidebarTab !== undefined) this.sidebarTab.set(partial.sidebarTab);
    if (partial.deviceBeforePdf !== undefined) this.deviceBeforePdf.set(partial.deviceBeforePdf);
    if (partial.jsonView !== undefined) this.jsonView.set(partial.jsonView);
    this.persistence.savePreferences(partial);
  }

  toggleSidebar(): void {
    this.update({ sidebarCollapsed: !this.sidebarCollapsed() });
  }

  toggleData(): void {
    this.update({ dataCollapsed: !this.dataCollapsed() });
  }

  toggleTheme(): void {
    this.update({ theme: this.resolvedTheme() === 'dark' ? 'light' : 'dark' });
  }
}
