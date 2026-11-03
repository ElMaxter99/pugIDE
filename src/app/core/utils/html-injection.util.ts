/** Injects `content` right before `</head>` (or at the start of `<body>`/the document if there's no `<head>`). */
export function injectIntoHead(html: string, content: string): string {
  if (!content) return html;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${content}\n</head>`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body[^>]*>/i, (match) => `${match}\n${content}`);
  }
  return `${content}\n${html}`;
}

/** Injects `content` right before `</body>` (or appends at the end if there's no `<body>`). */
export function injectIntoBody(html: string, content: string): string {
  if (!content) return html;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${content}\n</body>`);
  }
  return `${html}\n${content}`;
}

/**
 * Fija la URL base del documento a la suya propia (`about:srcdoc`). Un `srcdoc` hereda la URL de la app como base,
 * así que una referencia relativa que no se resuelve a un asset (`images/falta.png`) se pediría al servidor de la
 * propia app. Con esta base la URL relativa no es válida y no sale ninguna petición, y los enlaces `#ancla` siguen
 * siendo del mismo documento. Si la plantilla ya define su `<base>`, se respeta.
 */
export function pinBaseUrl(html: string): string {
  if (/<base\b/i.test(html)) return html;
  const base = '<base href="about:srcdoc">';
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(?:\s[^>]*)?>/i, (m) => `${m}${base}`);
  if (/<html(?:\s[^>]*)?>/i.test(html)) return html.replace(/<html(?:\s[^>]*)?>/i, (m) => `${m}<head>${base}</head>`);
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  return doctype ? doctype[0] + base + html.slice(doctype[0].length) : base + html;
}
