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

  /** Errores y avisos esenciales del Registro (los de compilación viven en «Problemas» y son detalle aquí). */
  readonly essentialIssueCount = computed(() =>
    this.entries().filter((e) => !e.detail && (e.type === 'error' || e.type === 'warning')).length
  );

  /** Pestaña visible del panel inferior: «Problemas» (por defecto) o «Registro». */
  readonly activeTab = signal<'problems' | 'log'>('problems');
  /** Cada cambio pide al panel inferior que lleve el foco a su pestaña activa (p. ej. «Ver» en la franja del preview). */
  readonly focusRequest = signal(0);

  /** Abre el panel inferior en «Problemas»; con `focus` lleva el foco allí. */
  openProblems(focus = true): void {
    this.activeTab.set('problems');
    this.isVisible.set(true);
    if (focus) this.focusRequest.update((n) => n + 1);
  }

  /** Abre el panel inferior en «Registro». */
  openLog(): void {
    this.activeTab.set('log');
    this.isVisible.set(true);
  }

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
