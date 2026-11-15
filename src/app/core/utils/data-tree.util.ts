/** Lógica pura del editor de datos: filas de la tabla CLAVE / VALOR, búsqueda y lectura/escritura del JSON. Sin Angular. */

export function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

export type ParsedDataJson = { ok: true; value: Record<string, unknown> } | { ok: false; error: string; rootNotObject?: boolean };

/** Lee el JSON del modo texto: la raíz debe ser un objeto. */
export function parseDataJson(text: string): ParsedDataJson {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Root must be a JSON object', rootNotObject: true };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}

export function stringifyData(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Inserta una sangría de dos espacios en la selección; devuelve el texto nuevo y dónde queda el cursor. */
export function insertIndent(value: string, start: number, end: number): { value: string; cursor: number } {
  return { value: value.substring(0, start) + '  ' + value.substring(end), cursor: start + 2 };
}

// ---- Tabla CLAVE / VALOR de los datos (P-38), como la de los archivos de traducciones ----

/** Una fila de la tabla: un grupo (objeto o lista, con cuántos elementos tiene) o un valor. */
export interface DataRow {
  key: string;
  /** Ruta con puntos; los elementos de una lista usan su índice (`usuarios.0.email`). */
  path: string;
  depth: number;
  kind: 'group' | 'leaf';
  /** Grupos: `{4}` para un objeto, `[3]` para una lista. */
  count?: string;
  open?: boolean;
  value?: unknown;
  valueType?: string;
  /** Coincide con el filtro (la clave o el valor). */
  hit?: boolean;
  /** Clave de primer nivel que la plantilla no lee. */
  unused?: boolean;
}

export interface DataTable {
  rows: DataRow[];
  /** Valores (hojas) que hay en total y cuántos coinciden con el filtro (igual al total si no hay filtro). */
  total: number;
  matches: number;
  /** Rutas de todos los grupos, para «Expandir todo». */
  groups: string[];
}

/** Minúsculas y sin tildes, para buscar («Dirección» se encuentra con «direccion»). */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Dónde está `query` en `text` buscando sin tildes ni mayúsculas, en posiciones del texto ORIGINAL (al quitar las
 * tildes, «í» pasa de un carácter a dos y las posiciones del texto plegado no valen para seleccionar). Desde `from`;
 * si no hay más, vuelve a empezar. null si no aparece.
 */
export function findFolded(text: string, query: string, from = 0): { start: number; end: number } | null {
  const q = foldText(query);
  if (!q) return null;
  let folded = '';
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = foldText(text[i]);
    for (let k = 0; k < f.length; k++) origin.push(i);
    folded += f;
  }
  origin.push(text.length);
  const fromFolded = origin.findIndex((o) => o >= from);
  let at = folded.indexOf(q, Math.max(0, fromFolded));
  if (at < 0) at = folded.indexOf(q);
  if (at < 0) return null;
  return { start: origin[at], end: origin[at + q.length - 1] + 1 };
}

/**
 * Filas de la tabla de datos. Sin filtro, se enseñan los grupos de `expanded`. Con filtro, solo las filas que
 * coinciden (en la clave o en el valor) y sus grupos, abiertos; un grupo cuya clave coincide enseña todo lo suyo.
 */
export function dataTable(data: unknown, expanded: ReadonlySet<string>, filter = '', unusedRoots: readonly string[] = []): DataTable {
  const needle = foldText(filter.trim());
  const unused = new Set(unusedRoots);
  const groups: string[] = [];
  let total = 0;
  let matches = 0;

  const walk = (node: unknown, prefix: string, depth: number, inherited: boolean): { rows: DataRow[]; any: boolean } => {
    const rows: DataRow[] = [];
    let any = false;
    const entries = Array.isArray(node) ? node.map((v, i) => [String(i), v] as const) : Object.entries(node as Record<string, unknown>);
    for (const [key, value] of entries) {
      const path = prefix ? `${prefix}.${key}` : key;
      const keyHit = !!needle && foldText(key).includes(needle);
      const isGroup = value !== null && typeof value === 'object';
      const flag = depth === 0 && unused.has(key) ? { unused: true } : {};
      if (!isGroup) {
        total++;
        const hit = !!needle && (keyHit || foldText(value === null || value === undefined ? 'null' : String(value)).includes(needle));
        if (needle && !hit && !inherited) continue;
        if (!needle || hit) matches++;
        any ||= hit;
        rows.push({ key, path, depth, kind: 'leaf', value, valueType: getValueType(value), ...(hit ? { hit: true } : {}), ...flag });
        continue;
      }
      groups.push(path);
      const size = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value as object).length}}`;
      const child = walk(value, path, depth + 1, inherited || keyHit);
      if (needle) {
        if (!keyHit && !child.any && !inherited) continue;
        any ||= keyHit || child.any;
        rows.push({ key, path, depth, kind: 'group', count: size, open: true, ...(keyHit ? { hit: true } : {}), ...flag }, ...child.rows);
      } else {
        const open = expanded.has(path);
        rows.push({ key, path, depth, kind: 'group', count: size, open, ...flag });
        if (open) rows.push(...child.rows);
      }
    }
    return { rows, any };
  };

  const rows = data !== null && typeof data === 'object' ? walk(data, '', 0, false).rows : [];
  return { rows, total, matches: needle ? matches : total, groups };
}
