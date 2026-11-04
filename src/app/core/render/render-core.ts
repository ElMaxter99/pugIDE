import type { CompileError } from '../models/index';
import { explainUnknownFilter, splitPugMessage } from '../utils/diagnostics.util';
import { explainError } from '../utils/error-explain.util';
import { loadHelpers } from '../utils/helpers.util';
import { createTranslator, TRANSLATE_FNS } from '../utils/i18n.util';
import { renderMarkdown } from '../utils/markdown.util';
import { createPugFilePlugin, normalizeIncludes } from '../utils/pug-vfs.util';

/**
 * Núcleo del render de Pug: compila la plantilla y la ejecuta con los datos, los helpers del proyecto y los
 * stubs de funciones desconocidas. Es la única parte de PugIDE que ejecuta JavaScript escrito por el usuario
 * (el de la plantilla y el de `helpers.js`), así que en el navegador corre dentro de un iframe aislado
 * (`SandboxRenderHost`); en las pruebas de Node se ejecuta en línea (`InlineRenderHost`). Sin Angular ni DOM.
 */

/** Todo lo que cruza el límite del aislamiento debe poder clonarse con `postMessage`: sin Map ni funciones. */
export interface RenderRequest {
  code: string;
  data: Record<string, unknown>;
  entryPath?: string;
  /** Archivos de texto del proyecto como pares `[ruta, contenido]`. */
  files?: [string, string][];
  /** Funciones que la plantilla llama sin declararlas (`t`, `formatDate`…). */
  functionStubs: string[];
}

export interface RenderResponse {
  html: string;
  errors: CompileError[];
}

/** Lo que usamos del bundle de Pug (`self.pugBundle`). */
export interface PugBundle {
  compile(source: string, options: Record<string, unknown>): (locals: Record<string, unknown>) => string;
}

export function renderPug(bundle: PugBundle, req: RenderRequest): RenderResponse {
  const errors: CompileError[] = [];
  const files = req.files ? new Map(req.files) : undefined;
  let html = '';
  try {
    const opts: Record<string, unknown> = {
      pretty: true,
      doctype: 'html',
      self: false,
      // Los filtros que Pug resuelve con paquetes de Node no existen en el navegador.
      filters: {
        cdata: (text: string) => `<![CDATA[${text}]]>`,
        // Nombres con los que se suele usar Markdown en Pug; todos usan el mismo subconjunto (ver markdown.util).
        markdown: renderMarkdown,
        'markdown-it': renderMarkdown,
        marked: renderMarkdown,
      },
    };
    if (req.entryPath) {
      opts['filename'] = req.entryPath;
      opts['basedir'] = '/';
    }
    if (files) opts['plugins'] = [createPugFilePlugin(files)];

    const source = files && req.entryPath ? normalizeIncludes(req.code, req.entryPath, files) : req.code;
    const compiledFn = bundle.compile(source, opts);

    // Las plantillas llaman a helpers que el JSON no puede contener (`t('KEY')`, `formatDate(x)`):
    // los de /helpers.js son locales y tapan a un dato con el mismo nombre; los traductores leen
    // `data.translations` y el resto de funciones desconocidas devuelven su primer argumento.
    const loaded = files ? loadHelpers(files) : { helpers: {}, errors: [] };
    for (const e of loaded.errors) {
      errors.push({ message: e.message, source: 'javascript', path: e.path, line: e.line, severity: 'error' });
    }
    const locals: Record<string, unknown> = { ...req.data, ...loaded.helpers };
    const translate = createTranslator(req.data);
    const identity = (...args: unknown[]) => args[0] ?? '';
    for (const name of req.functionStubs) {
      const parts = name.split('.');
      const last = parts.pop()!;
      const fn = TRANSLATE_FNS.has(last) ? translate : identity;
      let holder = locals;
      for (const part of parts) {
        const cur = holder[part];
        holder[part] = { ...(cur !== null && typeof cur === 'object' ? (cur as object) : {}) };
        holder = holder[part] as Record<string, unknown>;
      }
      if (typeof holder[last] !== 'function') holder[last] = fn;
    }
    html = compiledFn(locals);
  } catch (err: unknown) {
    const error = err as { message?: string; line?: number; column?: number; filename?: string };
    // Los errores de ejecución traen la ubicación dentro del texto (`/main.pug:52` + fragmento de código).
    const split = splitPugMessage(error.message ?? 'Compilation error');
    const known = (p?: string): string | undefined => (p && files?.has(p) ? p : undefined);
    // La ubicación que Pug escribe en el mensaje manda: en Safari los errores traen su propia `line`/`column`
    // (las del JavaScript compilado de la plantilla, no las del `.pug`).
    const fromPug = split.path !== undefined && split.line !== undefined;
    const path = fromPug ? known(split.path) : known(error.filename);
    const line = fromPug ? split.line : error.line;
    const explained = explainError(split.message, { files, path: path ?? req.entryPath, line });
    errors.push({
      message: explainUnknownFilter(split.message),
      source: 'pug',
      path,
      line,
      column: fromPug ? split.column : error.column,
      ...(explained ? { hint: explained.hint } : {}),
      ...(explained?.fix ? { fix: explained.fix } : {}),
      severity: 'error',
    });
  }
  return { html, errors };
}
