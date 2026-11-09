import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { deflateSync, strToU8 } from 'fflate';
import { check, chooseMenu, libraryNames, openApp, projectName, waitUntil } from '../lib.mjs';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// Compartir (P-15 y P-16): crear el enlace con caducidad y contraseña; abrirlo como proyecto nuevo por defecto.
const session = (name, files = { '/main.pug': 'h1 Mi trabajo\n' }) => ({ projectName: name, files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' });
const b64url = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const plainPayload = (o) => b64url(deflateSync(strToU8(JSON.stringify(o)), { level: 9 }));

async function audit(page, label) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  if (!(await page.evaluate(() => typeof globalThis.axe !== 'undefined'))) await page.evaluate(AXE_SOURCE);
  const res = await page.evaluate(() => axe.run(document, { exclude: [['.monaco-editor'], ['.preview-iframe']], resultTypes: ['violations'] }));
  check(`46 accesibilidad: ${label}`, res.violations.length === 0, res.violations.map((v) => `${v.id} x${v.nodes.length}`).join(' | '));
}

export default async function (env) {
  // --- Crear el enlace ---
  let app = await openApp(env, { path: '/ide', session: session('Informe') });
  let { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  await chooseMenu(page, 'exportar', 'share');
  const create = page.locator('[data-testid="share-create"]');
  await create.waitFor({ timeout: 5000 });
  check('46 «Compartir proyecto» propone 7 días por defecto', (await create.locator('[role="radio"][aria-checked="true"]').innerText()).trim() === '7 días');
  await audit(page, 'diálogo Compartir proyecto');
  await create.locator('#share-password').fill('corta');
  check('46 una contraseña corta se avisa y no deja copiar', /al menos 8/.test(await create.innerText()) && (await create.getByRole('button', { name: 'Copiar enlace' }).isDisabled()));
  await create.locator('#share-password').fill('');
  await create.locator('#share-note').fill('Revisa el T3');
  await create.getByRole('button', { name: 'Copiar enlace' }).click();
  await create.locator('#share-url').waitFor({ timeout: 8000 });
  const plainUrl = await create.locator('#share-url').inputValue();
  check('46 el enlace sin contraseña usa #p=', /\/ide#p=/.test(plainUrl), plainUrl.slice(0, 40));
  check('46 el resumen dice cuándo caduca', /Caduca el/.test(await create.innerText()), await create.innerText());
  await audit(page, 'diálogo Enlace copiado');
  await create.getByRole('button', { name: 'Hecho' }).click();

  await chooseMenu(page, 'exportar', 'share');
  await create.waitFor();
  await create.locator('[role="radio"]', { hasText: 'Nunca' }).click();
  await create.locator('#share-password').fill('correcto-caballo');
  await create.getByRole('button', { name: 'Copiar enlace' }).click();
  await create.locator('#share-url').waitFor({ timeout: 15000 });
  const encUrl = await create.locator('#share-url').inputValue();
  check('46 con contraseña el enlace usa #e= y no enseña el contenido', /\/ide#e=/.test(encUrl) && !encUrl.includes('Mi%20trabajo'), encUrl.slice(0, 40));
  check('46 y el resumen dice «con contraseña» y «Sin caducidad»', /con contraseña/.test(await create.innerText()) && /Sin caducidad/.test(await create.innerText()));
  await app.close();
  const hashOf = (u) => u.slice(u.indexOf('#'));

  // --- Abrir (con sesión): por defecto como proyecto nuevo, sin tocar el actual ---
  app = await openApp(env, { path: `/ide${hashOf(plainUrl)}`, session: session('Factura de marzo', { '/main.pug': 'p factura\n' }), wait: 3000 });
  page = app.page;
  const open = page.locator('[data-testid="share-open"]');
  await open.waitFor({ timeout: 12000 });
  check('46 abrir un enlace con sesión pregunta cómo', /Abrir proyecto compartido/.test(await open.innerText()) && /Revisa el T3/.test(await open.innerText()), await open.innerText());
  check('46 «Abrir como proyecto nuevo» está marcado por defecto', await open.locator('input[type=radio]').first().isChecked());
  check('46 avisa de que el proyecto actual se guarda', /Factura de marzo/.test(await open.innerText()));
  await audit(page, 'diálogo Abrir proyecto compartido');
  await open.getByRole('button', { name: 'Abrir como proyecto nuevo' }).click();
  check('46 se abre un proyecto nuevo con el nombre del enlace', !!(await waitUntil(async () => (await projectName(page)) === 'Informe', 8000)), await projectName(page));
  check('46 el proyecto anterior queda en «Mis proyectos»', !!(await waitUntil(async () => (await libraryNames(page)).includes('Factura de marzo'), 10000)), (await libraryNames(page)).join(' | '));
  check('46 el enlace se quita de la barra de direcciones', !(await page.evaluate(() => location.hash)));
  await app.close();

  // --- Con contraseña ---
  app = await openApp(env, { path: `/ide${hashOf(encUrl)}`, session: session('Factura de marzo'), wait: 3000 });
  page = app.page;
  const dlg = page.locator('[data-testid="share-open"]');
  await dlg.waitFor({ timeout: 12000 });
  check('46 un enlace con contraseña la pide', /Este enlace tiene contraseña/.test(await dlg.innerText()));
  await audit(page, 'diálogo con contraseña');
  await dlg.locator('input[type=password]').fill('incorrecta-123');
  await dlg.getByRole('button', { name: 'Abrir', exact: true }).click();
  check('46 una contraseña incorrecta lo dice y cuenta los intentos', !!(await waitUntil(async () => /Contraseña incorrecta. Quedan 4 intentos/.test(await dlg.innerText()), 15000)), await dlg.innerText());
  await dlg.locator('input[type=password]').fill('correcto-caballo');
  await dlg.getByRole('button', { name: 'Abrir', exact: true }).click();
  check('46 la contraseña correcta pasa a elegir cómo abrir', !!(await waitUntil(async () => /Abrir como proyecto nuevo/.test(await dlg.innerText()), 15000)), await dlg.innerText());
  await dlg.getByRole('button', { name: 'Abrir como proyecto nuevo' }).click();
  check('46 y abre el proyecto cifrado', !!(await waitUntil(async () => (await projectName(page)) === 'Informe', 8000)), await projectName(page));
  await app.close();

  // --- Caducado y dañado ---
  const expired = plainPayload({ v: 3, n: 'Viejo', f: { '/main.pug': 'p x' }, d: {}, a: {}, x: 1000 });
  app = await openApp(env, { path: `/ide#p=${expired}`, session: session('Factura de marzo'), wait: 3000 });
  page = app.page;
  const exp = page.locator('[data-testid="share-open"]');
  await exp.waitFor({ timeout: 12000 });
  check('46 un enlace caducado lo dice y no se abre', /caducó el/.test(await exp.innerText()) && (await projectName(page)) === 'Factura de marzo', await exp.innerText());
  await exp.getByRole('button', { name: 'Cerrar' }).click();
  const closed = await waitUntil(async () => (await page.locator('[data-testid="share-open"]').count()) === 0, 4000);
  check('46 cerrar deja el proyecto como estaba', !!closed && (await projectName(page)) === 'Factura de marzo', await projectName(page));
  check('46 sin errores no controlados', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
