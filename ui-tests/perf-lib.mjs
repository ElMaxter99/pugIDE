// Medidas de rendimiento compartidas por `scripts/perf.mjs` y el escenario 27 (Playwright sobre el build de producción).
// No es un escenario: `run.mjs` solo carga lo que hay en `scenarios/`.
import { openApp, previewFrame, sleep } from './lib.mjs';

/** Hoja A4 en px CSS (96 dpi), como la que calcula la app para `@page { size: A4 }`. */
export const A4_HEIGHT = (297 * 96) / 25.4;

/** Tabla con cabecera de dos columnas y `rows` filas de 28 px; `@page { size: A4; margin: 0 }`. El código fuente es corto: las filas salen de un bucle. */
export const tablePug = (rows, note = 'Informe') => `doctype html
html
  head
    style.
      @page { size: A4; margin: 0 }
      body { margin: 0; font: 11pt/1.2 Arial, sans-serif }
      table { width: 100%; border-collapse: collapse }
      thead th { height: 40px; background: #cde; text-align: left; padding: 0 8px; border-bottom: 2px solid #468 }
      td { height: 28px; padding: 0 8px; border-bottom: 1px solid #999 }
  body
    h1 ${note}
    table
      thead
        tr
          th Referencia
          th Importe
          th Estado
      tbody
        - for (let r = 0; r < ${rows}; r++)
          tr
            td Fila #{r}
            td #{r * 10}
            td Pendiente
`;

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Registra en la ventana de la app cuándo llegan los mensajes del iframe del preview (el reloj es el de la app). */
export async function installProbe(page) {
  await page.evaluate(() => {
    if (window.__perf) return;
    window.__perf = [];
    window.addEventListener('message', (e) => {
      const s = e.data && e.data.source;
      if (s === 'pugide-layout-result' || s === 'pugide-runtime-ready') window.__perf.push({ s, t: performance.now(), h: e.data.contentHeight });
    });
  });
}

/** Abre un proyecto de una sola plantilla en modo PDF y devuelve la app lista (el preview ya pintó). */
export async function openPdfProject(env, source, { timeout = 60000 } = {}) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Rendimiento', files: { '/main.pug': source }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    prefs: { previewDevice: 'PDF' },
    viewport: { width: 1500, height: 900 },
    wait: 0,
  });
  await installProbe(app.page);
  await waitSettled(app.page, timeout);
  return app;
}

/** Espera a que lleguen resultados de maquetación y pasen 600 ms sin ninguno nuevo (tipografías, observadores…). */
export async function waitSettled(page, timeout = 60000) {
  const end = Date.now() + timeout;
  let last = -1;
  let stableSince = Date.now();
  while (Date.now() < end) {
    const n = await page.evaluate(() => window.__perf.filter((x) => x.s === 'pugide-layout-result').length);
    if (n !== last) { last = n; stableSince = Date.now(); }
    else if (n > 0 && Date.now() - stableSince > 600) return;
    await sleep(100);
  }
  throw new Error('el preview no llegó a asentarse');
}

/**
 * Vuelve a paginar el documento del preview (PDF) y devuelve los ms entre enviar `pugide-layout` al iframe y recibir
 * `pugide-layout-result`: es exactamente `resetPagination + paginateDocument + findPageBreakIssues + medir`.
 */
export async function repaginate(page, timeout = 60000) {
  await waitSettled(page, timeout);
  return page.evaluate(({ height, timeout }) => new Promise((resolve, reject) => {
    const frame = document.querySelector('iframe.preview-iframe');
    const timer = setTimeout(() => reject(new Error('sin respuesta del paginado')), timeout);
    const t0 = performance.now();
    const on = (e) => {
      if (e.source !== frame.contentWindow || !e.data || e.data.source !== 'pugide-layout-result') return;
      window.removeEventListener('message', on);
      clearTimeout(timer);
      resolve(performance.now() - t0);
    };
    window.addEventListener('message', on);
    frame.contentWindow.postMessage({
      source: 'pugide-layout', pdf: true,
      geometry: { pageHeight: height, marginTop: 0, marginRight: 0, marginBottom: 0, marginLeft: 0 },
    }, '*');
  }), { height: A4_HEIGHT, timeout });
}

/** Cambia el texto de /main.pug en Monaco (como si se escribiera). */
export const setMain = (page, text) => page.evaluate((t) => {
  window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue(t);
}, text);

/**
 * Ms desde que se cambia el código hasta que el preview muestra `marker` (texto visible) y, si `layout`, hasta que
 * llega el resultado de maquetación de ese documento. Incluye el debounce de 300 ms de la app y la compilación.
 */
export async function changeAndWait(page, source, marker, { layout = false, ready = () => true, timeout = 60000 } = {}) {
  const t0 = await page.evaluate(() => { window.__perf.length = 0; return performance.now(); });
  await setMain(page, source);
  const end = Date.now() + timeout;
  let seen = null;
  while (Date.now() < end) {
    const frame = await previewFrame(page);
    const ok = frame && await frame.evaluate((m) => (document.body?.innerText ?? '').includes(m), marker).catch(() => false)
      && await frame.evaluate(ready).catch(() => false);
    if (ok) {
      // En la app, `pugide-runtime-ready` marca el documento escrito; luego llega su maquetación.
      const events = await page.evaluate(() => window.__perf);
      if (!layout) {
        seen = await page.evaluate(() => performance.now());
        break;
      }
      const readyAt = events.find((r) => r.s === 'pugide-runtime-ready')?.t;
      const done = readyAt !== undefined && events.find((e) => e.s === 'pugide-layout-result' && e.t >= readyAt);
      if (done) { seen = done.t; break; }
    }
    await sleep(5);
  }
  if (seen === null) throw new Error(`el preview no mostró «${marker}» a tiempo`);
  return seen - t0;
}

/** SVG válido de ~`bytes` bytes (un comentario de relleno): un asset pesado que el navegador decodifica rápido. */
export function bigSvg(bytes = 3 * 1024 * 1024) {
  const head = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="teal"/><!--';
  const tail = '--></svg>';
  return Buffer.from(head + 'x'.repeat(Math.max(0, bytes - head.length - tail.length)) + tail);
}

export const ASSET_PUG = (note) => [
  'doctype html', 'html', '  body', '    h1 Informe con imagen pesada', "    img#big(src='images/grande.svg' alt='')", `    p ${note}`,
].join('\n') + '\n';

/** Abre el IDE con una plantilla que usa un asset de ~`bytes` bytes subido por la interfaz; devuelve la app con el asset ya visible. */
export async function openAssetProject(env, bytes = 3 * 1024 * 1024) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Asset pesado', files: { '/main.pug': ASSET_PUG('inicial') }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    wait: 1500,
  });
  const { page } = app;
  await installProbe(page);
  await page.locator('input[type="file"][multiple]').setInputFiles({ name: 'grande.svg', mimeType: 'image/svg+xml', buffer: bigSvg(bytes) });
  await page.locator('app-file-tree .file-item', { hasText: 'grande.svg' }).waitFor({ timeout: 15000 });
  return app;
}

export const imgLoaded = () => {
  const el = document.getElementById('big');
  return !!el && el.complete && el.naturalWidth === 40;
};
