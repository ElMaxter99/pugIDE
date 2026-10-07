/**
 * Infiere la forma de los datos a partir de un JSON de ejemplo, un JSON Schema o un OpenAPI sencillo.
 * Soporta `$ref` locales (`#/...`), `allOf`, `oneOf`/`anyOf` (primera opcion), `enum`, `const`,
 * `default`/`example`, `format` y `type` como lista. Puro y sin red.
 */
import { createRng, mockFormat, mockValue, MockLocale } from './mock-data.util';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

export type InferSource = 'sample' | 'json-schema' | 'openapi';

export interface InferOptions {
  /** Rellena con valores de ejemplo por nombre/formato; si no, valores vacios tipados. */
  fill?: boolean;
  seed?: number | string;
  locale?: MockLocale;
  /** Elementos por array (por defecto 1 vacio o 2 con `fill`). */
  arrayLength?: number;
}

export interface InferResult {
  source: InferSource;
  data: Obj;
  /** Avisos (referencias no resueltas, ciclos...). */
  warnings: string[];
}

const MAX_DEPTH = 12;

/** Detecta si un documento parece JSON Schema u OpenAPI en lugar de datos de ejemplo. */
export function detectSource(doc: unknown): InferSource {
  if (!isObj(doc)) return 'sample';
  if (typeof doc['openapi'] === 'string' || typeof doc['swagger'] === 'string') return 'openapi';
  const schemaKeys = ['$schema', '$defs', 'definitions', 'properties', 'allOf', 'oneOf', 'anyOf', '$ref'];
  const looksSchema = schemaKeys.some((k) => k in doc) || (typeof doc['type'] === 'string' && ['object', 'array'].includes(doc['type'] as string));
  if (!looksSchema) return 'sample';
  // Un dato de ejemplo con una clave "properties" que sea un objeto de valores no es un schema; exigimos forma de schema.
  if ('properties' in doc && !isObj(doc['properties'])) return 'sample';
  if (typeof doc['type'] === 'string' || '$schema' in doc || '$ref' in doc || 'allOf' in doc || 'oneOf' in doc || 'anyOf' in doc || '$defs' in doc || 'definitions' in doc) return 'json-schema';
  return 'sample';
}

/** Resuelve un puntero local `#/a/b` dentro de `root`. */
export function resolveRef(root: unknown, ref: string): unknown {
  if (!ref.startsWith('#')) return undefined;
  let node: unknown = root;
  for (const raw of ref.slice(1).split('/').filter((s) => s !== '')) {
    const key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isObj(node) && !Array.isArray(node)) return undefined;
    node = (node as Obj)[key];
  }
  return node;
}

/** Forma de un JSON de ejemplo: objetos tal cual, un array en la raiz va bajo `items`. */
export function inferFromSample(sample: unknown): Obj {
  if (Array.isArray(sample)) return { items: sample };
  if (isObj(sample)) return structuredClone(sample);
  return { value: sample };
}

class SchemaWalker {
  readonly warnings: string[] = [];
  constructor(private root: unknown, private opts: InferOptions) {}

  /** Une `allOf` y sigue `$ref` hasta tener un schema "plano". */
  private flatten(schema: unknown, stack: string[]): Obj | null {
    if (!isObj(schema)) return null;
    let cur: Obj = schema;
    const seenHere = [...stack];
    while (typeof cur['$ref'] === 'string') {
      const ref = cur['$ref'] as string;
      if (seenHere.includes(ref)) { this.warn(`Referencia circular: ${ref}`); return null; }
      seenHere.push(ref);
      const target = resolveRef(this.root, ref);
      if (!isObj(target)) { this.warn(`No se pudo resolver ${ref}`); return null; }
      cur = { ...target, ...Object.fromEntries(Object.entries(cur).filter(([k]) => k !== '$ref')) };
    }
    if (Array.isArray(cur['allOf'])) {
      const { allOf, ...rest } = cur;
      let merged: Obj = { ...rest };
      for (const part of allOf as unknown[]) {
        const flat = this.flatten(part, seenHere);
        if (!flat) continue;
        const props = { ...(isObj(merged['properties']) ? merged['properties'] : {}), ...(isObj(flat['properties']) ? flat['properties'] : {}) };
        const required = [...new Set([...(Array.isArray(merged['required']) ? merged['required'] : []), ...(Array.isArray(flat['required']) ? flat['required'] : [])])];
        merged = { ...flat, ...merged, ...(Object.keys(props).length ? { properties: props } : {}), ...(required.length ? { required } : {}) };
      }
      cur = merged;
    }
    for (const key of ['oneOf', 'anyOf'] as const) {
      const opts = cur[key];
      if (Array.isArray(opts) && opts.length > 0) {
        const { oneOf: _o, anyOf: _a, ...rest } = cur;
        const nonNull = (opts as unknown[]).find((o) => !(isObj(o) && o['type'] === 'null')) ?? opts[0];
        const flat = this.flatten(nonNull, seenHere);
        cur = { ...(flat ?? {}), ...rest };
      }
    }
    return cur;
  }

  private warn(msg: string): void {
    if (!this.warnings.includes(msg)) this.warnings.push(msg);
  }

  private typeOf(s: Obj): string {
    const t = s['type'];
    if (Array.isArray(t)) return (t.find((x) => x !== 'null') as string | undefined) ?? 'null';
    if (typeof t === 'string') return t;
    if (isObj(s['properties'])) return 'object';
    if (s['items'] !== undefined) return 'array';
    if (Array.isArray(s['enum'])) return typeof (s['enum'] as unknown[])[0];
    return 'string';
  }

  value(schemaIn: unknown, name: string, path: string, stack: string[], depth: number): unknown {
    const refStack = typeof (schemaIn as Obj)?.['$ref'] === 'string' ? [...stack, (schemaIn as Obj)['$ref'] as string] : stack;
    const s = this.flatten(schemaIn, stack);
    if (!s || depth > MAX_DEPTH) return null;
    if ('const' in s) return s['const'];
    if (Array.isArray(s['enum']) && (s['enum'] as unknown[]).length > 0) {
      const list = s['enum'] as unknown[];
      return this.opts.fill ? list[Math.floor(createRng(`${this.opts.seed ?? 1}:${path}`)() * list.length)] : list[0];
    }
    if ('default' in s) return structuredClone(s['default']);
    if ('example' in s) return structuredClone(s['example']);
    if (Array.isArray(s['examples']) && s['examples'].length > 0) return structuredClone(s['examples'][0]);

    const type = this.typeOf(s);
    const fill = !!this.opts.fill;
    const locale = this.opts.locale ?? 'es';
    const rng = createRng(`${this.opts.seed ?? 1}:${path}`);
    switch (type) {
      case 'object': {
        const out: Obj = {};
        const props = isObj(s['properties']) ? s['properties'] : {};
        for (const [k, v] of Object.entries(props)) out[k] = this.value(v, k, path ? `${path}.${k}` : k, refStack, depth + 1);
        return out;
      }
      case 'array': {
        const min = typeof s['minItems'] === 'number' ? (s['minItems'] as number) : 0;
        const n = Math.max(min, this.opts.arrayLength ?? (fill ? 2 : 1));
        const cap = typeof s['maxItems'] === 'number' ? Math.min(n, s['maxItems'] as number) : n;
        const items = s['items'];
        // Un elemento circular se omite: el array queda vacio en vez de [null].
        return Array.from({ length: cap }, (_, i) => this.value(items ?? {}, singular(name), `${path}.${i}`, refStack, depth + 1)).filter((x) => x !== null);
      }
      case 'integer': case 'number': {
        const lo = typeof s['minimum'] === 'number' ? (s['minimum'] as number) : undefined;
        const hi = typeof s['maximum'] === 'number' ? (s['maximum'] as number) : undefined;
        let v: number = fill ? (mockValue(name, { rng, locale, hint: 'number', path }) as number) : lo ?? 0;
        if (typeof v !== 'number') v = 0;
        if (lo !== undefined && v < lo) v = lo;
        if (hi !== undefined && v > hi) v = hi;
        return type === 'integer' ? Math.round(v) : v;
      }
      case 'boolean': return fill ? rng() < 0.6 : false;
      case 'null': return null;
      default: {
        const format = typeof s['format'] === 'string' ? (s['format'] as string) : '';
        if (fill) {
          const byFormat = format ? mockFormat(format, rng, locale) : undefined;
          if (byFormat !== undefined) return byFormat;
          const v = mockValue(name, { rng, locale, hint: 'string', path });
          return typeof v === 'string' ? v : String(v);
        }
        return '';
      }
    }
  }
}

function singular(name: string): string {
  if (/ies$/i.test(name) && name.length > 4) return name.slice(0, -3) + 'y';
  if (/s$/i.test(name) && name.length > 3) return name.slice(0, -1);
  return name;
}

/** Instancia (datos) a partir de un JSON Schema. Si la raiz no es objeto, se coloca bajo `value`. */
export function inferFromJsonSchema(schema: unknown, opts: InferOptions = {}): InferResult {
  const w = new SchemaWalker(schema, opts);
  let v = w.value(schema, 'root', '', [], 0);
  if (!isObj(v)) v = Array.isArray(v) ? { items: v } : { value: v };
  return { source: 'json-schema', data: v as Obj, warnings: w.warnings };
}

/** OpenAPI 3.x / Swagger 2: una clave por schema de `components.schemas` (o `definitions`). */
export function inferFromOpenApi(doc: Obj, opts: InferOptions = {}): InferResult {
  const components = isObj(doc['components']) ? doc['components'] : {};
  const schemas = (isObj(components['schemas']) ? components['schemas'] : isObj(doc['definitions']) ? doc['definitions'] : {}) as Obj;
  const base = isObj(components['schemas']) ? '#/components/schemas/' : '#/definitions/';
  const w = new SchemaWalker(doc, opts);
  const data: Obj = {};
  for (const name of Object.keys(schemas)) {
    const key = name.charAt(0).toLowerCase() + name.slice(1);
    data[key] = w.value({ $ref: base + name.replace(/~/g, '~0').replace(/\//g, '~1') }, key, key, [], 0);
  }
  if (Object.keys(data).length === 0) w.warnings.push('El documento OpenAPI no tiene schemas en components.schemas');
  return { source: 'openapi', data, warnings: w.warnings };
}

/** Punto de entrada: detecta el tipo de documento y devuelve los datos inferidos. */
export function inferData(doc: unknown, opts: InferOptions = {}): InferResult {
  const source = detectSource(doc);
  if (source === 'openapi') return inferFromOpenApi(doc as Obj, opts);
  if (source === 'json-schema') return inferFromJsonSchema(doc, opts);
  return { source, data: inferFromSample(doc), warnings: [] };
}
