/**
 * OpenAPI → datos de una operación (P-43). En vez de una clave por cada esquema del documento, se elige la operación
 * (`GET /facturas/{id}`) y su respuesta, y el juego de datos sale con la forma exacta de lo que la plantilla recibe.
 * Puro y sin red: solo se lee el documento que la persona elige; nunca se llama a la API.
 */
import { InferOptions, inferFromSchemaWithin, resolveRef } from './schema-infer.util';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

export interface OpenApiResponse {
  /** `200|application/json`: identifica la respuesta dentro de la operación. */
  key: string;
  status: string;
  media: string;
  /** `200 · application/json · Factura`. */
  label: string;
  schema?: unknown;
  example?: unknown;
  hasExample: boolean;
}

export interface OpenApiOperation {
  id: string;
  method: string;
  path: string;
  summary: string;
  tag: string;
  responses: OpenApiResponse[];
  /** Índice de la respuesta propuesta (la primera 2xx con JSON), o -1 si no hay ninguna. */
  defaultResponse: number;
  /** Por qué no sirve (sin respuesta con datos, no es JSON…); null si sirve. */
  unusable: string | null;
}

export interface OpenApiSummary { title: string; version: string; operations: number; schemas: number }

const isJson = (media: string): boolean => /json/i.test(media) && !/problem/i.test(media);

/** YAML: la librería se carga solo cuando hace falta (la mayoría de los archivos son JSON). */
const parseYaml = async (text: string): Promise<unknown> => (await import('yaml')).parse(text);

/** Texto de un `.json`, `.yaml` o `.yml` (un OpenAPI en YAML con otra extensión también se lee). */
export async function parseDocumentText(text: string, fileName: string): Promise<unknown> {
  const clean = text.replace(/^\uFEFF/, '');
  if (/\.ya?ml$/i.test(fileName)) return parseYaml(clean);
  try {
    return JSON.parse(clean);
  } catch (err) {
    if (/^\s*(openapi|swagger)\s*:/m.test(clean)) return parseYaml(clean);
    throw err;
  }
}

const deref = (doc: unknown, node: unknown): unknown => (isObj(node) && typeof node['$ref'] === 'string' ? resolveRef(doc, node['$ref'] as string) : node);

function schemaName(doc: unknown, schema: unknown): string {
  if (!isObj(schema)) return 'datos';
  const ref = schema['$ref'];
  if (typeof ref === 'string') return ref.split('/').pop() ?? 'objeto';
  if (schema['type'] === 'array') return `lista de ${schemaName(doc, schema['items'])}`;
  if (schema['type'] === 'object' || isObj(schema['properties'])) return 'objeto';
  return typeof schema['type'] === 'string' ? (schema['type'] as string) : 'objeto';
}

function firstExample(doc: unknown, media: Obj): unknown {
  if ('example' in media) return media['example'];
  const list = media['examples'];
  if (isObj(list)) {
    const first = Object.values(list)[0];
    const hit = deref(doc, first);
    if (isObj(hit) && 'value' in hit) return hit['value'];
  }
  return undefined;
}

function responsesOf(doc: unknown, op: Obj, produces: string[]): { list: OpenApiResponse[]; skipped: string | null } {
  const list: OpenApiResponse[] = [];
  let skipped: string | null = null;
  const raw = isObj(op['responses']) ? op['responses'] : {};
  for (const [status, value] of Object.entries(raw)) {
    const resp = deref(doc, value);
    if (!isObj(resp)) continue;
    const content = isObj(resp['content']) ? resp['content'] : null;
    if (content) {
      const medias = Object.keys(content);
      const jsons = medias.filter(isJson);
      if (!jsons.length) { skipped ??= medias.length ? `responde ${medias[0]}, no JSON` : null; continue; }
      for (const media of jsons) {
        const m = isObj(content[media]) ? (content[media] as Obj) : {};
        const example = firstExample(doc, m);
        list.push({ key: `${status}|${media}`, status, media, label: `${status} · ${media} · ${schemaName(doc, m['schema'])}`, schema: m['schema'], example, hasExample: example !== undefined });
      }
    } else if ('schema' in resp) {
      // Swagger 2: `schema` y `examples` por tipo de contenido, y `produces` en la operación o en el documento.
      const media = produces.find(isJson) ?? 'application/json';
      const examples = isObj(resp['examples']) ? resp['examples'] : null;
      const example = examples ? examples[media] ?? Object.values(examples)[0] : undefined;
      list.push({ key: `${status}|${media}`, status, media, label: `${status} · ${media} · ${schemaName(doc, resp['schema'])}`, schema: resp['schema'], example, hasExample: example !== undefined });
    } else if (status === '204' || /^3\d\d$/.test(status)) {
      skipped ??= `sin respuesta con datos (${status})`;
    }
  }
  return { list, skipped };
}

/** Las operaciones de un OpenAPI 3.x o Swagger 2, en el orden del documento (agrupadas por etiqueta al enseñarlas). */
export function listOperations(doc: unknown): OpenApiOperation[] {
  if (!isObj(doc) || !isObj(doc['paths'])) return [];
  const out: OpenApiOperation[] = [];
  const docProduces = Array.isArray(doc['produces']) ? (doc['produces'] as string[]) : [];
  for (const [path, item] of Object.entries(doc['paths'])) {
    if (!isObj(item)) continue;
    for (const method of METHODS) {
      const op = item[method];
      if (!isObj(op)) continue;
      const produces = Array.isArray(op['produces']) ? (op['produces'] as string[]) : docProduces;
      const { list, skipped } = responsesOf(doc, op, produces);
      const defaultResponse = list.findIndex((r) => /^2/.test(r.status));
      const tags = Array.isArray(op['tags']) ? (op['tags'] as unknown[]) : [];
      const summary = typeof op['summary'] === 'string' ? (op['summary'] as string) : typeof op['description'] === 'string' ? (op['description'] as string).split('\n')[0] : '';
      out.push({
        id: `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        summary,
        tag: typeof tags[0] === 'string' ? (tags[0] as string) : '',
        responses: list,
        defaultResponse: defaultResponse >= 0 ? defaultResponse : list.length ? 0 : -1,
        unusable: list.length ? null : skipped ?? 'sin respuesta con datos',
      });
    }
  }
  return out;
}

export function summarizeOpenApi(doc: unknown): OpenApiSummary {
  const info = isObj(doc) && isObj(doc['info']) ? doc['info'] : {};
  const components = isObj(doc) && isObj(doc['components']) ? doc['components'] : {};
  const schemas = isObj(components['schemas']) ? components['schemas'] : isObj(doc) && isObj(doc['definitions']) ? doc['definitions'] : {};
  return {
    title: typeof info['title'] === 'string' ? (info['title'] as string) : '',
    version: typeof info['version'] === 'string' ? (info['version'] as string) : '',
    operations: listOperations(doc).length,
    schemas: Object.keys(schemas as Obj).length,
  };
}

export type OpenApiValues = 'examples' | 'generated';

export interface OperationData { data: Obj; warnings: string[]; usedExample: boolean }

/**
 * Los datos de la respuesta elegida. Con «ejemplos del documento» se usa el `example` de la respuesta si lo hay y, si no,
 * los del esquema; lo que falte (y todo, con «generados») se inventa. Una lista en la raíz va bajo `items`.
 */
export function operationData(doc: unknown, response: OpenApiResponse, values: OpenApiValues, opts: InferOptions = {}): OperationData {
  if (values === 'examples' && response.hasExample) {
    const ex = structuredClone(response.example);
    const data = isObj(ex) ? ex : Array.isArray(ex) ? { items: ex } : { value: ex };
    return { data, warnings: [], usedExample: true };
  }
  const r = inferFromSchemaWithin(doc, response.schema ?? {}, { fill: true, ...opts, useExamples: values === 'examples' });
  return { data: r.data, warnings: r.warnings, usedExample: false };
}

/** Claves que la plantilla lee (`cliente.email`, `lineas[].concepto`) y que los datos no traen. */
export function missingKeys(data: unknown, paths: string[]): string[] {
  const missing: string[] = [];
  for (const path of paths) {
    let node: unknown = data;
    let ok = true;
    for (const seg of path.split('.')) {
      const key = seg.replace(/\[\]$/, '');
      if (!isObj(node) || !(key in node)) { ok = false; break; }
      node = node[key];
      if (seg.endsWith('[]')) node = Array.isArray(node) ? node[0] : undefined;
    }
    if (!ok) missing.push(path.replace(/\[\]/g, ''));
  }
  return [...new Set(missing)];
}

export interface PreviewLine { depth: number; key: string; value: string; muted: boolean }

const scalar = (v: unknown): string => (typeof v === 'string' ? JSON.stringify(v.length > 40 ? `${v.slice(0, 39)}…` : v) : String(v));
const countLeaves = (v: unknown): number => (Array.isArray(v) ? v.slice(0, 1).reduce<number>((n, x) => n + countLeaves(x), 0) || 1 : isObj(v) ? Object.values(v).reduce<number>((n, x) => n + countLeaves(x), 0) : 1);

/** Vista previa de los datos que saldrán: dos niveles, con el primer elemento de cada lista (`0.concepto`). */
export function previewLines(data: Obj, max = 18): { lines: PreviewLine[]; keys: number; more: number } {
  const lines: PreviewLine[] = [];
  const add = (depth: number, key: string, value: unknown): void => {
    if (Array.isArray(value)) lines.push({ depth, key, value: `[ ${value.length} ${value.length === 1 ? 'elemento' : 'elementos'} ]`, muted: true });
    else if (isObj(value)) lines.push({ depth, key, value: `{ ${Object.keys(value).length} ${Object.keys(value).length === 1 ? 'clave' : 'claves'} }`, muted: true });
    else lines.push({ depth, key, value: scalar(value), muted: false });
  };
  for (const [k, v] of Object.entries(data)) {
    add(0, k, v);
    const child = Array.isArray(v) ? (isObj(v[0]) ? v[0] : null) : isObj(v) ? v : null;
    if (child) for (const [ck, cv] of Object.entries(child)) add(1, Array.isArray(v) ? `0.${ck}` : ck, cv);
  }
  return { lines: lines.slice(0, max), keys: countLeaves(data), more: Math.max(0, lines.length - max) };
}
