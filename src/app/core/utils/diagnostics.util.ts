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
export const AVAILABLE_FILTERS = [':cdata'] as const;

/** Añade al mensaje de un filtro desconocido qué filtros hay disponibles. */
export function explainUnknownFilter(message: string): string {
  const m = /unknown filter "(:?[\w-]+)"/.exec(message);
  if (!m) return message;
  return `${message}\n\nEl filtro ${m[1]} no está disponible en PugIDE (corre en el navegador, sin paquetes de Node). Disponibles: ${AVAILABLE_FILTERS.join(', ')}.`;
}
