import { check, openApp, previewFrame, previewText, waitUntil } from '../lib.mjs';

// El JavaScript del usuario (plantilla, helpers y scripts del HTML renderizado) corre en iframes de origen
// opaco: no puede leer el almacenamiento de la app ni su DOM. Y el preview sigue funcionando por mensajes.
const PROBE = `
  var out = [];
  try { out.push('ls=' + localStorage.getItem('pug-ide-project')); } catch (e) { out.push('ls:' + e.name); }
  try { out.push('parent=' + parent.document.title); } catch (e) { out.push('parent:' + e.name); }
  try { out.push('idb=' + indexedDB.open('pug-ide-projects')); } catch (e) { out.push('idb:' + e.name); }
  try { out.push('cookie=' + document.cookie); } catch (e) { out.push('cookie:' + e.name); }
`;
const session = {
  projectName: 'Aislamiento SECRETO-123',
  files: {
    '/main.pug': `doctype html
html
  body
    h1 Titulo
    p#render
      - var out = [];
      - try { out.push('ls=' + localStorage.getItem('pug-ide-project')); } catch (e) { out.push('ls:' + e.name); }
      - try { out.push('parent=' + parent.document.title); } catch (e) { out.push('parent:' + e.name); }
      | #{out.join(' ')}
    p#out sin ejecutar
    script.
${PROBE.split('\n').map((l) => '      ' + l).join('\n')}
      document.getElementById('out').textContent = out.join(' ');
`,
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Titulo'));
  const text = await waitUntil(async () => { const t = await previewText(page); return t.includes('ls:') && t.includes('idb:') ? t : null; });
  check('15 el JavaScript de la plantilla (render) no puede leer localStorage ni el DOM de la app', !!text && text.includes('ls:SecurityError') && text.includes('parent:SecurityError') && !text.includes('SECRETO-123'), String(text));
  // document.cookie lanza SecurityError en Chromium y Firefox y devuelve '' en WebKit: en ningún caso se ven cookies de la app.
  check('15 el JavaScript del HTML renderizado (preview) tampoco: ni localStorage, ni el padre, ni IndexedDB, ni cookies',
    !!text && /ls:SecurityError parent:SecurityError idb:SecurityError cookie(:SecurityError|=)(\s|$)/.test(text), String(text));

  const sandboxes = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => ({ cls: f.className, sandbox: f.getAttribute('sandbox') })));
  check('15 ningún iframe de contenido del usuario tiene allow-same-origin', sandboxes.length >= 2 && sandboxes.every((f) => f.sandbox && !f.sandbox.includes('allow-same-origin')), JSON.stringify(sandboxes));
  check('15 la app no puede leer el DOM del preview', await page.evaluate(() => { try { return document.querySelector('.preview-iframe').contentDocument === null; } catch { return true; } }));

  // El inspector, la auditoría y el modo de color siguen funcionando por mensajes
  const frame = await previewFrame(page);
  await page.locator('button[title="Inspeccionar elemento"]').click();
  // La orden de activar el inspector llega al iframe por mensaje: se espera a que lo haya recibido (cursor en cruz).
  await waitUntil(async () => (await frame.evaluate(() => document.documentElement.style.cursor)) === 'crosshair');
  // El centro del h1 queda fuera de la zona visible del preview: se pulsa en su extremo izquierdo.
  const box = await frame.locator('h1').boundingBox();
  await page.mouse.click(box.x + 5, box.y + box.height / 2);
  const picked = await waitUntil(async () => (await page.locator('app-inspector-panel').innerText()).includes('main.pug:'));
  check('15 el inspector recibe el elemento clicado en el preview aislado y su línea de Pug', !!picked, await page.locator('app-inspector-panel').innerText());
  await page.locator('button[title="Inspeccionar elemento"]').click();

  await page.locator('button[title="Auditoria de accesibilidad (resultados en la terminal)"]').click();
  const audited = await waitUntil(async () => (await page.locator('app-terminal-panel').innerText()).includes('Auditoria basica'));
  check('15 la auditoría de accesibilidad devuelve su informe a la terminal', !!audited);

  const scheme = page.locator('button[title^="Modo de color simulado"]');
  await scheme.click(); // light
  await scheme.click(); // dark
  const dark = await waitUntil(async () => (await frame.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)) === true);
  check('15 el modo de color simulado llega al preview aislado', !!dark);
  // WebKit registra como error de página el intento deliberado de la plantilla de leer el DOM del padre (ya capturado con try/catch).
  const unexpected = app.errors.filter((e) => !/Blocked a frame/.test(e));
  check('15 sin errores no controlados ni peticiones externas', unexpected.length === 0 && app.external.length === 0, unexpected.concat(app.external).join(' | '));
  await app.close();

  await impresion(env);
  await urlsRelativas(env);
  await bucleInfinito(env);
  await pestanaNueva(env);
  await svgConScript(env);
}

// Una plantilla que no termina se cancela y la app sigue respondiendo
async function bucleInfinito(env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Bucle', files: { '/main.pug': 'p antes\n- while (true) {}\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
    wait: 1500,
  });
  const { page } = app;
  const banner = await waitUntil(async () => (await page.locator('.compile-error-text').allInnerTexts()).find((t) => t.includes('tardó más de 15 s')), 35000, 500);
  check('15 una plantilla con un bucle infinito se cancela con un error claro', !!banner, String(banner));
  check('15 mientras tanto la app responde', (await page.evaluate(() => 1 + 1)) === 2);
  await page.evaluate(() => window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug').setValue('p recuperado\n'));
  const back = await waitUntil(async () => (await previewText(page)).includes('recuperado'), 15000);
  check('15 al corregir la plantilla vuelve a renderizar (se crea un entorno nuevo)', !!back, await previewText(page));
  await app.close();
}

// «Abrir en pestaña nueva» muestra el preview en una página de la app, dentro de un iframe aislado
async function pestanaNueva(env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Pestaña', files: { '/main.pug': 'h1 Hola pestaña\nscript.\n  document.title = "cambiado por el usuario";\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Hola pestaña'));
  const popupPromise = page.context().waitForEvent('page', { timeout: 8000 });
  await page.locator('button[title="Abrir en una pestaña nueva"]').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  const shown = await waitUntil(async () => {
    for (const f of popup.frames()) {
      if (f === popup.mainFrame()) continue;
      try { if ((await f.evaluate(() => document.body.innerText)).includes('Hola pestaña')) return true; } catch { /* aún cargando */ }
    }
    return false;
  }, 8000);
  check('15 la pestaña nueva muestra el preview', !!shown);
  const host = await popup.evaluate(() => ({ url: location.pathname, title: document.title, sandbox: document.querySelector('iframe')?.getAttribute('sandbox') }));
  check('15 es la página anfitriona, con el HTML en un iframe sin allow-same-origin', host.url.endsWith('/assets/preview-host.html') && host.sandbox && !host.sandbox.includes('allow-same-origin'), JSON.stringify(host));
  check('15 el script del usuario no puede cambiar la página de la app', host.title === 'Vista previa · PugIDE', host.title);
  await popup.close();
  await app.close();
}

// Un SVG con <script> subido como asset se ve como imagen, sin ejecutarse con los permisos de la app
async function svgConScript(env) {
  const app = await openApp(env, { path: '/ide', session: { projectName: 'Svg', files: { '/main.pug': 'p x\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' } });
  const { page } = app;
  await page.locator('input[type="file"][multiple]').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><script>document.title="PWNED"; try{localStorage.setItem("x","1")}catch(e){}</script><rect width="40" height="40" fill="red"/></svg>'),
  });
  const row = page.locator('app-file-tree .file-item', { hasText: 'logo.svg' });
  await row.waitFor({ timeout: 8000 });
  const popupPromise = page.context().waitForEvent('page', { timeout: 8000 });
  await row.click();
  const popup = await popupPromise;
  const img = await waitUntil(async () => (await popup.locator('img').count()) === 1, 8000);
  check('15 un SVG de los assets se abre dentro de un <img>', !!img, popup.url());
  await popup.waitForTimeout(500);
  check('15 el script del SVG no se ejecuta', (await popup.title()) === 'Vista previa · PugIDE', await popup.title());
  await popup.close();
  await app.close();
}

// Imprimir ahora se hace desde dentro del iframe aislado: la app le manda un mensaje
async function impresion(env) {
  const app = await openApp(env, {
    path: '/ide',
    prefs: { previewDevice: 'PDF' },
    session: { projectName: 'Imprimir', files: { '/main.pug': 'h1 Para imprimir\np texto\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Para imprimir'));
  const frame = await previewFrame(page);
  await waitUntil(async () => (await page.locator('.pdf-bar').count()) === 1);
  // Se sustituye window.print dentro del iframe para ver qué hoja se pide (el diálogo real no se puede probar).
  await frame.evaluate(() => { window.__print = null; window.print = () => { window.__print = [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => t.includes('@page')); }; });
  await page.locator('button[title="Imprimir / Guardar como PDF"]').click();
  const printed = await waitUntil(async () => await frame.evaluate(() => window.__print), 6000);
  check('15 imprimir llega al iframe y fija la hoja A4 cuando la plantilla no declara @page', !!printed && printed.length === 1 && printed[0].includes('size: 1123px 794px'), JSON.stringify(printed));
  check('15 sin errores ni peticiones externas al imprimir', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}

// El preview es un srcdoc, que hereda la URL de la app como base: una referencia relativa que no es un asset no debe
// pedirse al servidor de la app (el CI lo detectó en la prueba sin conexión) y los enlaces #ancla siguen en el documento.
async function urlsRelativas(env) {
  const app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Rel', files: { '/main.pug': "h1 Relativas\nimg(src='images/falta.png' alt='')\nlink(rel='stylesheet' href='estilos/falta.css')\na#ir(href='#fin') Ir al final\np#fin Final\n" }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Relativas'));
  const frame = await previewFrame(page);
  await page.waitForTimeout(800);
  check('15 el documento del preview tiene por base su propio about:srcdoc', (await frame.evaluate(() => document.baseURI)) === 'about:srcdoc', await frame.evaluate(() => document.baseURI));
  const asked = app.requests.filter((u) => /\/(images|estilos)\//.test(u));
  if (env.browserName === 'firefox') {
    // Firefox resuelve esas referencias contra la URL del padre aunque la base sea about:srcdoc: un GET inofensivo al propio origen.
    console.log(`NOTE 15 Firefox pide ${asked.length} referencia(s) relativa(s) sin asset al servidor de la app (limitación conocida; no se comprueba)`);
  } else {
    check('15 las referencias relativas sin asset no se piden al servidor de la app', asked.length === 0, asked.join(', '));
  }
  await frame.locator('#ir').click();
  await page.waitForTimeout(300);
  check('15 un enlace #ancla se queda en el documento del preview', (await frame.evaluate(() => location.href)) === 'about:srcdoc#fin' && (await previewText(page)).includes('Relativas'), await frame.evaluate(() => location.href));
  check('15 sin errores no controlados (URLs relativas)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
