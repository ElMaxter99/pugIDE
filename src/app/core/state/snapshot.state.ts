import { Injectable, computed, signal } from '@angular/core';
import type { SnapshotMeta } from '../models/project-snapshot.model';
import { MAX_SNAPSHOTS, oldestSnapshot } from '../utils/snapshot.util';

/** Instantáneas guardadas del proyecto activo (la más reciente primero). Las rellena `OrchestratorService.refreshSnapshots`. */
@Injectable({ providedIn: 'root' })
export class SnapshotState {
  readonly items = signal<SnapshotMeta[]>([]);
  readonly loading = signal(false);

  readonly count = computed(() => this.items().length);
  readonly totalBytes = computed(() => this.items().reduce((sum, s) => sum + s.bytes, 0));
  /** Se llegó al tope: guardar otra elimina la más antigua. */
  readonly isFull = computed(() => this.count() >= MAX_SNAPSHOTS);
  readonly oldest = computed(() => oldestSnapshot(this.items()));
}
