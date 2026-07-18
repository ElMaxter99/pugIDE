import { Injectable, signal, computed } from '@angular/core';
import { TerminalEntry } from '../models/index';

@Injectable({ providedIn: 'root' })
export class TerminalState {
  readonly entries = signal<TerminalEntry[]>([]);
  readonly isVisible = signal(true);
  readonly activeFilter = signal<'all' | 'error' | 'warning' | 'info' | 'success' | 'debug'>('all');

  readonly filteredEntries = computed(() => {
    const filter = this.activeFilter();
    const all = this.entries();
    if (filter === 'all') return all;
    return all.filter((e) => e.type === filter);
  });

  readonly errorCount = computed(() =>
    this.entries().filter((e) => e.type === 'error').length
  );

  readonly warningCount = computed(() =>
    this.entries().filter((e) => e.type === 'warning').length
  );

  addEntry(type: TerminalEntry['type'], source: string, message: string): void {
    const entry: TerminalEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      source,
      message,
    };
    this.entries.update((entries) => [...entries.slice(-999), entry]);
  }

  clear(): void {
    this.entries.set([]);
  }

  toggle(): void {
    this.isVisible.update((v) => !v);
  }

  setFilter(filter: TerminalEntry['type'] | 'all'): void {
    this.activeFilter.set(filter);
  }
}
