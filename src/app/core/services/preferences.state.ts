import { Injectable, signal, computed } from '@angular/core';
import { AppPreferences } from '../models/index';
import { PersistenceService } from './persistence.service';

@Injectable({ providedIn: 'root' })
export class PreferencesState {
  readonly theme = signal<'dark' | 'light'>('dark');
  readonly fontSize = signal(14);
  readonly tabSize = signal(2);
  readonly minimap = signal(true);
  readonly wordWrap = signal(false);
  readonly formatOnSave = signal(true);
  readonly autoCompile = signal(true);
  readonly previewDevice = signal('Desktop');
  readonly zoom = signal(100);
  readonly monacoTheme = computed(() =>
    this.theme() === 'dark' ? 'vs-dark' : 'vs-light'
  );

  constructor(private persistence: PersistenceService) {
    this.load();
  }

  load(): void {
    const prefs = this.persistence.loadPreferences();
    this.theme.set(prefs.theme);
    this.fontSize.set(prefs.fontSize);
    this.tabSize.set(prefs.tabSize);
    this.minimap.set(prefs.minimap);
    this.wordWrap.set(prefs.wordWrap);
    this.formatOnSave.set(prefs.formatOnSave);
    this.autoCompile.set(prefs.autoCompile);
    this.previewDevice.set(prefs.previewDevice);
    this.zoom.set(prefs.zoom);
  }

  update(partial: Partial<AppPreferences>): void {
    if (partial.theme !== undefined) this.theme.set(partial.theme);
    if (partial.fontSize !== undefined) this.fontSize.set(partial.fontSize);
    if (partial.tabSize !== undefined) this.tabSize.set(partial.tabSize);
    if (partial.minimap !== undefined) this.minimap.set(partial.minimap);
    if (partial.wordWrap !== undefined) this.wordWrap.set(partial.wordWrap);
    if (partial.formatOnSave !== undefined) this.formatOnSave.set(partial.formatOnSave);
    if (partial.autoCompile !== undefined) this.autoCompile.set(partial.autoCompile);
    if (partial.previewDevice !== undefined) this.previewDevice.set(partial.previewDevice);
    if (partial.zoom !== undefined) this.zoom.set(partial.zoom);
    this.persistence.savePreferences(partial);
  }

  toggleTheme(): void {
    this.update({ theme: this.theme() === 'dark' ? 'light' : 'dark' });
  }
}
