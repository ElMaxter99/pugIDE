import { CompileError, DiagnosticFix, ParseError } from '../models/index';
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
  /** Causa probable y cómo arreglarla, si se reconoce el error. */
  hint?: string;
  /** Arreglo que PugIDE puede aplicar con un clic. */
  fix?: DiagnosticFix;
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

  const fromPug = (e: { message: string; line?: number; column?: number; filename?: string; path?: string; severity: 'error' | 'warning'; hint?: string; fix?: DiagnosticFix }, source: string): Diagnostic | null => {
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
      ...(e.hint ? { hint: e.hint } : {}),
      ...(e.fix ? { fix: e.fix } : {}),
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
export const AVAILABLE_FILTERS = [':cdata', ':escape', ':markdown', ':markdown-it', ':marked'] as const;

/** Añade al mensaje de un filtro desconocido qué filtros hay disponibles. */
export function explainUnknownFilter(message: string): string {
  const m = /unknown filter "(:?[\w-]+)"/.exec(message);
  if (!m) return message;
  return `${message}\n\nEl filtro ${m[1]} no está disponible en PugIDE (corre en el navegador, sin paquetes de Node). Disponibles: ${AVAILABLE_FILTERS.join(', ')}.`;
}

/** Problema que no se puede situar en un archivo y línea (p. ej. «la compilación tardó más de 15 s»). */
export interface UnlocatedProblem {
  message: string;
  severity: 'error' | 'warning';
  source: string;
  hint?: string;
  fix?: DiagnosticFix;
}

/** Fila del panel «Problemas»: un diagnóstico localizado o uno sin ubicación. */
export interface ProblemRow {
  id: string;
  severity: 'error' | 'warning';
  message: string;
  source: string;
  hint?: string;
  fix?: DiagnosticFix;
  /** Archivo y línea; ausentes en un problema sin ubicación. */
  path?: string;
  line?: number;
  column?: number;
}

/** Errores de compilación que `buildDiagnostics` no puede localizar: siguen siendo problemas y se listan sin enlace. */
export function unlocatedProblems(input: { entryPath: string | null; compileErrors?: CompileError[]; styleErrors?: StyleDiagnosticInput[] }): UnlocatedProblem[] {
  const out: UnlocatedProblem[] = [];
  const seen = new Set<string>();
  for (const e of input.compileErrors ?? []) {
    if (buildDiagnostics({ entryPath: input.entryPath, compileErrors: [e] }).length) continue;
    const message = splitPugMessage(e.message).message;
    const key = `${e.severity}:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ message, severity: e.severity, source: e.source, ...(e.hint ? { hint: e.hint } : {}), ...(e.fix ? { fix: e.fix } : {}) });
  }
  // Un error de estilos sin línea (un `link` o un `@import` a una hoja que no está en el proyecto, un error del compilador sin
  // posición) no cabe en el editor, pero tiene que verse: si no, la hoja simplemente «no hace nada» sin decir por qué.
  for (const e of input.styleErrors ?? []) {
    if (e.line) continue;
    const message = `${e.path}: ${e.message}`;
    const key = `error:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      message,
      severity: 'error',
      source: 'scss',
      ...(/no encontrad/i.test(e.message) ? { hint: 'Comprueba la ruta o sube el archivo con el botón de subir del panel «Archivos» (acepta .css, .scss, .sass y .less).' } : {}),
    });
  }
  return out;
}

/** Une los problemas localizados y los que no tienen ubicación en filas con identificador estable (el orden de la lista). */
export function toProblemRows(located: readonly Diagnostic[], unlocated: readonly UnlocatedProblem[] = []): ProblemRow[] {
  return [
    ...located.map((d, i): ProblemRow => ({ id: `d${i}`, severity: d.severity, message: d.message, source: d.source, hint: d.hint, fix: d.fix, path: d.path, line: d.line, column: d.column })),
    ...unlocated.map((u, i): ProblemRow => ({ id: `u${i}`, severity: u.severity, message: u.message, source: u.source, hint: u.hint, fix: u.fix })),
  ];
}

export function countProblems(rows: readonly { severity: 'error' | 'warning' }[]): { errors: number; warnings: number; total: number } {
  const errors = rows.filter((r) => r.severity === 'error').length;
  return { errors, warnings: rows.length - errors, total: rows.length };
}

/** Siguiente (1) o anterior (-1) fila dando la vuelta; sin fila actual, la primera o la última. `null` si la lista está vacía. */
export function stepRow<T extends { id: string }>(rows: readonly T[], currentId: string | null, direction: 1 | -1): T | null {
  if (rows.length === 0) return null;
  const at = currentId == null ? -1 : rows.findIndex((r) => r.id === currentId);
  if (at < 0) return direction === 1 ? rows[0] : rows[rows.length - 1];
  return rows[(at + direction + rows.length) % rows.length];
}

export interface SnippetLine {
  n: number;
  text: string;
  marked: boolean;
}

/** Líneas alrededor de `line` (1-based) con la suya marcada; vacío si el archivo no llega a esa línea. */
export function snippetLines(content: string, line: number, context = 2): SnippetLine[] {
  const lines = content.split(/\r?\n/);
  if (!Number.isInteger(line) || line < 1 || line > lines.length) return [];
  const from = Math.max(1, line - context);
  const to = Math.min(lines.length, line + context);
  const out: SnippetLine[] = [];
  for (let n = from; n <= to; n++) out.push({ n, text: lines[n - 1].length > 160 ? lines[n - 1].slice(0, 160) + '…' : lines[n - 1], marked: n === line });
  return out;
}

/** «hace 12 s», «hace 3 min», «hace 2 h». */
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}
