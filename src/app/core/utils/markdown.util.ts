/**
 * Markdown básico para el filtro `:markdown` de Pug (también `:markdown-it` y `:marked`), sin librerías: los
 * filtros de Pug de Node no existen en el navegador. Cubre lo habitual —encabezados, párrafos, énfasis, código,
 * enlaces, imágenes, listas (anidadas), citas y reglas— y NO deja pasar HTML: todo se escapa, y los enlaces
 * `javascript:` se anulan. Sin Angular ni DOM.
 */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Solo http(s), mailto, tel, anclas, rutas relativas y imágenes `data:`; el resto (p. ej. `javascript:`) se anula. */
function safeUrl(raw: string): string {
  const url = raw.trim().replace(/&amp;/g, '&');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
  if (!scheme) return escapeHtml(url);
  if (['http', 'https', 'mailto', 'tel'].includes(scheme)) return escapeHtml(url);
  if (scheme === 'data' && /^data:image\//i.test(url)) return escapeHtml(url);
  return '#';
}

/** Énfasis, código, enlaces e imágenes dentro de una línea o párrafo. */
export function renderInline(src: string): string {
  const codes: string[] = [];
  // El código va primero y protegido: lo que lleva dentro no se interpreta.
  let out = escapeHtml(src).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _t, code: string) => {
    codes.push(`<code>${code.trim()}</code>`);
    return `\uE000${codes.length - 1}\uE000`;
  });
  out = out
    .replace(/!\[([^\]]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      (_m, alt: string, url: string, title?: string) => `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ''}>`)
    .replace(/\[([^\]]+)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      (_m, text: string, url: string, title?: string) => `<a href="${safeUrl(url)}"${title ? ` title="${title}"` : ''}>${text}</a>`)
    .replace(/&lt;((?:https?:\/\/|mailto:)[^\s&]+)&gt;/g, (_m, url: string) => `<a href="${safeUrl(url)}">${url}</a>`)
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>')
    .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w_])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/ {2,}\n/g, '<br>\n');
  return out.replace(/\uE000(\d+)\uE000/g, (_m, i: string) => codes[Number(i)]);
}

const FENCE = /^\s*(```+|~~~+)\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;

const isBlank = (l: string): boolean => l.trim() === '';

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line) || LIST_ITEM.test(line);
}

/** Markdown (subconjunto) -> HTML. */
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return renderBlocks(dedent(lines));
}

function dedent(lines: string[]): string[] {
  const indents = lines.filter((l) => !isBlank(l)).map((l) => /^ */.exec(l)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(Math.min(min, /^ */.exec(l)![0].length)));
}

function renderBlocks(lines: string[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[i])) body.push(lines[i++]);
      i++; // cierre
      const cls = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      out.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      i++;
      continue;
    }

    if (HR.test(line)) { out.push('<hr>'); i++; continue; }

    if (QUOTE.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && (QUOTE.test(lines[i]) || (!isBlank(lines[i]) && quote.length && !startsBlock(lines[i])))) {
        quote.push(QUOTE.exec(lines[i])?.[1] ?? lines[i]);
        i++;
      }
      out.push(`<blockquote>${renderBlocks(quote)}</blockquote>`);
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const { html, next } = renderList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    // Párrafo: hasta una línea en blanco o el inicio de otro bloque.
    const para: string[] = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) para.push(lines[i++]);
    out.push(`<p>${renderInline(para.join('\n'))}</p>`);
  }
  return out.join('\n');
}

function renderList(lines: string[], start: number): { html: string; next: number } {
  const first = LIST_ITEM.exec(lines[start])!;
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items: string[][] = [];
  let i = start;
  while (i < lines.length) {
    const m = LIST_ITEM.exec(lines[i]);
    if (m && m[1].length === baseIndent && /\d/.test(m[2]) === ordered) {
      items.push([m[3]]);
      i++;
    } else if (m && m[1].length > baseIndent && items.length) {
      items[items.length - 1].push(lines[i].slice(baseIndent + 2)); // sublista
      i++;
    } else if (isBlank(lines[i]) && i + 1 < lines.length && (LIST_ITEM.test(lines[i + 1]) && LIST_ITEM.exec(lines[i + 1])![1].length >= baseIndent)) {
      i++;
    } else if (!isBlank(lines[i]) && items.length && /^\s+\S/.test(lines[i]) && !startsBlock(lines[i])) {
      items[items.length - 1].push(lines[i].trim()); // continuación del texto del elemento
      i++;
    } else {
      break;
    }
  }
  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && Number.parseInt(first[2], 10) > 1 ? ` start="${Number.parseInt(first[2], 10)}"` : '';
  const body = items.map((item) => {
    const html = renderBlocks(item);
    // Elemento "apretado": un párrafo (con su sublista, si la hay) se muestra sin <p>.
    const tight = /^<p>((?:(?!<\/p>)[\s\S])*)<\/p>(\n<(?:ul|ol)[\s\S]*)?$/.exec(html);
    return `<li>${tight ? tight[1] + (tight[2] ?? '') : html}</li>`;
  }).join('\n');
  return { html: `<${tag}${startAttr}>\n${body}\n</${tag}>`, next: i };
}
