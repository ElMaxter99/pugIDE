import { check, openApp, waitUntil, previewText } from '../lib.mjs';

const session = {
  projectName: 'Informe',
  files: { '/main.pug': "doctype html\nhtml\n  body\n    h1 Informe\n    img(src='/images/logo.svg' alt='')\n" },
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
};
const items = (page) => page.locator('.item .title').allInnerTexts();
const open = async (page) => {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
};

// Registro (antes «terminal»): «Esenciales» por defecto, «Todo» con el detalle; paleta con recientes, atajos y sublista
export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Informe'));
  const log = page.locator('app-terminal-panel');
  const text = async () => (await log.innerText()).replace(/\s+/g, ' ');
  await waitUntil(async () => (await text()).includes('Falta 1 archivo referenciado'));

  // --- Registro ---
  check('30 el panel se llama «Registro»', (await text()).includes('Registro'), await text());
  check('30 por defecto muestra «Esenciales» y es el filtro activo', (await log.locator('[data-testid="log-filter-essential"]').getAttribute('aria-pressed')) === 'true');
  check('30 lo esencial (archivo que falta) sale en español, con un solo mensaje', /Falta 1 archivo referenciado: \/images\/logo\.svg\. Súbelo desde el panel de archivos\./.test(await text()), await text());
  check('30 el detalle (compilación, arranque) está oculto y se avisa de cuántos', !/Compilado en|PugIDE listo/.test(await text()) && /\d+ mensajes? de detalle ocultos?/.test(await text()), await text());
  await log.locator('[data-testid="log-filter-all"]').click();
  await waitUntil(async () => /Compilado en/.test(await text()));
  check('30 «Todo» enseña el detalle en español', /Compilado en \d+ ms/.test(await text()) && /PugIDE listo\./.test(await text()), await text());
  check('30 ya no queda ningún mensaje en inglés ni filtros antiguos', !/Compiled|initialized|Welcome|Restored|Errors|Warnings|Debug/.test(await text()), await text());
  check('30 la hora es la del equipo (HH:MM:SS)', /\b\d{2}:\d{2}:\d{2}\b/.test(await text()), await text());
  await log.locator('[data-testid="log-filter-essential"]').click();

  // --- Selector de dispositivo coherente con el activo ---
  const sel = page.locator('select.device-select');
  check('30 con «Escritorio» activo el selector no dice «Móvil»', /^Escritorio/.test(await sel.evaluate((s) => s.selectedOptions[0].textContent.trim())), await sel.evaluate((s) => s.selectedOptions[0].textContent));

  // --- Paleta ---
  await open(page);
  check('30 la paleta enseña el atajo de «Guardar» y de «Compilar ahora»', (await page.locator('.item:has(.title:text-is("Guardar")) .keys').innerText()) === 'Ctrl+S' && (await page.locator('.item:has(.title:text-is("Compilar ahora")) .keys').innerText()) === 'Ctrl+Enter');
  check('30 sin escribir no hay entradas sueltas de dispositivos (una sola «Cambiar dispositivo…»)', !(await items(page)).some((t) => t.startsWith('Cambiar dispositivo:')) && (await items(page)).includes('Cambiar dispositivo…'));
  check('30 sin usos previos no hay sección «Recientes»', (await page.locator('.section').allInnerTexts()).length === 0);
  await page.keyboard.type('guardar');
  await waitUntil(async () => (await items(page))[0] === 'Guardar');
  const marked = async () => ((await page.locator('.item.active mark').first().textContent({ timeout: 500 }).catch(() => '')) ?? '').toLowerCase();
  await waitUntil(async () => (await marked()) === 'guardar');
  check('30 la coincidencia sale resaltada', (await marked()) === 'guardar', await marked());
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 0);
  await open(page);
  check('30 lo último que se usó sale arriba, en «Recientes»', (await items(page))[0] === 'Guardar' && (await page.locator('.section').first().textContent()) === 'Recientes', JSON.stringify(await items(page)));

  // Sublista de dispositivos
  await page.keyboard.type('Cambiar dispositivo…');
  await waitUntil(async () => (await items(page))[0] === 'Cambiar dispositivo…');
  await page.keyboard.press('Enter');
  await waitUntil(async () => (await items(page)).length === 11);
  check('30 «Cambiar dispositivo…» abre una sublista con los 11 dispositivos y la paleta sigue abierta', (await items(page)).length === 11 && (await page.locator('[aria-label="Paleta de comandos"]').count()) === 1, JSON.stringify(await items(page)));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await items(page)).includes('Cambiar dispositivo…'));
  check('30 Esc vuelve a la lista inicial sin cerrar la paleta', (await page.locator('[aria-label="Paleta de comandos"]').count()) === 1 && (await items(page)).includes('Cambiar dispositivo…'));
  await page.keyboard.press('Escape');
  await waitUntil(async () => (await page.locator('[aria-label="Paleta de comandos"]').count()) === 0);

  // Recientes persisten al recargar
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await open(page);
  check('30 los recientes sobreviven a una recarga', (await items(page))[0] === 'Guardar', JSON.stringify((await items(page)).slice(0, 3)));
  await page.keyboard.press('Escape');

  // Accesibilidad: los selectores muestran el anillo de foco con el teclado
  await sel.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  check('30 el selector enfocado con teclado tiene anillo de foco', (await sel.evaluate((s) => getComputedStyle(s).outlineStyle)) !== 'none');

  check('30 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
