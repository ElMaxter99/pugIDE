/** Una línea de un lado de la comparación. `n`: número de línea (desde 1). */
export interface DiffSide { n: number; text: string; }

/**
 * Una fila de la comparación lado a lado. Iguales: los dos lados. Cambio: lo quitado a la izquierda y lo añadido a la
 * derecha, emparejados en orden (si un lado tiene más líneas, el otro queda vacío). `change`: a qué cambio pertenece
 * (0, 1, 2…; null si la línea es igual), para saltar de un cambio a otro.
 */
export interface DiffRow { left: DiffSide | null; right: DiffSide | null; change: number | null; }

export interface SideBySideDiff { rows: DiffRow[]; changes: number; added: number; removed: number; }

/** Por encima de esto (líneas distintas de un lado × las del otro) no se busca la alineación fina: todo el tramo es un cambio. */
const MAX_CELLS = 4_000_000;

/**
 * Comparación línea a línea de dos textos (subsecuencia común más larga), para enseñarlos lado a lado (P-37). Los
 * saltos de línea CRLF se tratan como LF: un archivo que solo cambia en eso no tiene diferencias que enseñar.
 */
export function sideBySideDiff(left: string, right: string): SideBySideDiff {
  const a = left.replace(/\r\n/g, '\n').split('\n');
  const b = right.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

  // Operaciones del tramo central: '=' igual, '-' solo a la izquierda, '+' solo a la derecha.
  const n = endA - start;
  const m = endB - start;
  const ops: ('=' | '-' | '+')[] = [];
  if (n * m > MAX_CELLS) {
    for (let i = 0; i < n; i++) ops.push('-');
    for (let j = 0; j < m; j++) ops.push('+');
  } else {
    const w = m + 1;
    const table = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * w + j] = a[start + i] === b[start + j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[start + i] === b[start + j]) { ops.push('='); i++; j++; }
      else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) { ops.push('-'); i++; }
      else { ops.push('+'); j++; }
    }
    while (i++ < n) ops.push('-');
    while (j++ < m) ops.push('+');
  }

  const rows: DiffRow[] = [];
  let la = 0;
  let lb = 0;
  const same = (count: number): void => { for (let k = 0; k < count; k++) { rows.push({ left: { n: la + 1, text: a[la] }, right: { n: lb + 1, text: b[lb] }, change: null }); la++; lb++; } };
  let changes = 0;
  let added = 0;
  let removed = 0;
  same(start);
  for (let k = 0; k < ops.length;) {
    if (ops[k] === '=') { same(1); k++; continue; }
    let minus = 0;
    let plus = 0;
    while (k < ops.length && ops[k] !== '=') { if (ops[k] === '-') minus++; else plus++; k++; }
    for (let r = 0; r < Math.max(minus, plus); r++) {
      rows.push({
        left: r < minus ? { n: la + 1, text: a[la++] } : null,
        right: r < plus ? { n: lb + 1, text: b[lb++] } : null,
        change: changes,
      });
    }
    changes++;
    added += plus;
    removed += minus;
  }
  same(a.length - endA);
  return { rows, changes, added, removed };
}
