import { check, openApp, previewText, projectName, waitUntil, sleep } from '../lib.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { deflateSync, strToU8 } from 'fflate';

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const session = {
  projectName: 'Con sesión',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Hola desde la sesión\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};

const welcome = (page) => page.locator('[data-testid="welcome"]');
const tour = (page) => page.locator('[data-testid="tour"]');
const countOf = async (loc) => loc.count();
const activeDesc = (page) => page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}.${e.className}|${e.getAttribute('aria-label') ?? ''}` : ''; });
const countText = async (page) => ((await page.locator('[data-testid="tour-count"]').textContent()) ?? '').trim();

async function audit(page, label) {
  await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
  if (!(await page.evaluate(() => typeof globalThis.axe !== 'undefined'))) await page.evaluate(AXE_SOURCE);
  const res = await page.evaluate(() => axe.run(document, { exclude: [['.monaco-editor'], ['.preview-iframe']], resultTypes: ['violations'] }));
  const detail = res.violations.map((v) => `${v.id} [${v.impact}] x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join('>').replace(/\[_ngcontent[^\]]*\]/g, '').slice(0, 60)).join(' ; ')}`).join(' | ');
  check(`37 accesibilidad: ${label}`, res.violations.length === 0, detail);
}

/** Cuadro de la zona iluminada de un paso y del aviso, para comprobar que no se tapan. */
async function boxes(page, selector) {
  return page.evaluate((sel) => {
    const t = document.querySelector(sel)?.getBoundingClientRect();
    const p = document.querySelector('[data-testid="tour"]')?.getBoundingClientRect();
    const h = document.querySelector('[data-testid="tour-halo"]')?.getBoundingClientRect();
    const o = (r) => (r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null);
    return { target: o(t), pop: o(p), halo: o(h), view: { w: innerWidth, h: innerHeight } };
  }, selector);
}
/** Espera a que el halo y el aviso se hayan colocado para ese paso (se recolocan tras pintar) y devuelve los cuadros. */
async function settled(page, selector) {
  let last = null;
  await waitUntil(async () => {
    last = await boxes(page, selector);
    return !!last.target && !!last.halo && !!last.pop && Math.abs(last.halo.l - (last.target.l - 3)) < 2 && Math.abs(last.halo.t - (last.target.t - 3)) < 2;
  }, 4000, 100);
  return last;
}
const overlaps = (a, b) => a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const inside = (p, v) => p.l >= 0 && p.t >= 0 && p.r <= v.w && p.b <= v.h;

async function openPalette(page) {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
}
async function runFromPalette(page, text, title) {
  await openPalette(page);
  await page.keyboard.type(text);
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === title);
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 0);
}

function sharePayload() {
  const json = JSON.stringify({ v: 2, n: 'Compartido', f: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Proyecto compartido\n' }, d: {}, a: {} });
  const bytes = deflateSync(strToU8(json), { level: 9 });
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Bienvenida de primer uso (P-06) y recorrido de 4 pasos (P-12)
export default async function (env) {
  // --- Primer uso: sin sesión ni proyectos guardados ---
  let app = await openApp(env, { path: '/ide', welcome: true, wait: 2500 });
  let { page } = app;
  await welcome(page).waitFor({ timeout: 8000 });
  check('37 el primer uso muestra la bienvenida como diálogo modal con nombre', (await welcome(page).getAttribute('role')) === 'dialog' && (await welcome(page).getAttribute('aria-modal')) === 'true' && (await page.locator('#welcome-title').innerText()) === 'Te damos la bienvenida a PugIDE');
  const names = (await welcome(page).locator('.card-name').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').replace(/^add\s*/, '').trim());
  check('37 ofrece Informe, Factura, Correo electrónico y Proyecto vacío', JSON.stringify(names) === JSON.stringify(['Informe', 'Factura', 'Correo electrónico', 'Proyecto vacío']), JSON.stringify(names));
  check('37 las plantillas llevan su etiqueta («A4 · 3 archivos», «Correo · 3 archivos»)', (await welcome(page).locator('[data-testid="welcome-template-report"] .card-badge').innerText()) === 'A4 · 3 archivos' && (await welcome(page).locator('[data-testid="welcome-template-email"] .card-badge').innerText()) === 'Correo · 3 archivos');
  check('37 sin proyectos guardados no ofrece «Abrir un proyecto guardado…»', (await countOf(welcome(page).locator('[data-testid="welcome-open-saved"]'))) === 0);
  check('37 ofrece importar y el recorrido', (await countOf(welcome(page).locator('[data-testid="welcome-import"]'))) === 1 && /Ver el recorrido/.test(await welcome(page).locator('[data-testid="welcome-tour"]').innerText()));
  check('37 el foco entra en el diálogo', !!(await waitUntil(async () => page.evaluate(() => !!document.activeElement?.closest('[data-testid="welcome"]')))));
  await audit(page, 'bienvenida (tema oscuro)');

  // Teclado: Tab no se sale del diálogo
  let escaped = false;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="welcome"]')))) escaped = true;
  }
  check('37 Tab no saca el foco de la bienvenida', !escaped);

  await welcome(page).locator('[data-testid="welcome-template-invoice"]').click();
  await waitUntil(async () => (await countOf(welcome(page))) === 0);
  check('37 elegir una plantilla cierra la bienvenida y crea el proyecto', (await countOf(welcome(page))) === 0 && !!(await waitUntil(async () => (await projectName(page)) === 'Factura')), await projectName(page));
  const shown = await waitUntil(async () => /FACTURA/.test(await previewText(page)));
  check('37 y carga los archivos de la plantilla (la vista previa enseña la factura)', !!shown, (await previewText(page)).slice(0, 80));
  await sleep(1600); // autoguardado de la sesión
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await sleep(1500);
  check('37 al recargar no vuelve a salir y el proyecto sigue ahí', (await countOf(welcome(page))) === 0 && (await projectName(page)) === 'Factura', await projectName(page));
  await runFromPalette(page, 'Mis proyectos', 'Mis proyectos…');
  const rows = page.locator('[role="dialog"][aria-label="Mis proyectos"] .row .name');
  await waitUntil(async () => (await rows.count()) >= 1);
  const listed = (await rows.allInnerTexts()).map((t) => t.trim());
  check('37 la plantilla elegida no deja un «MiProyecto» vacío suelto en la biblioteca', listed.length === 1 && listed[0] === 'Factura', JSON.stringify(listed));
  await page.keyboard.press('Escape');
  await app.close();

  // --- La bienvenida espera a que se decida el aviso de privacidad ---
  app = await openApp(env, { path: '/ide', welcome: true, consent: null, wait: 2500 });
  page = app.page;
  check('37 con el aviso de privacidad pendiente, la bienvenida espera', (await page.locator('[aria-label="Aviso de privacidad"]').count()) === 1 && (await countOf(welcome(page))) === 0);
  await page.getByRole('button', { name: 'Rechazar' }).click();
  await welcome(page).waitFor({ timeout: 6000 });
  check('37 al decidir el aviso, aparece la bienvenida', (await page.locator('[aria-label="Aviso de privacidad"]').count()) === 0 && (await countOf(welcome(page))) === 1);
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await countOf(welcome(page))) === 0);
  check('37 Esc la cierra', (await countOf(welcome(page))) === 0);
  await page.reload();
  await sleep(2500);
  check('37 cerrarla también la da por vista', (await countOf(welcome(page))) === 0);
  await app.close();

  // --- Rutas que no son primer uso ---
  app = await openApp(env, { path: '/ide', welcome: true, session, wait: 3000 });
  check('37 con sesión guardada no sale', (await countOf(welcome(app.page))) === 0 && (await projectName(app.page)) === 'Con sesión');
  await app.close();
  app = await openApp(env, { path: '/ide?demo=true', welcome: true, wait: 3000 });
  check('37 con ?demo=true no sale', (await countOf(welcome(app.page))) === 0);
  await app.close();
  app = await openApp(env, { path: `/ide#p=${sharePayload()}`, welcome: true, wait: 3000 });
  check('37 con un enlace compartido no sale y se abre el proyecto', (await countOf(welcome(app.page))) === 0 && !!(await waitUntil(async () => (await projectName(app.page)) === 'Compartido')), await projectName(app.page));
  await app.close();

  // --- Con proyectos guardados en la biblioteca se ofrece abrirlos ---
  app = await openApp(env, { path: '/ide', welcome: true, wait: 2500 });
  page = app.page;
  await welcome(page).waitFor({ timeout: 8000 });
  await welcome(page).locator('[data-testid="welcome-template-report"]').click();
  await waitUntil(async () => (await countOf(welcome(page))) === 0);
  await sleep(1200);
  await page.evaluate(() => localStorage.removeItem('pug-ide-welcome'));
  await page.evaluate(() => localStorage.removeItem('pug-ide-project'));
  await page.evaluate(() => localStorage.removeItem('pug-ide-current-project'));
  await page.reload();
  await welcome(page).waitFor({ timeout: 8000 });
  await page.evaluate(() => 0);
  const hasSaved = await waitUntil(async () => (await countOf(welcome(page).locator('[data-testid="welcome-open-saved"]'))) === 1, 4000);
  check('37 si la biblioteca tiene proyectos, se ofrece «Abrir un proyecto guardado…» (y abre «Mis proyectos»)', !!hasSaved);
  if (hasSaved) {
    await welcome(page).locator('[data-testid="welcome-open-saved"]').click();
    check('37 «Abrir un proyecto guardado…» abre «Mis proyectos»', !!(await waitUntil(async () => (await page.locator('[role="dialog"][aria-label="Mis proyectos"]').count()) === 1)));
  }
  await app.close();

  // --- Recorrido desde la bienvenida: teclado, halo, foco y accesibilidad ---
  app = await openApp(env, { path: '/ide', welcome: true, wait: 2500 });
  page = app.page;
  await welcome(page).waitFor({ timeout: 8000 });
  await welcome(page).locator('[data-testid="welcome-tour"]').click();
  await tour(page).waitFor({ timeout: 4000 });
  await waitUntil(async () => (await page.locator('[data-testid="tour-halo"]').count()) === 1);
  check('37 «Ver el recorrido» cierra la bienvenida y abre el paso 1 de 4', (await countOf(welcome(page))) === 0 && (await countText(page)) === '1 de 4' && (await page.locator('#tour-title').innerText()) === 'Archivos y datos');
  check('37 el aviso es un diálogo con nombre y su texto se anuncia (aria-live)', (await tour(page).getAttribute('role')) === 'dialog' && (await tour(page).getAttribute('aria-labelledby')) === 'tour-title' && (await tour(page).locator('[aria-live="polite"]').count()) === 1);
  check('37 el foco está en «Siguiente»', await waitUntil(async () => page.evaluate(() => document.activeElement?.getAttribute('data-testid') === 'tour-next')));
  let b = await settled(page, '[data-tour="files"]');
  check('37 el halo rodea la zona iluminada (Archivos)', !!b.halo && Math.abs(b.halo.l - (b.target.l - 3)) < 2 && Math.abs(b.halo.t - (b.target.t - 3)) < 2, JSON.stringify(b));
  check('37 el aviso no tapa la zona iluminada y cabe en la ventana', !overlaps(b.pop, b.target) && inside(b.pop, b.view), JSON.stringify(b));
  await audit(page, 'recorrido, paso 1 (tema oscuro)');

  await page.keyboard.press('ArrowRight');
  await waitUntil(async () => (await page.locator('#tour-title').innerText()) === 'El editor');
  b = await settled(page, '[data-tour="editor"]');
  check('37 → pasa al paso 2 (El editor) y no tapa su zona', (await countText(page)) === '2 de 4' && !overlaps(b.pop, b.target) && inside(b.pop, b.view), JSON.stringify(b));
  await page.keyboard.press('ArrowLeft');
  await waitUntil(async () => (await page.locator('#tour-title').innerText()) === 'Archivos y datos');
  check('37 ← vuelve al paso 1', (await countText(page)) === '1 de 4');
  check('37 en el paso 1 no hay «Anterior»', (await countOf(page.locator('[data-testid="tour-prev"]'))) === 0);
  await page.locator('[data-testid="tour-next"]').click();
  await page.locator('[data-testid="tour-next"]').click();
  await waitUntil(async () => (await page.locator('#tour-title').innerText()) === 'La vista previa');
  b = await settled(page, '[data-tour="preview"]');
  check('37 paso 3 (La vista previa): no tapa su zona', !overlaps(b.pop, b.target) && inside(b.pop, b.view), JSON.stringify(b));
  await page.locator('[data-testid="tour-next"]').click();
  await waitUntil(async () => (await page.locator('#tour-title').innerText()) === 'Todo con el teclado');
  b = await settled(page, '[data-tour="search"]');
  check('37 paso 4 (Todo con el teclado): cuatro atajos y botón «Terminar»', (await tour(page).locator('.keys li').count()) === 4 && (await page.locator('[data-testid="tour-next"]').innerText()) === 'Terminar' && !overlaps(b.pop, b.target) && inside(b.pop, b.view), JSON.stringify(b));
  await audit(page, 'recorrido, paso 4 (tema oscuro)');

  let leaked = false;
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press(i % 2 ? 'Shift+Tab' : 'Tab');
    if (!(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="tour"]')))) leaked = true;
  }
  check('37 Tab y Mayús+Tab no sacan el foco del recorrido', !leaked);
  check('37 la página no se puede usar mientras dura el recorrido (nada recibe el clic)', await page.evaluate(() => { const e = document.elementFromPoint(300, 12); return !e || !!e.closest('[data-testid="tour"]') || e.classList.contains('blocker') || e.tagName === 'APP-TOUR'; }));
  await page.locator('[data-testid="tour-next"]').click();
  await waitUntil(async () => (await countOf(tour(page))) === 0);
  check('37 «Terminar» cierra el recorrido', (await countOf(tour(page))) === 0);
  check('37 queda guardado que se hizo', await page.evaluate(() => localStorage.getItem('pug-ide-tour') !== null));
  await app.close();

  // --- Desde la paleta: Esc salta, el foco vuelve, y con movimiento reducido el halo no se anima ---
  app = await openApp(env, { path: '/ide', session, welcome: true, wait: 3000 });
  page = app.page;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-testid="open-palette"]').focus();
  const before = await activeDesc(page);
  await runFromPalette(page, 'Ver el recorrido', 'Ver el recorrido');
  await tour(page).waitFor({ timeout: 4000 });
  await waitUntil(async () => (await page.locator('[data-testid="tour-halo"]').count()) === 1);
  check('37 «Ver el recorrido» en la paleta lo abre en el paso 1', (await countText(page)) === '1 de 4');
  check('37 con movimiento reducido el halo no se anima', (await page.locator('[data-testid="tour-halo"]').evaluate((e) => getComputedStyle(e).transitionDuration)) === '0s');
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await countOf(tour(page))) === 0);
  check('37 Esc salta el recorrido y lo da por hecho', (await countOf(tour(page))) === 0 && (await page.evaluate(() => localStorage.getItem('pug-ide-tour') !== null)));
  const after = await waitUntil(async () => (await activeDesc(page)) === before ? before : '', 2000);
  check('37 al saltar, el foco vuelve a donde estaba (el campo de búsqueda de la barra)', after === before, `${before} -> ${await activeDesc(page)}`);
  await app.close();

  // --- Ventana pequeña (1024 × 640): el aviso cabe en todos los pasos ---
  app = await openApp(env, { path: '/ide', session, welcome: true, viewport: { width: 1024, height: 640 }, wait: 3000 });
  page = app.page;
  await runFromPalette(page, 'Ver el recorrido', 'Ver el recorrido');
  await tour(page).waitFor({ timeout: 4000 });
  const fits = [];
  const targets = ['[data-tour="files"]', '[data-tour="editor"]', '[data-tour="preview"]', '[data-tour="search"]'];
  for (let i = 0; i < 4; i++) {
    await waitUntil(async () => (await countText(page)) === `${i + 1} de 4`);
    const bx = await settled(page, targets[i]);
    fits.push(inside(bx.pop, bx.view) && !overlaps(bx.pop, bx.target));
    if (i < 3) await page.locator('[data-testid="tour-next"]').click();
  }
  check('37 a 1024 × 640 el aviso cabe en la ventana y no tapa la zona en los 4 pasos', fits.every(Boolean), JSON.stringify(fits));
  await page.keyboard.press('Escape');
  await app.close();

  // --- Tema claro ---
  app = await openApp(env, { path: '/ide', welcome: true, prefs: { theme: 'light' }, wait: 2500 });
  page = app.page;
  await welcome(page).waitFor({ timeout: 8000 });
  await audit(page, 'bienvenida (tema claro)');
  await app.close();
}
