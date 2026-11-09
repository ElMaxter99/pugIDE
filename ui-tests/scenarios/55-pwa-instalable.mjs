import { check, openApp } from '../lib.mjs';

// Fase 0 de escritorio: PugIDE se puede instalar como PWA (Chrome, Edge, Safari «Añadir al Dock»…). Estas son las condiciones
// que los navegadores exigen para ofrecer «Instalar»: manifiesto con nombre, start_url, display y los iconos de 192 y 512 px.
export default async function (env) {
  const app = await openApp(env, { path: '/ide' });
  const { page } = app;

  const info = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const href = link?.getAttribute('href') ?? null;
    if (!href) return { href: null };
    const res = await fetch(href);
    const manifest = await res.json();
    const base = new URL(href, location.href);
    const icons = [];
    for (const i of manifest.icons ?? []) {
      const r = await fetch(new URL(i.src, base));
      icons.push({ src: i.src, sizes: i.sizes, purpose: i.purpose, type: i.type, ok: r.ok, mime: r.headers.get('content-type') ?? '' });
    }
    return {
      href, ok: res.ok, mime: res.headers.get('content-type') ?? '', manifest, icons,
      appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
      themeColor: !!document.querySelector('meta[name="theme-color"]'),
    };
  });

  check('55 la página enlaza su manifiesto', !!info.href, String(info.href));
  check('55 el manifiesto se sirve con su tipo', info.ok && /manifest\+json|json/.test(info.mime), info.mime);
  const m = info.manifest ?? {};
  check('55 tiene nombre y nombre corto', m.name === 'PugIDE' && !!m.short_name);
  check('55 se abre en ventana propia (display standalone)', m.display === 'standalone');
  check('55 arranca en el IDE y dentro de su ámbito', m.start_url === '/ide' && m.scope === '/', `${m.start_url} ${m.scope}`);
  check('55 declara su idioma', m.lang === 'es');
  const has = (size, purpose) => (info.icons ?? []).some((i) => i.sizes === size && (i.purpose ?? 'any').includes(purpose) && i.ok && /png/.test(i.mime));
  check('55 tiene los iconos de 192 y 512 px (PNG que cargan)', has('192x192', 'any') && has('512x512', 'any'), JSON.stringify(info.icons));
  check('55 tiene icono «maskable» (se recorta bien en Android y ChromeOS)', has('512x512', 'maskable'));
  check('55 tiene icono para iOS y color de tema', info.appleIcon && info.themeColor);
  check('55 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
