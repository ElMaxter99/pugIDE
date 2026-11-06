import { Injectable, signal, computed } from '@angular/core';
import { TerminalEntry } from '../models/index';

@Injectable({ providedIn: 'root' })
export class TerminalState {
  readonly entries = signal<TerminalEntry[]>([]);
  readonly isVisible = signal(true);
  readonly isMaximized = signal(false);
  /** «Esenciales» oculta los mensajes de detalle; «Todo» los muestra atenuados. */
  readonly activeFilter = signal<'essential' | 'all'>('essential');

  readonly filteredEntries = computed(() => {
    const all = this.entries();
    if (this.activeFilter() === 'all') return all;
    return all.filter((e) => !e.detail);
  });

  readonly hiddenDetailCount = computed(() =>
    this.activeFilter() === 'all' ? 0 : this.entries().filter((e) => e.detail).length
  );

  readonly errorCount = computed(() =>
    this.entries().filter((e) => e.type === 'error').length
  );

  readonly warningCount = computed(() =>
    this.entries().filter((e) => e.type === 'warning').length
  );

  addEntry(type: TerminalEntry['type'], source: string, message: string, loc?: { path: string; line: number }, detail = false): void {
    const entry: TerminalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      source,
      message,
      ...(detail ? { detail: true } : {}),
      ...(loc ? { path: loc.path, line: loc.line } : {}),
    };
    this.entries.update((entries) => [...entries.slice(-999), entry]);
  }

  clear(): void {
    this.entries.set([]);
  }

  toggle(): void {
    this.isVisible.update((v) => !v);
  }

  toggleMaximized(): void {
    this.isMaximized.update((v) => !v);
  }

  setFilter(filter: 'essential' | 'all'): void {
    this.activeFilter.set(filter);
  }
}
