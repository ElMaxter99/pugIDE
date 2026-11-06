import { check, openApp, previewText, waitUntil, openViewMenu, closeViewMenu } from '../lib.mjs';

const session = {
  projectName: 'Informe',
  files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Informe trimestral\n' },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const trigger = (page) => page.locator('[data-testid="preview-view-menu"]');
const header = (page) => page.locator('.preview-header');
/** Texto visible de un control sin el nombre del icono (la fuente de iconos escribe `desktop_windows` como texto). */
const visibleText = (els) => els.map((e) => { const c = e.cloneNode(true); c.querySelectorAll('.material-symbols-outlined').forEach((i) => i.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
const focusedTestId = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

// Barra del preview (P-04): una fila con texto, menú «Vista» accesible, selector coherente y solo iconos en estrecho
export default async function (env) {
  // --- Ancho: todo con texto y en una fila ---
  const wide = await openApp(env, { path: '/ide', session, viewport: { width: 2800, height: 850 } });
  const { page } = wide;
  await waitUntil(async () => (await previewText(page)).includes('Informe trimestral'));
  await trigger(page).waitFor();
  const controls = header(page).locator('button, select');
  const rows = await controls.evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2))).size);
  const height = await header(page).evaluate((h) => h.getBoundingClientRect().height);
  check('31 la barra es una sola fila', rows === 1 && height < 60, `${rows} filas, ${height}px`);
  const texts = await header(page).locator('button').evaluateAll(visibleText);
  check('31 con ancho suficiente ningún botón es solo icono', texts.length >= 6 && texts.every((t) => t.length > 0), JSON.stringify(texts));
  check('31 el segmentado dice Escritorio, Tableta, Móvil y PDF', ['Escritorio', 'Tableta', 'Móvil', 'PDF'].every((t) => texts.includes(t)) && texts.includes('Inspector') && texts.includes('Vista'), JSON.stringify(texts));
  check('31 hay 7 controles a la vista (4 + zoom + Inspector + Vista)', (await controls.count()) === 7, String(await controls.count()));

  // --- Menú «Vista» ---
  const t = trigger(page);
  check('31 «Vista» anuncia un menú cerrado', (await t.getAttribute('aria-haspopup')) === 'menu' && (await t.getAttribute('aria-expanded')) === 'false');
  await t.click();
  const menu = page.locator('app-preview-panel [role="menu"]');
  await menu.waitFor();
  check('31 al abrirse es role=menu y aria-expanded=true', (await t.getAttribute('aria-expanded')) === 'true' && (await menu.getAttribute('aria-label')) === 'Vista');
  const ids = await menu.locator('[data-menu-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-menu-id')));
  check('31 conserva todas las acciones (auditoría, captura, recargar, pestaña nueva, color)', ['a11y', 'png', 'reload', 'newtab', 'scheme:auto', 'scheme:light', 'scheme:dark', 'devices:more'].every((i) => ids.includes(i)), JSON.stringify(ids));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await menu.count()) === 0);
  check('31 Esc cierra el menú y devuelve el foco al botón «Vista»', (await menu.count()) === 0 && (await focusedTestId(page)) === 'preview-view-menu', String(await focusedTestId(page)));

  // Teclado: Intro abre; ↓ entra en la primera fila; ↑/↓ se mueven; Esc cierra y devuelve el foco
  await t.focus();
  await page.keyboard.press('Enter');
  await menu.waitFor();
  const activeRole = () => page.evaluate(() => document.activeElement?.getAttribute('role'));
  await waitUntil(async () => (await activeRole()) === 'menuitemradio');
  check('31 con teclado: Intro abre el menú y enfoca su primera fila', (await activeRole()) === 'menuitemradio', String(await activeRole()));
  const firstId = await page.evaluate(() => document.activeElement?.getAttribute('data-menu-id'));
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement?.getAttribute('data-menu-id'));
  check('31 ↓ pasa a la fila siguiente', !!second && second !== firstId, `${firstId} -> ${second}`);
  await page.keyboard.press('End');
  const last = await page.evaluate(() => document.activeElement?.getAttribute('data-menu-id'));
  check('31 Fin salta a la última acción', last === 'newtab', String(last));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await focusedTestId(page)) === 'preview-view-menu' && (await menu.count()) === 0);
  check('31 Esc con el foco dentro del menú devuelve el foco al botón', (await focusedTestId(page)) === 'preview-view-menu' && (await menu.count()) === 0);

  // --- El selector no se contradice con el dispositivo activo ---
  const pressed = async (name) => (await header(page).locator(`.device-switcher button[title="${name}"]`).getAttribute('aria-pressed')) === 'true';
  const checkedLabel = async () => (await (await openViewMenu(page)).locator('[role="menuitemradio"][aria-checked="true"] .item-label').first().innerText()).replace(/\s+/g, ' ').trim();
  check('31 con Escritorio activo el menú marca Escritorio (no Móvil)', (await pressed('Escritorio')) && /^Escritorio · \d+×\d+$/.test(await checkedLabel()), await checkedLabel());
  await menu.locator('[data-menu-id="devices:more"]').click();
  await waitUntil(async () => (await menu.locator('[data-menu-id^="device:"]').count()) === 11);
  check('31 «Otros dispositivos…» despliega los 11 dispositivos sin cerrar el menú', (await menu.locator('[data-menu-id^="device:"]').count()) === 11 && (await menu.count()) === 1);
  await menu.locator('[data-menu-id="device:Mobile"]').click();
  await waitUntil(() => pressed('Móvil'));
  check('31 elegir «Móvil» en el menú activa el segmentado de Móvil', await pressed('Móvil') && !(await pressed('Escritorio')));
  check('31 y el menú marca Móvil · 390×844', (await checkedLabel()) === 'Móvil · 390×844', await checkedLabel());
  await closeViewMenu(page);
  await header(page).locator('button[title="Girar"]').click();
  check('31 Girar sigue disponible en móvil y cambia el tamaño', (await checkedLabel()) === 'Móvil · 844×390', await checkedLabel());
  await closeViewMenu(page);
  await header(page).locator('.device-switcher button[title="Escritorio"]').click();
  await waitUntil(() => pressed('Escritorio'));
  check('31 el segmentado vuelve a Escritorio y Girar desaparece', (await pressed('Escritorio')) && (await header(page).locator('button[title="Girar"]').count()) === 0);
  check('31 sin errores ni peticiones externas (ancho)', wide.errors.length === 0 && wide.external.length === 0, wide.errors.concat(wide.external).join(' | '));
  await wide.close();

  // --- Estrecho: segmentado e Inspector solo con icono, pero con nombre accesible ---
  const narrow = await openApp(env, { path: '/ide', session });
  const np = narrow.page;
  await waitUntil(async () => (await previewText(np)).includes('Informe trimestral'));
  await trigger(np).waitFor();
  const iconOnly = await header(np).locator('.device-switcher button, .inspector-btn').evaluateAll((els) => els.map((e) => ({ text: e.cloneNode(true), name: e.getAttribute('aria-label') })).map((b) => { b.text.querySelectorAll('.material-symbols-outlined').forEach((i) => i.remove()); return { text: b.text.textContent.trim(), name: b.name }; }));
  check('31 en estrecho el segmentado y el Inspector son solo icono con nombre accesible', iconOnly.length === 5 && iconOnly.every((b) => b.text === '' && b.name), JSON.stringify(iconOnly));
  check('31 en estrecho «Vista» sigue con texto', (await trigger(np).locator('.menu-label').innerText()) === 'Vista');
  check('31 en estrecho sigue en una sola fila', (await header(np).evaluate((h) => h.getBoundingClientRect().height)) < 60);
  await narrow.close();

  // --- PDF: segunda fila solo en ese modo ---
  const pdf = await openApp(env, { path: '/ide', session, prefs: { previewDevice: 'PDF' }, viewport: { width: 2800, height: 850 } });
  const pp = pdf.page;
  await pp.locator('.pdf-bar').waitFor({ timeout: 8000 });
  const bar = (await pp.locator('.pdf-bar').innerText()).replace(/\s+/g, ' ');
  check('31 en PDF la segunda fila trae Vertical, Horizontal, páginas e Imprimir', /Vertical/.test(bar) && /Horizontal/.test(bar) && /\d+ página/.test(bar) && /Imprimir/.test(bar), bar);
  const pdfMenu = await openViewMenu(pp);
  check('31 en PDF el menú «Vista» no ofrece dispositivos', (await pdfMenu.locator('[data-menu-id^="device:"]').count()) === 0 && (await pdfMenu.locator('[data-menu-id="png"]').count()) === 1);
  check('31 sin errores ni peticiones externas (PDF)', pdf.errors.length === 0 && pdf.external.length === 0, pdf.errors.concat(pdf.external).join(' | '));
  await pdf.close();
}
