/**
 * Dónde está el JavaScript con errores de sintaxis en una plantilla Pug. Pug solo dice «Error parsing body of the with
 * expression» sin línea; aquí se prueba cada línea de código suelta (`- var x = …`, `= expr`, `!= expr`) hasta dar con la
 * que no compila. Solo comprueba la sintaxis (no ejecuta nada) y se salta las líneas que abren un bloque.
 */

const balanced = (code: string): boolean => {
  let depth = 0;
  for (const ch of code) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
  }
  return depth === 0;
};

function compiles(body: string): boolean {
  try {
    // Solo se construye la función (no se llama): comprueba la sintaxis.
    new Function(body);
    return true;
  } catch {
    return false;
  }
}

/** Línea (1-based) de la primera línea de código con sintaxis incorrecta, o undefined si no se encuentra. */
export function findCodeErrorLine(source: string): number | undefined {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = /^[ \t]*-[ \t]+(\S.*)$/.exec(line)?.[1];
    if (code !== undefined) {
      if (balanced(code) && !compiles(code)) return i + 1;
      continue;
    }
    // `p= expr`, `= expr` y `!= expr` (el texto tras `=` es una expresión).
    const expr = /^[ \t]*[\w.#-]*(?:\([^)]*\))?[ \t]*!?=[ \t]*(\S.*)$/.exec(line)?.[1];
    if (expr !== undefined && balanced(expr) && !compiles(`return (${expr})`)) return i + 1;
    if (/^[ \t]*[\w.#-]*!?=[ \t]*$/.test(line)) return i + 1; // `=` sin expresión
  }
  return undefined;
}
