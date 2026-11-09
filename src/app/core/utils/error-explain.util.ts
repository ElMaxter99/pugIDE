import type { DiagnosticFix } from '../models/index';

/** Dónde ocurrió el error: sirve para proponer arreglos sobre el archivo y la línea correctos. */
export interface ErrorContext {
  files?: Map<string, string>;
  /** Archivo donde ocurrió (`/main.pug`). */
  path?: string;
  /** Línea 1-based. */
  line?: number;
}

export interface Explanation {
  /** Causa probable y cómo arreglarla, en español. */
  hint: string;
  fix?: DiagnosticFix;
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

/** Distancia de edición entre dos palabras (para «¿Quisiste decir…?»). */
export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** El candidato más parecido a `name` (misma palabra sin mayúsculas, o a 2 ediciones como mucho), o null. */
export function closestName(name: string, candidates: readonly string[]): string | null {
  const lower = name.toLowerCase();
  const same = candidates.find((c) => c.toLowerCase() === lower);
  if (same) return same;
  let best: string | null = null;
  let bestDist = Math.min(2, Math.floor(name.length / 3));
  for (const c of candidates) {
    const d = editDistance(lower, c.toLowerCase());
    if (d <= bestDist) { best = c; bestDist = d; }
  }
  return best;
}

/** Ruta con la que `from` incluye a `target`: relativa a su carpeta y sin extensión (`./mixins`, `../partials/card`). */
export function includeSpecifier(from: string, target: string): string {
  const dir = from.split('/').slice(0, -1);
  const to = target.replace(/\.(pug|jade)$/i, '').split('/');
  let i = 0;
  while (i < dir.length && i < to.length - 1 && dir[i] === to[i]) i++;
  const up = dir.length - i;
  const rest = to.slice(i).join('/');
  return (up === 0 ? './' : '../'.repeat(up)) + rest;
}

/** ¿`content` ya incluye `target`? Compara por nombre de archivo sin extensión. */
export function includesFile(content: string, target: string): boolean {
  const name = baseName(target).replace(/\.(pug|jade)$/i, '');
  const re = new RegExp(`^[ \\t]*include[ \\t]+(?:\\S*/)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.pug|\\.jade)?[ \\t]*$`, 'm');
  return re.test(content);
}

function explainMixin(name: string, ctx: ErrorContext): Explanation {
  const files = ctx.files ?? new Map<string, string>();
  const defs = collectMixinDefinitions(files);
  const where = defs.get(name);
  if (where?.length) {
    const target = where[0];
    const list = where.map((p) => `«${baseName(p)}»`).join(', ');
    const spec = ctx.path ? includeSpecifier(ctx.path, target) : `./${baseName(target)}`;
    const fix: DiagnosticFix | undefined = ctx.path && ctx.path !== target
      ? { kind: 'addInclude', label: `Añadir include ${spec} en ${baseName(ctx.path)}`, path: ctx.path, target }
      : undefined;
    return {
      hint: `Se llama a +${name}, pero el archivo que lo define (${list}) no llega a incluirse desde aquí. Añade \`include ${spec}\` antes de usarlo (la ruta es relativa al archivo que lo incluye).`,
      fix,
    };
  }
  const known = [...defs.keys()];
  const near = closestName(name, known);
  if (near) {
    const fix: DiagnosticFix | undefined = ctx.path && ctx.line
      ? { kind: 'replaceOnLine', label: `Cambiar +${name} por +${near}`, path: ctx.path, line: ctx.line, from: `+${name}`, to: `+${near}` }
      : undefined;
    const why = near.toLowerCase() === name.toLowerCase() ? 'Pug distingue mayúsculas y minúsculas' : 'parece una errata';
    return { hint: `Se llama a +${name}, pero no existe. ¿Quisiste decir +${near}? (${why}).`, fix };
  }
  const have = known.length ? ` Mixins definidos en el proyecto: ${known.map((k) => '+' + k).join(', ')}.` : ' El proyecto no define ningún mixin.';
  const mixinFile = files.has('/mixins.pug') ? '/mixins.pug' : (known.length ? defs.get(known[0])![0] : '/mixins.pug');
  const fix: DiagnosticFix = {
    kind: 'createMixin', label: `Crear mixin ${name} en ${baseName(mixinFile)}`, name, path: mixinFile,
    includeFrom: ctx.path && ctx.path !== mixinFile ? ctx.path : undefined,
  };
  return { hint: `Se llama a +${name}, pero ningún archivo define \`mixin ${name}(...)\`.${have} Defínelo (por ejemplo en ${baseName(mixinFile)}) y añade el \`include\`.`, fix };
}

/**
 * Traduce errores de Pug y de JavaScript poco claros a una causa probable y, cuando se puede, a un arreglo.
 * Devuelve `undefined` si el mensaje no se reconoce (entonces se muestra tal cual).
 */
export function explainError(message: string, ctx: ErrorContext = {}): Explanation | undefined {
  // Mixin que se llama pero no existe (el motor de Pug lo llama `pug_mixins.<nombre>`).
  const mixin = /pug_mixins(?:\.([\w$]+)|\["([^"]+)"\]) is not a function/.exec(message);
  if (mixin) return explainMixin(mixin[1] ?? mixin[2], ctx);

  // include / extends hacia un archivo que no está en el proyecto.
  const missing = /Cannot find "([^"]+)"/.exec(message);
  if (missing) {
    const wanted = missing[1];
    const names = [...(ctx.files?.keys() ?? [])].filter((p) => /\.(pug|jade)$/i.test(p));
    const near = closestName(baseName(wanted).replace(/\.(pug|jade)$/i, ''), names.map((p) => baseName(p).replace(/\.(pug|jade)$/i, '')));
    const hint = `El archivo «${wanted}» no existe en el proyecto. La ruta de un include es relativa al archivo que lo incluye (\`./x\`, \`../x\`); si empieza por «/» cuenta desde la raíz del proyecto.`;
    return { hint: near ? `${hint} ¿Quisiste decir «${near}»?` : hint };
  }

  // Dato que falta: se lee una propiedad de algo que es undefined/null. Cada navegador lo redacta distinto.
  let field: string | undefined;
  let owner: string | undefined;
  let m: RegExpExecArray | null;
  if ((m = /Cannot read propert(?:y|ies) of (?:undefined|null) \(reading '([^']+)'\)/.exec(message))) {
    field = m[1]; // Chrome
  } else if ((m = /can't access property "([^"]+)", ([\w$.]+) is (?:undefined|null)/.exec(message))) {
    field = m[1]; owner = m[2]; // Firefox
  } else if ((m = /(?:undefined|null) is not an object \(evaluating '([\w$.]+)\.([\w$]+)'\)/.exec(message))) {
    owner = m[1]; field = m[2]; // Safari
  }
  if (field) {
    return {
      hint: `Se lee «${field}» de ${owner ? `«${owner}»` : 'un dato'} que no existe (undefined). Añade ese campo en el editor de datos, o protege el acceso (\`if ${owner ?? 'dato'}\` antes de usarlo).`,
    };
  }

  // Variable que no existe (Chrome/Firefox: "x is not defined"; Safari: "Can't find variable: x").
  const undef = /^(?:ReferenceError: )?([\w$]+) is not defined$/m.exec(message) ?? /Can't find variable: ([\w$]+)/.exec(message);
  if (undef) {
    return { hint: `La variable «${undef[1]}» no existe: añádela en el editor de datos o declárala con \`- var ${undef[1]} = ...\` antes de usarla.` };
  }

  // Se llama a algo que no es una función: casi siempre un dato de otro tipo (p. ej. `.map` de algo que no es un array).
  const notFn = /([\w$]+(?:\.[\w$]+)*)\.([\w$]+) is not a function/.exec(message);
  if (notFn) {
    return { hint: `«${notFn[1]}» no tiene el método «${notFn[2]}»: probablemente no es del tipo que la plantilla espera (por ejemplo, no es un array). Revisa su valor en el editor de datos.` };
  }
  const fn = /^(?:TypeError: )?([\w$]+) is not a function$/m.exec(message);
  if (fn) {
    return { hint: `«${fn[1]}» no es una función: no está definida en los datos ni en helpers.js. Defínela en helpers.js (\`module.exports = { ${fn[1]} }\`) o usa una que exista.` };
  }

  // Sintaxis de Pug.
  const indent = /Inconsistent indentation\. Expecting either (\d+) or (\d+) spaces\/tabs/.exec(message);
  if (indent) {
    return { hint: `Esta línea no tiene la misma indentación que el bloque: debería tener ${indent[1]} o ${indent[2]} espacios. No mezcles tabuladores y espacios en el mismo archivo.` };
  }
  const bracket = /no closing bracket ([)\]}]) found/.exec(message);
  if (bracket) {
    const open = { ')': '(', ']': '[', '}': '{' }[bracket[1]];
    return { hint: `Falta cerrar un «${open}» con su «${bracket[1]}» (normalmente los atributos de una etiqueta). Revisa también las comillas de los valores.` };
  }
  if (/you can use tabs or spaces but not both/i.test(message)) {
    return { hint: 'Este archivo mezcla tabuladores y espacios para indentar. Usa solo uno de los dos (lo habitual son 2 espacios) y reindenta las líneas que fallen.' };
  }
  const stray = /unexpected token "(else(?: if)?)"/i.exec(message);
  if (stray) {
    return { hint: `Hay un «${stray[1]}» sin su \`if\` justo antes. En Pug, \`else\` va en la línea siguiente al bloque del \`if\`, con la misma indentación que él (sin líneas ni comentarios entre medias).` };
  }
  if (/should be the first thing in the file/i.test(message)) {
    return { hint: '`extends` debe ser lo primero del archivo (solo puede haber uno): ni etiquetas, ni código, ni `doctype` antes. Mueve esa línea al principio y deja el contenido dentro de `block`.' };
  }
  if (/Maximum call stack size exceeded/i.test(message)) {
    return { hint: 'Algo se llama a sí mismo sin parar: un mixin que se invoca desde su propio cuerpo sin condición de salida, o dos archivos que se `include` el uno al otro. Añade un `if` que corte la recursión o rompe el ciclo de includes.' };
  }
  if (/Error parsing body of the with expression/i.test(message)) {
    return { hint: 'Hay JavaScript con errores de sintaxis en una línea de código de la plantilla (`- var x = ...`, `= expresión`, `if …`). Revisa que no falten valores, paréntesis, llaves ni comillas.' };
  }
  if (/Syntax Error: Unexpected token/i.test(message)) {
    return { hint: 'Hay un carácter que Pug no esperaba en esa línea: casi siempre un atributo mal escrito (`a(href=)` sin valor, comillas sin cerrar) o una coma o llave de más en una expresión.' };
  }
  if (/unexpected text/i.test(message)) {
    return { hint: 'Hay texto suelto donde Pug espera una etiqueta. Para escribir texto usa `| texto` en su propia línea, o `etiqueta texto`.' };
  }
  return undefined;
}
