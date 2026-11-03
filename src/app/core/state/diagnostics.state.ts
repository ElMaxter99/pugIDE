import { Injectable, signal, computed } from '@angular/core';
import { Diagnostic, groupDiagnostics } from '../utils/diagnostics.util';

/** Problemas de la última compilación, localizados por archivo para el editor. */
@Injectable({ providedIn: 'root' })
export class DiagnosticsState {
  readonly diagnostics = signal<Diagnostic[]>([]);
  readonly byPath = computed(() => groupDiagnostics(this.diagnostics()));

  set(list: Diagnostic[]): void {
    this.diagnostics.set(list);
  }

  clear(): void {
    if (this.diagnostics().length) this.diagnostics.set([]);
  }
}
