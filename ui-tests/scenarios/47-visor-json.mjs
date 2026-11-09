import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { check, openApp, waitUntil } from '../lib.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// P-17: visor de JSON en árbol (estilo Firefox) para los .json y, con más, para los archivos de idioma.
const ES = '{\n  "HOME": {\n    "TITLE": "Hola",\n    "INTRO": "Bienvenido a tu informe",\n    "CTA": ""\n  },\n  "ITEMS": [\n    "Informe",\n    "Factura",\n    ""\n  ],\n  "LIMIT": 50,\n  "ACTIVE": true,\n  "NOTES": null\n}\n';
const EN = '{\n  "HOME": { "TITLE": "Hello", "INTRO": "Welcome", "CTA": "Go", "SIGNATURE": "Bye" }\n}\n';
const PUG = "doctype html\nhtml\n  body\n    h1= t('HOME.TITLE')\n    p= t('HOME.INTRO')\n";
const session = {
  projectName: 'Visor',
  files: { '/main.pug': PUG, '/locales/es-ES/translations.json': ES, '/locales/en/translations.json': EN, '/data.json': '{ "a": 1 }\n', '/roto.json': '{\n  "a": 1,\n  "b": \n}\n' },
  openTabPaths: ['/main.pug', '/locales/es-ES/translations.json'],
  activeTabPath: '/locales/es-ES/translations.json',
};

async function audit(page, label) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  if (!(await page.evaluate(() => typeof globalThis.axe !== 'undefined'))) await page.evaluate(AXE_SOURCE);
  const res = await page.evaluate(() => axe.run(document, { exclude: [['.monaco-editor'], ['.preview-iframe']], resultTypes: ['violations'] }));
  check(`47 accesibilidad: ${label}`, res.violations.length === 0, res.violations.map((v) => `${v.id} x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => (n.any[0]?.message ?? '').slice(0, 120)).join(' ; ')}`).join(' | '));
}

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  if ((process.env.PUGIDE_BROWSER ?? 'chromium') === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const viewer = page.locator('[data-testid="json-viewer"]');
  await viewer.waitFor({ timeout: 25000 });
  const paths = () => page.locator('[data-testid="json-tree"] [role="row"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-path')));

  // --- Por defecto, árbol en los archivos de idioma ---
  check('47 un archivo de idioma se abre en árbol', (await viewer.count()) === 1 && (await page.locator('.monaco-host.hidden').count()) === 1);
  check('47 las filas salen en orden, con sus padres', JSON.stringify(await paths()) === JSON.stringify(['HOME', 'HOME.TITLE', 'HOME.INTRO', 'HOME.CTA', 'HOME.SIGNATURE', 'ITEMS', 'ITEMS.0', 'ITEMS.1', 'ITEMS.2', 'LIMIT', 'ACTIVE', 'NOTES']), JSON.stringify(await paths()));
  check('47 es un treegrid con nombre y niveles', (await page.locator('[role="treegrid"]').getAttribute('aria-label')) === 'Árbol de es-ES/translations.json' && (await page.locator('[role="row"][data-path="HOME.TITLE"]').getAttribute('aria-level')) === '2');
  check('47 los objetos y arrays llevan su recuento', /\{4\}/.test(await page.locator('[role="row"][data-path="HOME"]').innerText()) && /\[3\]/.test(await page.locator('[role="row"][data-path="ITEMS"]').innerText()));
  check('47 los vacíos llevan «sin traducir» y lo que falta lleva «falta»', /sin traducir/.test(await page.locator('[role="row"][data-path="HOME.CTA"]').innerText()) && /falta/.test(await page.locator('[role="row"][data-path="HOME.SIGNATURE"]').innerText()));
  await audit(page, 'visor en árbol (oscuro)');

  // --- Plegar y desplegar ---
  const is = async (want) => !!(await waitUntil(async () => (await paths()).join() === want, 3000));
  await page.locator('[role="row"][data-path="HOME"]').click();
  check('47 clic en un objeto lo pliega', await is('HOME,ITEMS,ITEMS.0,ITEMS.1,ITEMS.2,LIMIT,ACTIVE,NOTES'), (await paths()).join());
  await page.getByRole('button', { name: 'Contraer todo' }).click();
  check('47 «Contraer todo» deja solo el primer nivel', await is('HOME,ITEMS,LIMIT,ACTIVE,NOTES'), (await paths()).join());
  await page.getByRole('button', { name: 'Expandir todo' }).click();
  check('47 «Expandir todo» lo abre todo', !!(await waitUntil(async () => (await paths()).length === 12, 3000)), String((await paths()).length));

  // --- Filtro ---
  await page.locator('[data-testid="json-filter"]').fill('inf');
  check('47 el filtro deja las coincidencias con sus padres', await is('HOME,HOME.INTRO,ITEMS,ITEMS.0'), (await paths()).join());
  check('47 y cuenta las coincidencias', /2 coincidencias/.test(await page.locator('[data-testid="json-matches"]').innerText()));
  check('47 marca la coincidencia en el valor', (await page.locator('[role="row"][data-path="HOME.INTRO"] mark').count()) === 1 && (await page.locator('[role="row"][data-path="HOME.INTRO"] mark').innerText()) === 'inf');
  await page.locator('[data-testid="json-filter"]').fill('zzz');
  check('47 sin coincidencias lo dice', /Ninguna clave ni valor coincide/.test(await page.locator('[data-testid="json-tree"]').innerText()));
  await page.locator('[data-testid="json-filter"]').fill('');

  // --- Solo sin traducir ---
  const chip = page.locator('[data-testid="json-pending"]');
  check('47 «Solo sin traducir» cuenta vacías y las que faltan (3)', /\(3\)/.test(await chip.innerText()), await chip.innerText());
  await chip.click();
  check('47 el filtro deja solo lo pendiente con sus padres', await is('HOME,HOME.CTA,HOME.SIGNATURE,ITEMS,ITEMS.2'), (await paths()).join());
  await chip.click();

  // --- Teclado ---
  await page.locator('[role="row"][data-path="HOME.TITLE"]').focus();
  await page.keyboard.press('ArrowDown');
  check('47 ↓ mueve el foco a la fila siguiente', !!(await waitUntil(async () => (await page.evaluate(() => document.activeElement?.getAttribute('data-path'))) === 'HOME.INTRO', 3000)));
  await page.keyboard.press('ArrowLeft');
  check('47 ← en un hijo sube a su padre', !!(await waitUntil(async () => (await page.evaluate(() => document.activeElement?.getAttribute('data-path'))) === 'HOME', 3000)));
  await page.keyboard.press('ArrowLeft');
  check('47 ← en un objeto abierto lo pliega', !!(await waitUntil(async () => !(await paths()).includes('HOME.TITLE'), 3000)));
  await page.keyboard.press('ArrowRight');
  check('47 → lo despliega', !!(await waitUntil(async () => (await paths()).includes('HOME.TITLE'), 3000)));
  await page.keyboard.press('End');
  check('47 Fin va a la última fila', !!(await waitUntil(async () => (await page.evaluate(() => document.activeElement?.getAttribute('data-path'))) === 'NOTES', 3000)));
  await page.keyboard.press('/');
  check('47 / enfoca el filtro', await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'json-filter');

  // --- Menú de la fila ---
  await page.locator('[role="row"][data-path="HOME.TITLE"]').focus();
  await page.keyboard.press('Shift+F10');
  const menu = page.locator('app-json-viewer [role="menu"]');
  await menu.waitFor({ timeout: 4000 });
  const labels = (await menu.locator('[role="menuitem"]').allInnerTexts()).map((t) => t.trim());
  check('47 el menú ofrece copiar ruta, valor, editar y ver en la plantilla', labels.length === 4 && /Copiar ruta \(HOME\.TITLE\)/.test(labels[0]) && /Ver en la plantilla \(main\.pug:4\)/.test(labels[3]), JSON.stringify(labels));
  await page.keyboard.press('Enter');
  const said = await waitUntil(async () => /Ruta copiada|No se pudo copiar/.test(await page.locator('app-json-viewer .sr-live').innerText()), 4000);
  check('47 «Copiar ruta» lo anuncia', !!said, await page.locator('app-json-viewer .sr-live').innerText());
  if ((process.env.PUGIDE_BROWSER ?? 'chromium') === 'chromium') check('47 y copia HOME.TITLE', (await page.evaluate(() => navigator.clipboard.readText())) === 'HOME.TITLE');

  await page.locator('[role="row"][data-path="HOME.INTRO"]').focus();
  await page.keyboard.press('Shift+F10');
  await menu.waitFor();
  await page.locator('app-json-viewer [role="menuitem"]', { hasText: 'Editar en el código' }).click();
  await viewer.waitFor({ state: 'detached', timeout: 5000 });
  const line = await waitUntil(async () => page.evaluate(() => window.monaco.editor.getEditors()[0]?.getPosition()?.lineNumber), 5000);
  check('47 «Editar en el código» pasa a Código en la línea de la clave', line === 4, String(line));
  check('47 y lo recuerda por tipo de archivo', (await page.evaluate(() => JSON.parse(localStorage.getItem('pug-ide-preferences') ?? '{}').jsonView?.translations)) === 'code');
  await page.locator('[data-testid="json-view-tree"]').click();
  await viewer.waitFor({ timeout: 5000 });
  check('47 «Árbol» vuelve al visor', (await viewer.count()) === 1);

  await page.locator('[role="row"][data-path="HOME.TITLE"]').focus();
  await page.keyboard.press('Shift+F10');
  await menu.waitFor();
  await page.locator('app-json-viewer [role="menuitem"]', { hasText: 'Ver en la plantilla' }).click();
  check('47 «Ver en la plantilla» abre main.pug', !!(await waitUntil(async () => (await page.locator('.tab-main[aria-current="true"]').innerText()).includes('main.pug'), 4000)));
  check('47 en la línea donde se usa la clave', (await waitUntil(async () => page.evaluate(() => window.monaco.editor.getEditors()[0]?.getPosition()?.lineNumber), 4000)) === 4);

  // --- Otros .json: por defecto, código; el conmutador los pasa a árbol (sin «sin traducir») ---
  await page.locator('app-file-tree .file-item', { hasText: 'data.json' }).click();
  await page.locator('[data-testid="json-view-code"]').waitFor();
  check('47 un .json cualquiera se abre en código', (await viewer.count()) === 0 && (await page.locator('[data-testid="json-view-code"]').getAttribute('aria-pressed')) === 'true');
  await page.locator('[data-testid="json-view-tree"]').click();
  await viewer.waitFor();
  check('47 y en árbol no ofrece «sin traducir»', (await page.locator('[data-testid="json-pending"]').count()) === 0 && (await paths()).join() === 'a');
  await page.locator('[data-testid="json-view-code"]').click();

  // --- JSON no válido ---
  await page.locator('app-file-tree .file-item', { hasText: 'roto.json' }).click();
  await page.locator('[data-testid="json-view-tree"]').click();
  const err = page.locator('[data-testid="json-error"]');
  await err.waitFor({ timeout: 5000 });
  check('47 un JSON no válido dice el error y su línea', /línea \d+/.test(await err.innerText()), await err.innerText());
  await err.getByRole('button', { name: 'Ir al error' }).click();
  check('47 «Ir al error» pasa a Código', !!(await waitUntil(async () => (await viewer.count()) === 0, 4000)));
  await page.locator('[data-testid="json-view-code"]').click();

  // --- Claro ---
  await page.locator('app-file-tree .file-item', { hasText: 'translations.json' }).first().click();
  await page.locator('[data-testid="json-view-tree"]').click();
  await viewer.waitFor();
  await page.locator('button[title="Cambiar tema claro u oscuro"]').click();
  await page.waitForTimeout(400);
  await audit(page, 'visor en árbol (claro)');
  check('47 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();

  // --- Un JSON grande no pinta todas las filas ---
  const big = JSON.stringify(Object.fromEntries(Array.from({ length: 6000 }, (_, i) => [`K${i}`, `valor ${i}`])));
  const app2 = await openApp(env, { path: '/ide', session: { projectName: 'Grande', files: { '/main.pug': 'p x\n', '/grande.json': big }, openTabPaths: ['/grande.json'], activeTabPath: '/grande.json' }, prefs: { jsonView: { translations: 'tree', other: 'tree' } } });
  await app2.page.locator('[data-testid="json-viewer"]').waitFor({ timeout: 25000 });
  const rendered = await app2.page.locator('[data-testid="json-tree"] [role="row"]').count();
  check('47 un JSON de 6000 claves pinta solo las filas visibles', rendered > 0 && rendered < 120, String(rendered));
  check('47 pero sabe cuántas hay (aria-rowcount)', (await app2.page.locator('[role="treegrid"]').getAttribute('aria-rowcount')) === '6000');
  await app2.page.locator('[data-testid="json-filter"]').fill('valor 5999');
  check('47 el filtro sobre un JSON grande encuentra la última', !!(await waitUntil(async () => /1 coincidencia/.test(await app2.page.locator('[data-testid="json-matches"]').innerText()), 5000)));
  await app2.close();
}
