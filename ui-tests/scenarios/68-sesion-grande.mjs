import { check, openApp, waitUntil } from '../lib.mjs';

// Desde la 0.16 la sesión que no cabe en localStorage (unos 5 MB) se guarda en IndexedDB y sobrevive a recargar.
// Aquí localStorage se llena de verdad hasta el último kilobyte, para que la sesión no quepa.
const session = { projectName: 'Informe Aurora', files: { '/main.pug': 'doctype html\nhtml\n  body\n    h1 Informe trimestral\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

function fillLocalStorage() {
  let i = 0;
  for (const size of [1 << 20, 1 << 16, 1 << 10, 64]) {
    const chunk = 'x'.repeat(size);
    for (;;) {
      try { localStorage.setItem(`__relleno_${i++}`, chunk); } catch { break; }
    }
  }
  return i;
}

const stored = () => ({ marker: localStorage.getItem('pug-ide-project-idb'), inLocal: localStorage.getItem('pug-ide-project') });

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await page.evaluate(fillLocalStorage);

  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n    p Ventas por región');
  const moved = await waitUntil(async () => { const s = await page.evaluate(stored); return s.marker && !s.inLocal ? s : null; }, 8000);
  check('68 con localStorage lleno, la sesión pasa a IndexedDB (marca puesta, copia vieja fuera)', !!moved, JSON.stringify(await page.evaluate(stored)));
  const status = page.locator('app-statusbar');
  check('68 la barra de estado no dice «No se pudo guardar»', !/No se pudo guardar/.test(await status.innerText()), await status.innerText());

  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  // Monaco pinta los espacios como espacios no separables.
  const editorText = async () => (await page.locator('.monaco-editor').first().innerText()).replace(/\u00a0/g, ' ');
  const back = await waitUntil(async () => (await editorText()).includes('Ventas por región'), 8000);
  check('68 al recargar, lo escrito sigue ahí (leído de IndexedDB)', !!back, await editorText());
  check('68 y el nombre del proyecto también', /Informe Aurora/.test(await page.locator('body').innerText()));

  // Se libera espacio: la siguiente vez vuelve a localStorage y se quita la marca.
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('__relleno_')) localStorage.removeItem(k); });
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n    p Notas');
  const backToLocal = await waitUntil(async () => { const s = await page.evaluate(stored); return !s.marker && s.inLocal?.includes('Notas') ? s : null; }, 8000);
  check('68 con espacio otra vez, vuelve a localStorage y se quita la marca', !!backToLocal, JSON.stringify(await page.evaluate(stored)).slice(0, 200));

  check('68 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
