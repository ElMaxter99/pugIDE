/**
 * Visor de JSON en árbol (P-17): lógica pura. Convierte un valor en un árbol de nodos, lo aplana en filas para pintar
 * (con filtro, «solo sin traducir» y claves que faltan respecto a un idioma de referencia) y localiza cada nodo en el texto.
 */

export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonViewNode {
  key: string;
  /** Identificador estable del nodo (los segmentos de su ruta, escapados). */
  id: string;
  segs: string[];
  kind: JsonKind;
  value?: unknown;
  children?: JsonViewNode[];
  /** `missing`: la clave existe en el idioma de referencia pero no en este archivo. */
  status?: 'missing';
}

export interface JsonRow {
  node: JsonViewNode;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  /** Número de hijos de un objeto o array. */
  count: number | null;
  matchKey: boolean;
  matchValue: boolean;
}

export interface FlattenOptions {
  filter?: string;
  /** Solo hojas sin traducir (texto vacío) o que faltan. */
  onlyPending?: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function idOf(segs: string[]): string {
  return segs.map((s) => s.replace(/\\/g, '\\\\').replace(/\//g, '\\/')).join('/');
}

/** Ruta legible de un nodo: `HOME.TITLE`, `ITEMS.0`. Es la que se usa en `t('HOME.TITLE')`. */
export function pathOf(node: JsonViewNode): string {
  return node.segs.join('.');
}

function kindOf(v: unknown): JsonKind {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object') return 'object';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  return 'boolean';
}

function build(value: unknown, segs: string[], reference: unknown, missing: boolean): JsonViewNode {
  const kind = kindOf(value);
  const node: JsonViewNode = { key: segs[segs.length - 1] ?? '', id: idOf(segs), segs, kind, ...(missing ? { status: 'missing' as const } : {}) };
  if (kind === 'array') {
    node.children = (value as unknown[]).map((v, i) => build(v, [...segs, String(i)], undefined, missing));
  } else if (kind === 'object') {
    const obj = value as Record<string, unknown>;
    const ref = isObj(reference) ? reference : null;
    node.children = Object.keys(obj).map((k) => build(obj[k], [...segs, k], ref?.[k], missing));
    // Claves que el idioma de referencia tiene y este no: filas atenuadas «falta».
    if (ref && !missing) for (const k of Object.keys(ref)) if (!(k in obj)) node.children.push(build(ref[k], [...segs, k], undefined, true));
  } else {
    node.value = value;
  }
  return node;
}

/** Árbol de nodos de un valor (los hijos del objeto o array raíz). `reference`: el mismo archivo de otro idioma. */
export function buildViewTree(value: unknown, reference?: unknown): JsonViewNode[] {
  if (value === null || typeof value !== 'object') return [];
  return build(value, [], reference, false).children ?? [];
}

/** Texto de un valor hoja tal como se ve (los textos, sin comillas). */
export function leafText(node: JsonViewNode): string {
  if (node.kind === 'string') return node.value as string;
  return String(node.value);
}

/** Valor completo de un nodo como JSON con formato. */
export function nodeJson(node: JsonViewNode): string {
  const toValue = (n: JsonViewNode): unknown => {
    if (n.kind === 'array') return (n.children ?? []).filter((c) => c.status !== 'missing').map(toValue);
    if (n.kind === 'object') return Object.fromEntries((n.children ?? []).filter((c) => c.status !== 'missing').map((c) => [c.key, toValue(c)]));
    return n.value;
  };
  return JSON.stringify(toValue(node), null, 2);
}

export const isPending = (n: JsonViewNode): boolean => !n.children && (n.status === 'missing' || (n.kind === 'string' && n.value === ''));

/** Cuántas hojas están sin traducir (vacías) o faltan. */
export function pendingCount(nodes: JsonViewNode[]): number {
  let n = 0;
  for (const node of nodes) n += node.children ? pendingCount(node.children) : isPending(node) ? 1 : 0;
  return n;
}

/** Identificadores de todos los objetos y arrays. */
export function containerIds(nodes: JsonViewNode[], maxDepth = Infinity, depth = 0): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    if (!n.children) continue;
    if (depth >= 0 && depth <= maxDepth) out.push(n.id);
    out.push(...containerIds(n.children, maxDepth, depth + 1));
  }
  return out;
}

export function countNodes(nodes: JsonViewNode[]): number {
  return nodes.reduce((n, node) => n + 1 + (node.children ? countNodes(node.children) : 0), 0);
}

/**
 * Filas visibles. Con filtro (o «solo sin traducir») se quedan las coincidencias con todos sus padres, desplegados;
 * sin filtro se respetan los plegados (`collapsed`). Devuelve también cuántos nodos coinciden con el filtro.
 */
export function flattenView(nodes: JsonViewNode[], collapsed: ReadonlySet<string>, opts: FlattenOptions = {}): { rows: JsonRow[]; matches: number } {
  const q = (opts.filter ?? '').trim().toLowerCase();
  const filtering = q !== '' || !!opts.onlyPending;
  const rows: JsonRow[] = [];
  let matches = 0;

  const textMatch = (n: JsonViewNode): { key: boolean; value: boolean } => ({
    key: q !== '' && n.key.toLowerCase().includes(q),
    value: q !== '' && !n.children && leafText(n).toLowerCase().includes(q),
  });
  const selfOk = (n: JsonViewNode): boolean => {
    if (opts.onlyPending && !n.children && !isPending(n)) return false;
    if (q === '') return opts.onlyPending ? isPending(n) : true;
    const m = textMatch(n);
    return (m.key || m.value) && (!opts.onlyPending || isPending(n) || !!n.children);
  };
  const keep = (n: JsonViewNode): boolean => (n.children ? n.children.some(keep) || (q !== '' && !opts.onlyPending && selfOk(n)) : selfOk(n));

  const walk = (list: JsonViewNode[], depth: number, forced = false): void => {
    for (const n of list) {
      if (filtering && !forced && !keep(n)) continue;
      const hasChildren = !!n.children?.length;
      const expanded = hasChildren && (filtering || !collapsed.has(n.id));
      const m = filtering ? textMatch(n) : { key: false, value: false };
      if (filtering && (m.key || m.value) && (!opts.onlyPending || (!n.children && isPending(n)))) matches++;
      rows.push({ node: n, depth, expanded, hasChildren, count: n.children ? n.children.length : null, matchKey: m.key, matchValue: m.value });
      // Si el nombre de un objeto coincide, se enseña entero.
      if (expanded && n.children) walk(n.children, depth + 1, forced || (!opts.onlyPending && m.key && !!n.children));
    }
  };
  walk(nodes, 0);
  if (opts.onlyPending && q === '') matches = rows.filter((r) => !r.node.children && isPending(r.node)).length;
  return { rows, matches };
}

export type ParsedJson = { ok: true; value: unknown } | { ok: false; message: string; line: number };

/** Lee un JSON; si no es válido, devuelve el mensaje y la línea. */
export function parseJsonText(text: string): ParsedJson {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    const message = (err as Error).message;
    const pos = /position (\d+)/.exec(message);
    const lineCol = /line (\d+)/.exec(message);
    const lines = text.replace(/\s+$/, '').split('\n').length;
    const line = lineCol ? Number(lineCol[1]) : pos ? text.slice(0, Number(pos[1])).split('\n').length : lines;
    return { ok: false, message, line };
  }
}

/** Línea (1-based) en la que empieza cada clave o elemento: `id` del nodo → línea. */
export function jsonLines(text: string): Map<string, number> {
  const map = new Map<string, number>();
  interface Frame { object: boolean; segs: string[]; idx: number; key: string | null; expectKey: boolean }
  const stack: Frame[] = [];
  let line = 1;
  let i = 0;
  const n = text.length;
  const top = (): Frame | undefined => stack[stack.length - 1];
  /** Ruta del valor que empieza ahora, y la registra si hay marco. */
  const startValue = (): string[] | null => {
    const f = top();
    if (!f) return [];
    if (f.object) return f.key === null ? null : [...f.segs, f.key];
    const segs = [...f.segs, String(f.idx)];
    map.set(idOf(segs), line);
    f.idx++;
    return segs;
  };
  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    const f = top();
    if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < n && text[j] !== '"') { if (text[j] === '\\') { s += text[j + 1] ?? ''; j += 2; } else { s += text[j]; j++; } }
      if (f?.object && f.expectKey) { f.key = s; f.expectKey = false; map.set(idOf([...f.segs, s]), line); } else startValue();
      i = j + 1;
      continue;
    }
    if (c === '{' || c === '[') {
      const segs = startValue() ?? [];
      stack.push({ object: c === '{', segs, idx: 0, key: null, expectKey: c === '{' });
      i++;
      continue;
    }
    if (c === '}' || c === ']') { stack.pop(); i++; continue; }
    if (c === ',') { const g = top(); if (g?.object) { g.expectKey = true; g.key = null; } i++; continue; }
    if (c === ':') { i++; continue; }
    // número, true, false, null
    startValue();
    while (i < n && !/[\s,\]}]/.test(text[i])) i++;
  }
  return map;
}

/** Dónde se usa una clave de traducción en las plantillas (`t('HOME.TITLE')`): primera plantilla y línea. */
export function findKeyUsage(files: Map<string, string>, key: string): { path: string; line: number } | null {
  if (!key) return null;
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`['"\`]${esc}['"\`]`);
  for (const [path, content] of files) {
    if (!/\.(pug|jade)$/i.test(path)) continue;
    const lines = content.split('\n');
    for (let l = 0; l < lines.length; l++) if (re.test(lines[l])) return { path, line: l + 1 };
  }
  return null;
}

// --- Vista de un archivo `.json`: árbol o código, recordada por tipo de archivo ---

export type JsonViewMode = 'tree' | 'code';
/** `translations`: archivos de idioma (`/locales/<código>/translations.json`); `other`: el resto de los `.json`. */
export interface JsonViewPrefs { translations: JsonViewMode; other: JsonViewMode }
export const DEFAULT_JSON_VIEW: JsonViewPrefs = { translations: 'tree', other: 'code' };

export const isJsonPath = (path: string): boolean => /\.json$/i.test(path);
export const isLocaleFile = (path: string): boolean => /^\/locales\/[^/]+\/translations\.json$/.test(path);

/** Qué vista se usa para un archivo (null si no es un `.json`). */
export function jsonViewModeFor(path: string, prefs: JsonViewPrefs): JsonViewMode | null {
  if (!isJsonPath(path)) return null;
  return isLocaleFile(path) ? prefs.translations : prefs.other;
}

/** Lo guardado en las preferencias, con lo no válido vuelto a su valor de partida. */
export function sanitizeJsonView(v: unknown): JsonViewPrefs {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const mode = (x: unknown, d: JsonViewMode): JsonViewMode => (x === 'tree' || x === 'code' ? x : d);
  return { translations: mode(o['translations'], DEFAULT_JSON_VIEW.translations), other: mode(o['other'], DEFAULT_JSON_VIEW.other) };
}

/** Parte un texto en trozos para marcar lo que coincide con el filtro (sin distinguir mayúsculas). */
export function highlightMatches(text: string, q: string): { text: string; match: boolean }[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [{ text, match: false }];
  const out: { text: string; match: boolean }[] = [];
  const lower = text.toLowerCase();
  let at = 0;
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, at)) {
    if (i > at) out.push({ text: text.slice(at, i), match: false });
    out.push({ text: text.slice(i, i + needle.length), match: true });
    at = i + needle.length;
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false });
  return out.length ? out : [{ text, match: false }];
}
