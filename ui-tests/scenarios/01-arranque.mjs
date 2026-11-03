import { readFileSync } from 'node:fs';
import { check, openApp, previewText } from '../lib.mjs';

// Arranque del IDE con el proyecto demo: editor, preview, iconos y cero dependencias externas
export default async function (env) {
  const app = await openApp(env);
  const { page } = app;
  check('01 carga el editor Monaco desde el propio sitio', (await page.locator('.monaco-editor').count()) === 1);
  const text = await previewText(page);
  check('01 el preview muestra el proyecto demo', text.includes('Demo Completo'), text.slice(0, 80));
  const iconWidth = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.material-symbols-outlined')].find((e) => e.textContent.trim() === 'folder_open');
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  });
  check('01 los iconos se dibujan como icono (fuente local), no como texto', iconWidth !== null && iconWidth <= 30, String(iconWidth));
  // WebKit devuelve los nombres con comillas ("Geist Variable"), Chromium y Firefox sin ellas.
  const fonts = await page.evaluate(() => [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '')))]);
  check('01 tipografías locales cargadas', ['Geist Variable', 'Material Symbols Outlined'].every((f) => fonts.includes(f)), JSON.stringify(fonts));
  // La versión sale de package.json (import con nombre): si el import se rompiera, saldría «vundefined».
  const expected = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
  check('01 el Workspace muestra la versión de package.json', (await page.locator('.workspace-version').first().innerText()).trim() === `v${expected}`, await page.locator('.workspace-version').first().innerText());
  check('01 ninguna petición a servidores externos', app.external.length === 0, app.external.join(', '));
  check('01 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
