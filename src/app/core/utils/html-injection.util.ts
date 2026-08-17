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
