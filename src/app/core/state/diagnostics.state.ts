import { Injectable, signal, computed } from '@angular/core';
import { Diagnostic, ProblemRow, UnlocatedProblem, countProblems, groupDiagnostics, stepRow, toProblemRows } from '../utils/diagnostics.util';

/** Problemas de la última compilación, localizados por archivo para el editor y listados en el panel «Problemas». */
@Injectable({ providedIn: 'root' })
export class DiagnosticsState {
  readonly diagnostics = signal<Diagnostic[]>([]);
  /** Errores de compilación que no se pueden situar en un archivo (se listan en «Problemas», sin marcador en el editor). */
  readonly unlocated = signal<UnlocatedProblem[]>([]);
  readonly byPath = computed(() => groupDiagnostics(this.diagnostics()));

  /** Todos los problemas del proyecto (localizados y sin ubicación) como filas del panel. */
  readonly rows = computed<ProblemRow[]>(() => toProblemRows(this.diagnostics(), this.unlocated()));
  readonly counts = computed(() => countProblems(this.rows()));
  /** Fila resaltada en el panel (la última a la que se saltó). */
  readonly selectedId = signal<string | null>(null);

  set(list: Diagnostic[], unlocated: UnlocatedProblem[] = []): void {
    this.diagnostics.set(list);
    this.unlocated.set(unlocated);
    this.selectedId.set(null);
  }

  /** Siguiente (1) o anterior (-1) problema localizado del proyecto, dando la vuelta; `null` si no hay ninguno. */
  step(direction: 1 | -1): Diagnostic | null {
    const located = this.rows().filter((r) => r.path && r.line);
    const row = stepRow(located, this.selectedId(), direction);
    if (!row) return null;
    this.selectedId.set(row.id);
    return this.diagnostics()[Number(row.id.slice(1))] ?? null;
  }

  clear(): void {
    this.selectedId.set(null);
    if (this.diagnostics().length) this.diagnostics.set([]);
    if (this.unlocated().length) this.unlocated.set([]);
  }
}
