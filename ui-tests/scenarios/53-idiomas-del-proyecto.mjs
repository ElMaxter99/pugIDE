import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// P-22: «Idiomas del proyecto» (menú «Vista» → «Idiomas…»): idioma por defecto y de reserva.
const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.EXTRA')\n";
const FILES = {
  '/main.pug': PUG,
  '/locales/en/translations.json': '{\n  "HOME": { "TITLE": "Home", "EXTRA": "Extra text" }\n}\n',
  '/locales/es-ES/translations.json': '{\n  "HOME": { "TITLE": "Inicio", "EXTRA": "" }\n}\n',
};
const session = { projectName: 'Idiomas', files: FILES, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => /Home/.test(await previewText(page)), 15000);
  check('53 sin ajustes se abre el primer idioma por orden (en)', /Home/.test(await previewText(page)), await previewText(page));

  await page.locator('[data-testid="preview-view-menu"]').click();
  const item = page.locator('[role="menuitem"]', { hasText: 'Idiomas…' });
  await item.waitFor({ timeout: 4000 }).catch(() => undefined);
  check('53 el menú «Vista» ofrece «Idiomas…»', (await item.count()) === 1);
  await item.click();
  const dlg = page.locator('[data-testid="locales-dialog"]');
  await dlg.waitFor({ timeout: 4000 });
  check('53 el diálogo se llama «Idiomas del proyecto»', (await dlg.getAttribute('aria-label')) === 'Idiomas del proyecto');

  await page.locator('[data-testid="locales-default"]').selectOption('es-ES');
  await page.locator('[data-testid="locales-fallback"]').selectOption('es-ES');
  check('53 reserva igual a por defecto: avisa y no deja guardar', (await dlg.innerText()).includes('distinto') && (await page.locator('[data-testid="locales-save"]').isDisabled()));
  await page.locator('[data-testid="locales-fallback"]').selectOption('en');
  await page.locator('[data-testid="locales-save"]').click();
  await dlg.waitFor({ state: 'detached', timeout: 4000 });

  const ok = await waitUntil(async () => { const t = await previewText(page); return /Inicio/.test(t) && /Extra text/.test(t); }, 8000);
  check('53 se abre en es-ES y la clave vacía usa el texto del idioma de reserva', !!ok, await previewText(page));
  await app.close();
}
