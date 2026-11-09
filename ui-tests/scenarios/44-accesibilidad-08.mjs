import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { check, closeDialog, openApp, openLogTab, waitUntil } from '../lib.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// 0.8, oleada 1: más estados bajo axe (contraste), paleta con aria-activedescendant, nombres y anuncios, textos en español.
async function audit(page, label) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  if (!(await page.evaluate(() => typeof globalThis.axe !== 'undefined'))) await page.evaluate(AXE_SOURCE);
  const res = await page.evaluate(() => axe.run(document, { exclude: [['.monaco-editor'], ['.preview-iframe']], resultTypes: ['violations'] }));
  const detail = res.violations.map((v) => `${v.id} x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join('>').replace(/\[_ngcontent[^\]]*\]/g, '').slice(0, 50) + ' ' + (n.any[0]?.message ?? '').slice(0, 260)).join(' ; ')}`).join(' | ');
  check(`44 accesibilidad: ${label}`, res.violations.length === 0, detail);
}

const session = {
  projectName: 'Accesible',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1= title\n    p= name\n", '/otra.pug': 'p otra\n' },
  openTabPaths: ['/main.pug', '/otra.pug'],
  activeTabPath: '/main.pug',
};

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });

  // --- Paleta: la opción activa se anuncia con aria-activedescendant y hay un recuento ---
  await page.keyboard.press('Control+k');
  const input = page.locator('[aria-label="Buscar comando"]');
  await input.waitFor();
  await page.keyboard.type('disposición');
  await waitUntil(async () => (await page.locator('[role="option"]').count()) >= 2);
  const first = await input.getAttribute('aria-activedescendant');
  check('44 la paleta apunta a la opción activa (aria-activedescendant)', !!first && (await page.locator(`#${first}[role="option"]`).count()) === 1, String(first));
  await page.keyboard.press('ArrowDown');
  await waitUntil(async () => (await input.getAttribute('aria-activedescendant')) !== first, 3000);
  const second = await input.getAttribute('aria-activedescendant');
  check('44 y cambia al pulsar ↓', !!second && second !== first && (await page.locator(`#${second}[aria-selected="true"]`).count()) === 1, `${first} -> ${second}`);
  check('44 la paleta anuncia el número de resultados', /\d+ resultados?/.test(await page.locator('.sr-status').innerText()), await page.locator('.sr-status').innerText());
  await page.keyboard.press('Escape');

  // --- Nombres ---
  const closeNames = await page.locator('.tab-close').evaluateAll((els) => els.map((e) => ({ name: e.getAttribute('aria-label'), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })));
  check('44 «Cerrar pestaña» tiene un nombre distinto por pestaña', new Set(closeNames.map((c) => c.name)).size === closeNames.length && closeNames.every((c) => /^Cerrar /.test(c.name)), JSON.stringify(closeNames));
  check('44 y mide al menos 24×24', closeNames.every((c) => c.w >= 24 && c.h >= 24), JSON.stringify(closeNames));
  check('44 el editor se llama «Editor de código»', (await page.locator('.monaco-editor textarea.inputarea').first().getAttribute('aria-label')) === 'Editor de código' || /Editor de código/.test((await page.locator('.monaco-editor').first().getAttribute('aria-label')) ?? ''), String(await page.locator('.monaco-editor textarea.inputarea').first().getAttribute('aria-label')));

  // --- Anuncios: disposición y dispositivo ---
  const said = () => page.locator('[data-testid="announcer"]').innerText();
  await page.keyboard.press('Control+Alt+3');
  check('44 se anuncia el cambio de disposición', !!(await waitUntil(async () => /Disposición: Foco en el editor/.test(await said()), 4000)), await said());
  await page.keyboard.press('Control+Alt+1');
  await waitUntil(async () => /Editor \+ vista previa/.test(await said()), 4000);
  await page.locator('button[title="PDF / página impresa"]').click();
  check('44 se anuncia el cambio de dispositivo', !!(await waitUntil(async () => /Vista previa: modo PDF/.test(await said()), 4000)), await said());
  await page.locator('button[title="Escritorio"], .device-btn').first().click().catch(() => undefined);

  // --- Contraste y nombres en más estados (axe), oscuro y claro ---
  for (const theme of ['oscuro', 'claro']) {
    if (theme === 'claro') { await page.locator('button[title="Cambiar tema claro u oscuro"]').click(); await page.waitForTimeout(400); }
    await openLogTab(page);
    await page.locator('[data-testid="log-filter-all"]').click();
    await audit(page, `Registro «Todo» (${theme})`);
    await page.locator('app-terminal-panel .terminal-action[title*="Limpiar"], app-terminal-panel button[aria-label*="Limpiar"]').first().click().catch(() => undefined);
    await audit(page, `Registro vacío (${theme})`);
    await page.locator('[data-testid="layout-menu"] button, [data-testid="layout-menu"]').first().click();
    await page.locator('[role="menu"]').first().waitFor({ timeout: 4000 });
    await audit(page, `menú «Disposición» abierto (${theme})`);
    await page.keyboard.press('Escape');
    await page.locator('.inspector-btn').click();
    await audit(page, `Inspector activo (${theme})`);
    await page.locator('.inspector-btn').click();
  }
  check('44 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
