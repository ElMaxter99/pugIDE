import { CompileError, ParseError } from '../models/index';

/** Problema localizado en un archivo del proyecto; se dibuja como marcador en el editor. */
export interface Diagnostic {
  path: string;
  /** Línea 1-based. */
  line: number;
  /** Columna 1-based; sin ella se marca la línea entera. */
  column?: number;
  message: string;
  severity: 'error' | 'warning';
  source: string;
}

/** Error de una hoja de estilos ya localizado (sass/less/CSS). */
export interface StyleDiagnosticInput {
  path: string;
  message: string;
  line?: number;
  column?: number;
}

export interface SplitPugMessage {
  path?: string;
  line?: number;
  column?: number;
  message: string;
}

const HEADER_RE = /^(\/[^\n]*?):(\d+)(?::(\d+))?(?:\n|$)/;

/**
 * Los errores de Pug llegan como `/ruta.pug:LÍNEA[:COL]\n<contexto con números de línea>\n\n<mensaje>`.
 * Separa la ubicación del mensaje limpio (sin el fragmento de código).
 */
export function splitPugMessage(raw: string): SplitPugMessage {
  const text = (raw ?? '').replace(/\r\n/g, '\n');
  const m = HEADER_RE.exec(text);
  if (!m) return { message: text.trim() };
  const rest = text.slice(m[0].length);
  const cut = rest.indexOf('\n\n');
  const message = (cut >= 0 ? rest.slice(cut + 2) : rest).trim();
  return {
    path: m[1],
    line: Number(m[2]),
    column: m[3] ? Number(m[3]) : undefined,
    message: message || text.trim(),
  };
}

/** Convierte los errores del parser, del compilador de Pug y de estilos en diagnósticos sin duplicados. */
export function buildDiagnostics(input: {
  entryPath: string | null;
  parseErrors?: ParseError[];
  compileErrors?: CompileError[];
  styleErrors?: StyleDiagnosticInput[];
  /** Diagnósticos ya localizados (p. ej. JSON de traducciones inválido). */
  extra?: Diagnostic[];
}): Diagnostic[] {
  const out: Diagnostic[] = [];
  const seen = new Set<string>();
  const add = (d: Diagnostic | null): void => {
    if (!d) return;
    const key = `${d.path}:${d.line}:${d.severity}:${d.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(d);
  };

  const fromPug = (e: { message: string; line?: number; column?: number; filename?: string; path?: string; severity: 'error' | 'warning' }, source: string): Diagnostic | null => {
    const split = splitPugMessage(e.message);
    const path = e.path ?? split.path ?? e.filename ?? input.entryPath;
    const line = e.line || split.line;
    if (!path || !line) return null;
    return {
      path: path.startsWith('/') ? path : '/' + path,
      line,
      column: e.column || split.column || undefined,
      message: split.message,
      severity: e.severity,
      source,
    };
  };

  for (const e of input.compileErrors ?? []) add(fromPug(e, e.source));
  for (const e of input.parseErrors ?? []) add(fromPug(e, 'pug'));
  for (const e of input.styleErrors ?? []) {
    if (!e.line) continue;
    add({ path: e.path, line: e.line, column: e.column || undefined, message: e.message, severity: 'error', source: 'scss' });
  }
  for (const d of input.extra ?? []) add(d);
  return out;
}

/** Agrupa por archivo. */
export function groupDiagnostics(list: Diagnostic[]): Map<string, Diagnostic[]> {
  const map = new Map<string, Diagnostic[]>();
  for (const d of list) {
    const bucket = map.get(d.path);
    if (bucket) bucket.push(d);
    else map.set(d.path, [d]);
  }
  return map;
}

/** Filtros de Pug que PugIDE incluye; el resto necesita paquetes de Node que el navegador no tiene. */
export const AVAILABLE_FILTERS = [':cdata', ':markdown', ':markdown-it', ':marked'] as const;

/** Añade al mensaje de un filtro desconocido qué filtros hay disponibles. */
export function explainUnknownFilter(message: string): string {
  const m = /unknown filter "(:?[\w-]+)"/.exec(message);
  if (!m) return message;
  return `${message}\n\nEl filtro ${m[1]} no está disponible en PugIDE (corre en el navegador, sin paquetes de Node). Disponibles: ${AVAILABLE_FILTERS.join(', ')}.`;
}

const MIXIN_DEF_RE = /^[ \t]*mixin[ \t]+([\w-]+)/gm;

/** Mixins definidos en cada archivo `.pug`/`.jade` del proyecto: nombre -> rutas donde se definen. */
export function collectMixinDefinitions(files: Map<string, string>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [path, content] of files) {
    if (!/\.(pug|jade)$/i.test(path)) continue;
    for (const m of content.matchAll(MIXIN_DEF_RE)) {
      const list = out.get(m[1]) ?? [];
      if (!list.includes(path)) list.push(path);
      out.set(m[1], list);
    }
  }
  return out;
}

const baseName = (path: string): string => path.split('/').pop() ?? path;

/**
 * Traduce los errores de ejecución más crípticos de Pug a una causa probable y cómo arreglarla.
 * `pug_mixins.azBody is not a function` significa que se llama a `+azBody` y no hay ningún mixin con ese nombre
 * en los archivos que la plantilla incluye.
 */
export function explainRuntimeError(message: string, files?: Map<string, string>): string | undefined {
  const mixin = /pug_mixins(?:\.([\w$]+)|\["([^"]+)"\]) is not a function/.exec(message);
  if (mixin) {
    const name = mixin[1] ?? mixin[2];
    const defs = files ? collectMixinDefinitions(files) : new Map<string, string[]>();
    const where = defs.get(name);
    if (where?.length) {
      const list = where.map((p) => `«${baseName(p)}»`).join(', ');
      return `Se llama a +${name}, pero el archivo que lo define (${list}) no llega a incluirse. Añade \`include ${baseName(where[0])}\` antes de usarlo (la ruta es relativa al archivo que lo incluye).`;
    }
    const known = [...defs.keys()];
    const near = known.find((k) => k.toLowerCase() === name.toLowerCase());
    if (near) return `Se llama a +${name}, pero el mixin se llama «${near}»: Pug distingue mayúsculas y minúsculas.`;
    const have = known.length ? ` Mixins definidos en el proyecto: ${known.map((k) => '+' + k).join(', ')}.` : ' El proyecto no define ningún mixin.';
    return `Se llama a +${name}, pero ningún archivo define \`mixin ${name}(...)\`.${have} Defínelo (por ejemplo en mixins.pug) y añade el \`include\`.`;
  }
  const undef = /^(\w+) is not defined$/m.exec(message);
  if (undef) {
    return `La variable «${undef[1]}» no existe: añádela en el editor de datos o declárala con \`- var ${undef[1]} = ...\` antes de usarla.`;
  }
  return undefined;
}
