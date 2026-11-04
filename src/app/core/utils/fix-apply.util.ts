/** Transformaciones de texto de los arreglos automáticos (`DiagnosticFix`): puras, sin tocar el proyecto. */

/** Añade `mixin <name>()` al final y devuelve la línea (1-based) donde queda su definición. */
export function appendMixin(content: string, name: string): { content: string; line: number } {
  const base = content.length === 0 ? '' : content.endsWith('\n') ? content : content + '\n';
  const spacer = base.length > 0 ? '\n' : '';
  const text = `${base}${spacer}mixin ${name}()\n  //- TODO: contenido de ${name}\n`;
  return { content: text, line: (base + spacer).split('\n').length };
}

/** Añade `include <spec>` al principio, debajo de `doctype` si lo hay (un include sin salida va antes del contenido). */
export function insertInclude(content: string, spec: string): string {
  const lines = content.split('\n');
  const at = /^\s*doctype\b/.test(lines[0] ?? '') ? 1 : 0;
  lines.splice(at, 0, `include ${spec}`);
  return lines.join('\n');
}

/** Sustituye la primera aparición de `from` en la línea (1-based). `null` si la línea no existe o no contiene `from`. */
export function replaceOnLine(content: string, line: number, from: string, to: string): string | null {
  const lines = content.split('\n');
  const text = lines[line - 1];
  if (text === undefined || !text.includes(from)) return null;
  lines[line - 1] = text.replace(from, () => to);
  return lines.join('\n');
}
