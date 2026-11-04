import { Injectable, signal, computed } from '@angular/core';
import { Diagnostic, groupDiagnostics } from '../utils/diagnostics.util';

/** Problemas de la última compilación, localizados por archivo para el editor. */
@Injectable({ providedIn: 'root' })
export class DiagnosticsState {
  readonly diagnostics = signal<Diagnostic[]>([]);
  readonly byPath = computed(() => groupDiagnostics(this.diagnostics()));

  private cursor = -1;

  set(list: Diagnostic[]): void {
    this.diagnostics.set(list);
    this.cursor = -1;
  }

  /** Siguiente (1) o anterior (-1) problema del proyecto, dando la vuelta; `null` si no hay ninguno. */
  step(direction: 1 | -1): Diagnostic | null {
    const list = this.diagnostics();
    if (list.length === 0) return null;
    this.cursor = this.cursor < 0 ? (direction === 1 ? 0 : list.length - 1) : (this.cursor + direction + list.length) % list.length;
    return list[this.cursor];
  }

  clear(): void {
    this.cursor = -1;
    if (this.diagnostics().length) this.diagnostics.set([]);
  }
}
