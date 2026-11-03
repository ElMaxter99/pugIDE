/** Historial local por archivo: reglas de las versiones guardadas y diff de líneas. Sin Angular ni DOM. */

export interface FileVersion {
  /** Marca de tiempo (ms). */
  at: number;
  content: string;
  /** Por qué se guardó: `guardado`, `automático`, `inicial`, `antes de restaurar`… */
  reason: string;
}

export const MAX_VERSIONS = 30;
/** Un archivo más grande no se versiona (el historial vive en IndexedDB del navegador). */
export const MAX_VERSION_CHARS = 512 * 1024;
/** Entre dos versiones automáticas debe pasar al menos esto. */
export const AUTO_GAP_MS = 3 * 60 * 1000;

export interface AddVersionOptions {
  /** Versión automática: respeta `AUTO_GAP_MS`. */
  auto?: boolean;
}

/**
 * Añade una versión a la lista (la más reciente primero). Devuelve la lista nueva o `null` si no hay nada que
 * guardar: contenido igual al de la última versión, demasiado grande o automática demasiado pronto.
 */
export function addVersion(list: readonly FileVersion[], next: FileVersion, opts: AddVersionOptions = {}): FileVersion[] | null {
  if (next.content.length > MAX_VERSION_CHARS) return null;
  const latest = list[0];
  if (latest && latest.content === next.content) return null;
  if (opts.auto && latest && next.at - latest.at < AUTO_GAP_MS) return null;
  return [next, ...list].slice(0, MAX_VERSIONS);
}

export type DiffOp =
  | { type: 'same' | 'add' | 'del'; text: string }
  | { type: 'skip'; count: number };

const MAX_DP_CELLS = 4_000_000;

/** Diff por líneas (LCS). `a` es la versión vieja y `b` la nueva. */
export function diffLines(a: string, b: string): DiffOp[] {
  const x = a.split('\n');
  const y = b.split('\n');
  let start = 0;
  while (start < x.length && start < y.length && x[start] === y[start]) start++;
  let endX = x.length;
  let endY = y.length;
  while (endX > start && endY > start && x[endX - 1] === y[endY - 1]) { endX--; endY--; }

  const out: DiffOp[] = x.slice(0, start).map((text) => ({ type: 'same', text }));
  const mx = x.slice(start, endX);
  const my = y.slice(start, endY);
  if (mx.length * my.length > MAX_DP_CELLS) {
    // Demasiado grande para la tabla: se muestra el tramo central entero como cambiado.
    out.push(...mx.map((text): DiffOp => ({ type: 'del', text })), ...my.map((text): DiffOp => ({ type: 'add', text })));
  } else {
    out.push(...lcsDiff(mx, my));
  }
  out.push(...x.slice(endX).map((text): DiffOp => ({ type: 'same', text })));
  return out;
}

function lcsDiff(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const w = m + 1;
  const t = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: 'same', text: a[i] }); i++; j++; }
    else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) { out.push({ type: 'del', text: a[i++] }); }
    else { out.push({ type: 'add', text: b[j++] }); }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}

export function summarizeDiff(ops: readonly DiffOp[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === 'add') added++;
    else if (op.type === 'del') removed++;
  }
  return { added, removed };
}

/** Pliega los tramos largos sin cambios dejando `context` líneas alrededor de cada cambio. */
export function foldContext(ops: readonly DiffOp[], context = 2): DiffOp[] {
  const keep = new Array<boolean>(ops.length).fill(false);
  ops.forEach((op, i) => {
    if (op.type === 'same') return;
    for (let k = Math.max(0, i - context); k <= Math.min(ops.length - 1, i + context); k++) keep[k] = true;
  });
  const out: DiffOp[] = [];
  let hidden = 0;
  ops.forEach((op, i) => {
    if (keep[i]) {
      if (hidden) { out.push({ type: 'skip', count: hidden }); hidden = 0; }
      out.push(op);
    } else {
      hidden++;
    }
  });
  if (hidden) out.push({ type: 'skip', count: hidden });
  return out;
}

/** «hace 5 min», «hace 2 h», «hace 3 d» o la fecha si pasó más de una semana. */
export function formatAgo(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'hace unos segundos';
  const min = Math.round(s / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 8) return `hace ${d} d`;
  return new Date(at).toLocaleDateString('es-ES');
}
