// Captura el DOM renderizado de la app real y lo convierte en el marcado de una mesa .dc.html.
import { extractInPage } from './extract-page.mjs';

export const FONT_BLOB = process.env.PUGIDE_ICON_FONT_URL || '/_blob/a1e6a2e0ce9eea97aa55042333c97737';

/** Congela animaciones (la CSP de producción bloquea estilos en línea: el contexto se abre con bypassCSP). */
export async function freeze(page) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
}

export async function capture(page, { width = 1440, height = 900, hrefs = [] } = {}) {
  await freeze(page);
  const r = await page.evaluate(extractInPage, { rootSelector: 'body', width, height, hrefs });
  let html = r.html;
  let placeholderColor = r.placeholderColor;
  const refSeed = r.refs;
  for (let n = 0; n < r.frames; n++) {
    const handle = await page.locator(`[data-cap-frame="${n}"]`).first().elementHandle();
    const frame = handle ? await handle.contentFrame() : null;
    let sub = '';
    if (frame) {
      const dims = await frame.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      const rr = await frame.evaluate(extractInPage, { rootSelector: 'body', width: dims.w, height: dims.h, isFrame: true, refSeed });
      sub = rr.html;
    }
    html = html.replace(`\u0001FRAME:${n}\u0001`, () => sub);
  }
  return { html, placeholderColor, width, height };
}

/** Archivo .dc.html completo de una mesa. */
export function boardHtml({ title, html, width = 1440, height = 900, placeholderColor }) {
  const ph = placeholderColor ? `input::placeholder,textarea::placeholder{color:${placeholderColor};opacity:1}\n` : '';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:100 700;font-display:block;src:url(${FONT_BLOB}) format('woff2')}
body{margin:0}
*,*::before,*::after{box-sizing:border-box}
${ph}</style>
</helmet>
${html}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${width},"height":${height}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`;
}
