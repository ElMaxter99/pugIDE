import { check, chooseMenu, openApp, projectName, waitUntil } from '../lib.mjs';

// Biblioteca de proyectos con imágenes (IndexedDB de verdad). Desde la 0.15 las imágenes y fuentes de cada proyecto se
// guardan aparte del texto y el autoguardado ya no las reescribe. Aquí: un proyecto guardado con el formato anterior
// (assets dentro de `data`, base de datos versión 1) se sigue abriendo con su imagen, y al guardarse pasa al nuevo.
const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];

function seedLegacy(png) {
  return new Promise((resolve, reject) => {
    const del = indexedDB.deleteDatabase('pug-ide-projects');
    del.onsuccess = del.onerror = del.onblocked = () => {
      const req = indexedDB.open('pug-ide-projects', 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('meta', { keyPath: 'id' }); req.result.createObjectStore('data', { keyPath: 'id' }); };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['meta', 'data'], 'readwrite');
        const session = { projectName: 'Catálogo Aurora', files: { '/main.pug': "doctype html\nhtml\n  body\n    img(src='img/logo.png' alt='Logo')\n    p Catálogo de servicios\n" }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
        tx.objectStore('meta').put({ id: 'p-aurora', name: 'Catálogo Aurora', updatedAt: Date.now() - 60000, fileCount: 1, assetCount: 1 });
        tx.objectStore('data').put({ id: 'p-aurora', session, assets: [{ path: '/img/logo.png', mime: 'image/png', data: new Uint8Array(png) }] });
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => reject(tx.error);
      };
    };
  });
}

function inspect() {
  return new Promise((resolve) => {
    const req = indexedDB.open('pug-ide-projects');
    req.onsuccess = () => {
      const db = req.result;
      const stores = [...db.objectStoreNames];
      if (!stores.includes('assets')) { db.close(); resolve({ version: db.version, stores }); return; }
      const tx = db.transaction(['data', 'assets'], 'readonly');
      const d = tx.objectStore('data').get('p-aurora');
      const a = tx.objectStore('assets').get('p-aurora');
      tx.oncomplete = () => { db.close(); resolve({ version: db.version, stores, inline: !!d.result?.assets, separate: a.result?.assets?.length ?? 0 }); };
    };
    req.onerror = () => resolve(null);
  });
}

export default async function (env) {
  const app = await openApp(env, { path: '/ide' });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await page.evaluate(seedLegacy, PNG);
  await page.reload();
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });

  await chooseMenu(page, 'proyecto', 'projects');
  const dialog = page.locator('[aria-label="Mis proyectos"]');
  await dialog.waitFor();
  const row = page.locator('.row', { hasText: 'Catálogo Aurora' });
  check('65 un proyecto guardado con el formato anterior sale en la lista, con su imagen', !!(await waitUntil(async () => (await row.count()) === 1, 6000)) && /1 asset/.test(await row.innerText()));
  await row.locator('button:has-text("Abrir")').click();
  check('65 se abre', !!(await waitUntil(async () => (await projectName(page)) === 'Catálogo Aurora', 10000)), await projectName(page));
  const imgOk = await waitUntil(async () => {
    for (const f of page.frames()) {
      const ok = await f.evaluate(() => { const i = document.querySelector('img[alt="Logo"]'); return !!i && i.complete && i.naturalWidth > 0; }).catch(() => false);
      if (ok) return true;
    }
    return false;
  }, 10000);
  check('65 y su imagen se ve en la vista previa', !!imgOk);

  // Autoguardado (1 s después de escribir): pasa al formato nuevo, con la imagen aparte.
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n    p Actualizado');
  const migrated = await waitUntil(async () => { const s = await page.evaluate(inspect); return s?.separate === 1 && s.inline === false ? s : null; }, 8000);
  check('65 al guardarse, la base de datos pasa a la versión 2 con la imagen aparte del texto', !!migrated, JSON.stringify(await page.evaluate(inspect)));

  // Volver a abrir otro proyecto y este: la imagen sigue.
  await chooseMenu(page, 'proyecto', 'projects');
  await dialog.waitFor();
  await page.locator('.row:not(.current) button:has-text("Abrir")').first().click();
  await waitUntil(async () => (await projectName(page)) !== 'Catálogo Aurora', 10000);
  await chooseMenu(page, 'proyecto', 'projects');
  await dialog.waitFor();
  await page.locator('.row', { hasText: 'Catálogo Aurora' }).locator('button:has-text("Abrir")').click();
  await waitUntil(async () => (await projectName(page)) === 'Catálogo Aurora', 10000);
  const again = await waitUntil(async () => {
    for (const f of page.frames()) {
      const ok = await f.evaluate(() => { const i = document.querySelector('img[alt="Logo"]'); return !!i && i.complete && i.naturalWidth > 0; }).catch(() => false);
      if (ok) return true;
    }
    return false;
  }, 10000);
  check('65 al volver a abrirlo, la imagen sigue ahí', !!again);
  check('65 y el texto guardado también', (await page.locator('.monaco-editor').first().innerText()).includes('Actualizado'));

  check('65 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
