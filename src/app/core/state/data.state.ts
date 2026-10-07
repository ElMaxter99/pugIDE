import { Injectable, signal, computed } from '@angular/core';
import { Dataset, DatasetKind, DatasetsFile, DEFAULT_DATASET_NAME, newDatasetId, uniqueName } from '../utils/datasets.util';
import type { MockLocale } from '../utils/mock-data.util';

@Injectable({ providedIn: 'root' })
export class DataState {
  readonly data = signal<Record<string, unknown>>({});
  private undoStack = signal<Record<string, unknown>[]>([]);
  private redoStack = signal<Record<string, unknown>[]>([]);

  /** Juegos de datos del proyecto. El `data` del activo se sincroniza desde `data` al cambiar/serializar. */
  readonly datasets = signal<Dataset[]>([{ id: 'ds-1', name: DEFAULT_DATASET_NAME, data: {} }]);
  readonly activeId = signal('ds-1');
  readonly locale = signal<MockLocale>('es');
  readonly datasetOptions = computed(() => this.datasets().map((d) => ({ id: d.id, name: d.name })));
  readonly activeDataset = computed(() => this.datasets().find((d) => d.id === this.activeId()) ?? this.datasets()[0]);

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  setData(data: Record<string, unknown>): void {
    this.pushUndo();
    this.data.set(structuredClone(data));
  }

  /** Like setData, but doesn't create an undo step — for project bootstrap/auto-seeding, not user edits. */
  setInitialData(data: Record<string, unknown>): void {
    this.data.set(structuredClone(data));
    this.undoStack.set([]);
    this.redoStack.set([]);
  }

  /** Like setInitialData, but preserves undo/redo history — for silently auto-healing missing paths mid-session. */
  patchMissingData(data: Record<string, unknown>): void {
    this.data.set(structuredClone(data));
  }

  updateValue(path: string, value: unknown): void {
    this.pushUndo();
    const current = structuredClone(this.data());
    this.setNestedValue(current, path, value);
    this.data.set(current);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update((s) => [...s, structuredClone(this.data())]);
    this.data.set(previous);
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update((s) => [...s, structuredClone(this.data())]);
    this.data.set(next);
  }

  private pushUndo(): void {
    this.undoStack.update((s) => [...s.slice(-49), structuredClone(this.data())]);
    this.redoStack.set([]);
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;
  }

  // --- Juegos de datos -------------------------------------------------------

  private synced(): Dataset[] {
    const id = this.activeId();
    const current = this.data();
    return this.datasets().map((d) => (d.id === id ? { ...d, data: structuredClone(current) } : d));
  }

  private loadActive(id: string, list: Dataset[]): void {
    const target = list.find((d) => d.id === id) ?? list[0];
    this.datasets.set(list);
    this.activeId.set(target.id);
    this.data.set(structuredClone(target.data));
    this.undoStack.set([]);
    this.redoStack.set([]);
  }

  switchDataset(id: string): void {
    if (id === this.activeId() || !this.datasets().some((d) => d.id === id)) return;
    this.loadActive(id, this.synced());
  }

  /** Crea un juego de datos (nombre unico) y lo activa. Devuelve su id. */
  addDataset(name: string, data: Record<string, unknown>, seed?: number, kind?: DatasetKind): string {
    const list = this.synced();
    const id = newDatasetId(list);
    const created: Dataset = { id, name: uniqueName(name, list), data: structuredClone(data), ...(seed !== undefined ? { seed } : {}), ...(kind ? { kind } : {}) };
    this.loadActive(id, [...list, created]);
    return id;
  }

  renameDataset(id: string, name: string): void {
    const list = this.synced();
    if (!name.trim()) return;
    this.datasets.set(list.map((d) => (d.id === id ? { ...d, name: uniqueName(name, list, id) } : d)));
  }

  duplicateDataset(id: string): string | null {
    const list = this.synced();
    const src = list.find((d) => d.id === id);
    if (!src) return null;
    return this.addDataset(src.name + ' (copia)', src.data, src.seed, src.kind);
  }

  /** Borra un juego; siempre queda al menos uno. Devuelve false si no se pudo. */
  removeDataset(id: string): boolean {
    const list = this.synced();
    if (list.length <= 1 || !list.some((d) => d.id === id)) return false;
    const idx = list.findIndex((d) => d.id === id);
    const next = list.filter((d) => d.id !== id);
    if (id === this.activeId()) this.loadActive(next[Math.min(idx, next.length - 1)].id, next);
    else this.datasets.set(next);
    return true;
  }

  setSeed(seed: number): void {
    const id = this.activeId();
    this.datasets.update((l) => l.map((d) => (d.id === id ? { ...d, seed } : d)));
  }

  /** Estado completo para persistir/exportar. */
  snapshotDatasets(): DatasetsFile {
    return { version: 1, activeId: this.activeId(), locale: this.locale(), datasets: this.synced() };
  }

  restoreDatasets(file: DatasetsFile): void {
    this.locale.set(file.locale);
    this.loadActive(file.activeId, structuredClone(file.datasets));
  }

  /** Un proyecto nuevo/importado sin juegos propios empieza con uno solo, vacio. */
  resetDatasets(): void {
    this.locale.set('es');
    this.loadActive('ds-1', [{ id: 'ds-1', name: DEFAULT_DATASET_NAME, data: {} }]);
  }
}
