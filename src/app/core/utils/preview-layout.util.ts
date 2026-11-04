import { PageRules, MARGIN_BOX_NAMES, boxesForPage, renderContent } from './page-rules.util';
import { PageBreakIssue } from './paginate.util';

/** Cálculos del panel de preview, sin Angular: páginas, escala de ajuste, cabeceras/pies y avisos. */

/** PDF: páginas enteras que necesita el contenido (al menos una). */
export function pageCountFor(contentHeight: number, pageHeight: number): number {
  return Math.max(1, Math.ceil(contentHeight / pageHeight));
}

/**
 * Escala del marco. `fit` lo ajusta al lienzo (dejando 64 px de aire); un número es un porcentaje fijo.
 * Un PDF se desplaza en vertical (varias páginas), así que solo tiene que caber a lo ancho. Nunca amplía (máx. 1).
 */
export function fitScale(
  mode: 'fit' | number,
  canvas: { width: number; height: number },
  frame: { width: number; height: number },
  isPdf: boolean,
): number {
  if (mode !== 'fit') return mode / 100;
  if (!canvas.width || !canvas.height) return 1;
  const availW = Math.max(canvas.width - 64, 100);
  const availH = Math.max(canvas.height - 64, 100);
  const s = isPdf ? availW / frame.width : Math.min(availW / frame.width, availH / frame.height);
  return Math.min(1, s);
}

export interface PageChromeItem {
  id: string;
  text: string;
  style: Record<string, string>;
}

/** Cajas de margen (`@top-center`, `@bottom-right`…) de cada hoja, posicionadas sobre el documento paginado. */
export function buildPageChrome(rules: PageRules, sheet: { width: number; height: number }, pages: number): PageChromeItem[] {
  if (!Object.keys(rules.boxes).length && !Object.keys(rules.firstBoxes).length) return [];
  const { width, height } = sheet;
  const m = rules.margin;
  const third = Math.max(0, width - m.left - m.right) / 3;
  const items: PageChromeItem[] = [];
  for (let k = 0; k < pages; k++) {
    const boxes = boxesForPage(rules, k);
    for (const name of MARGIN_BOX_NAMES) {
      const box = boxes[name];
      if (!box?.content) continue;
      const isTop = name.startsWith('top');
      const col = name.endsWith('left') ? 0 : name.endsWith('center') ? 1 : 2;
      const css = { ...rules.baseStyle, ...box.style };
      const vertical = css['vertical-align'];
      delete css['vertical-align'];
      items.push({
        id: `${k}-${name}`,
        text: renderContent(box.content, k + 1, pages),
        style: {
          position: 'absolute',
          left: `${m.left + col * third}px`,
          top: `${isTop ? k * height : (k + 1) * height - m.bottom}px`,
          width: `${third}px`,
          height: `${isTop ? m.top : m.bottom}px`,
          display: 'flex',
          'align-items': vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center',
          'justify-content': col === 0 ? 'flex-start' : col === 1 ? 'center' : 'flex-end',
          'text-align': col === 0 ? 'left' : col === 1 ? 'center' : 'right',
          'box-sizing': 'border-box',
          overflow: 'hidden',
          ...css,
        },
      });
    }
  }
  return items;
}

/** Texto del aviso de un elemento que se parte mal al imprimir. */
export function describePageIssue(i: PageBreakIssue): string {
  if (i.kind === 'unsupported') {
    return i.element === 'string()'
      ? 'PDF: `string()` y `string-set` no los imprime Chromium (la caja de margen sale vacía y el preview la oculta). Usa un texto fijo o `counter(page)` en `@top-center`, `@bottom-center`, etc.'
      : 'PDF: `element()` y `position: running()` no los imprime Chromium (la caja de margen sale vacía y el preview la oculta). Usa un texto fijo o `counter(page)` en `@top-center`, `@bottom-center`, etc.';
  }
  const what = i.text ? `<${i.element}> «${i.text}»` : `<${i.element}>`;
  const sel = i.selector ?? i.element;
  return i.kind === 'cut'
    ? `Página ${i.page}: ${what} se corta entre páginas. Prueba con la regla CSS \`${sel} { break-inside: avoid; }\`.`
    : `Página ${i.page}: ${what} queda al final de la página, separado de su contenido. Prueba con \`${sel} { break-after: avoid; }\` o con un salto de página antes (\`break-before: page\`).`;
}

/** Identidad de un conjunto de avisos, para no repetirlos en la terminal al reflujo. */
export function pageIssuesKey(issues: PageBreakIssue[]): string {
  return issues.map((i) => `${i.kind}:${i.page}:${i.element}:${i.text}`).join('|');
}

export interface A11yIssue {
  rule: string;
  message: string;
  element: string;
  severity: string;
  htmlLine?: number;
  sig?: unknown;
}

export interface TerminalLine {
  type: 'success' | 'info' | 'error' | 'warning';
  message: string;
}

/** Líneas de terminal de la auditoría de accesibilidad; `locate` traduce el elemento a su línea de Pug. */
export function a11yReport(
  issues: A11yIssue[],
  locate: (sig: unknown) => { path: string; line: number; approximate?: boolean } | null,
): TerminalLine[] {
  if (issues.length === 0) {
    return [{ type: 'success', message: 'Auditoria basica: sin problemas detectados (contraste, alt, labels, encabezados).' }];
  }
  const lines: TerminalLine[] = [{ type: 'info', message: `Auditoria basica: ${issues.length} problema(s).` }];
  for (const i of issues) {
    const loc = locate(i.sig);
    const where = loc ? ` (${loc.path}:${loc.line}${loc.approximate ? ' ~' : ''})` : i.htmlLine ? ` (HTML linea ${i.htmlLine})` : '';
    lines.push({ type: i.severity === 'error' ? 'error' : 'warning', message: `[${i.rule}] ${i.message} <${i.element}>${where}` });
  }
  return lines;
}
