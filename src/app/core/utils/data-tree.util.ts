/** Lógica pura del editor de datos: aplanado del árbol y lectura/escritura del JSON. Sin Angular. */

export interface TreeNode {
  key: string;
  path: string;
  depth: number;
  kind: 'object-open' | 'array-open' | 'object-close' | 'array-close' | 'leaf' | 'inline-array';
  value?: unknown;
  valueType?: string;
  itemCount?: number;
  isExpanded?: boolean;
  inlineItems?: string[];
}

export function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}

/**
 * Filas visibles del árbol de datos: objetos y arrays abren/cierran fila, los arrays de primitivos van en
 * una sola fila y solo se recorren los nodos cuya ruta está en `expanded`.
 */
export function flattenTree(obj: unknown, expanded: ReadonlySet<string>, prefix = '', depth = 0): TreeNode[] {
  const rows: TreeNode[] = [];
  if (obj === null || obj === undefined || typeof obj !== 'object') return rows;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const isArr = Array.isArray(value);
    const isObj = value !== null && typeof value === 'object' && !isArr;
    if (!isObj && !isArr) {
      rows.push({ key, path, depth, kind: 'leaf', value, valueType: getValueType(value) });
      continue;
    }
    if (isArr && (value as unknown[]).every((item) => item === null || typeof item !== 'object')) {
      rows.push({ key, path, depth, kind: 'inline-array', inlineItems: (value as unknown[]).map((item) => (item === null ? 'null' : String(item))) });
      continue;
    }
    const isExp = expanded.has(path);
    rows.push({
      key, path, depth, kind: isArr ? 'array-open' : 'object-open',
      itemCount: isArr ? (value as unknown[]).length : undefined, isExpanded: isExp,
    });
    if (!isExp) continue;
    if (!isArr) {
      rows.push(...flattenTree(value, expanded, path, depth + 1));
      rows.push({ key: '', path, depth, kind: 'object-close' });
      continue;
    }
    (value as unknown[]).forEach((item, i) => {
      const itemPath = `${path}.${i}`;
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        rows.push({ key: String(i), path: itemPath, depth: depth + 1, kind: 'object-open', isExpanded: expanded.has(itemPath) });
        if (expanded.has(itemPath)) {
          rows.push(...flattenTree(item, expanded, itemPath, depth + 2));
          rows.push({ key: '', path: itemPath, depth: depth + 1, kind: 'object-close' });
        }
      } else {
        rows.push({ key: String(i), path: itemPath, depth: depth + 1, kind: 'leaf', value: item, valueType: getValueType(item) });
      }
    });
    rows.push({ key: '', path, depth, kind: 'array-close' });
  }
  return rows;
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
