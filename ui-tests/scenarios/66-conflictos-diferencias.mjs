import { check, openApp, waitUntil } from '../lib.mjs';

// Ver diferencias en un conflicto (P-37). Se simula la app de escritorio con un espacio de trabajo abierto: se edita
// aquí, «cambia el disco» y se decide viendo las dos versiones. Lo descartado queda en «Historial del archivo».
const DISK0 = ['doctype html', 'html', '  body', '    h1 Factura', '    p.nota Pago a 30 días.', '    footer Clínica Aurora'].join('\n') + '\n';
const DISK1 = ['doctype html', 'html', '  body', '    h1 Factura', '    p.nota Pago por transferencia a 15 días.', '    p.iban ES12 0049 1500 0512 3456 7890', '    footer Clínica Aurora'].join('\n') + '\n';

function fakeDesktop(disk0) {
  const listeners = new Set();
  const ws = { id: 'w1', name: 'Clínica Aurora', color: '#ddb7ff', path: '/home/ana/clientes/aurora' };
  window.__writes = [];
  window.__disk = { '/factura.pug': disk0 };
  window.__holdWrites = false; // «el disco no deja escribir»: lo editado aquí queda sin guardar, como a media edición
  window.__emit = (payload) => listeners.forEach((cb) => cb(payload));
  window.pugideDesktop = Object.freeze({
    platform: 'linux', version: '0.15.0', webUrl: 'https://pug-ide.vercel.app',
    onEvent: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    invoke: async (channel, payload) => {
      if (channel === 'ws:list') return { workspaces: [{ ...ws, lastOpened: 1, exists: true }], lastId: 'w1', colors: ['#ddb7ff'] };
      if (channel === 'ws:open') return { ok: true, workspace: ws, files: { ...window.__disk }, assets: [], datasets: null, skippedCount: 0 };
      if (channel === 'ws:read-paths') return Object.fromEntries(payload.paths.map((p) => [p, p in window.__disk ? { text: window.__disk[p] } : null]));
      if (channel === 'ws:write') {
        const paths = [...Object.keys(payload.change.files ?? {}), ...(payload.change.deleted ?? [])];
        if (window.__holdWrites) return { written: [], failed: paths.filter((p) => p.endsWith('.pug')) };
        window.__writes.push(payload.change);
        Object.assign(window.__disk, payload.change.files ?? {});
        for (const p of payload.change.deleted ?? []) delete window.__disk[p];
        return { written: paths, failed: [] };
      }
      if (channel === 'upd:state') return { current: '0.15.0', asked: true, enabled: false, lastCheck: 0, latest: null, dismissed: false, self: null, justUpdated: null };
      return { ok: true };
    },
  });
}

async function start(env) {
  const app = await openApp(env, { path: '/ide', storage: { 'pug-ide-workspaces-intro': '1' } });
  await app.page.addInitScript(fakeDesktop, DISK0);
  await app.page.reload();
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 20000 });
  await waitUntil(async () => (await page.locator('.monaco-editor .view-lines').first().innerText()).replace(/\u00a0/g, ' ').includes('Pago a 30'), 10000);
  // Se edita aquí (queda sin guardar) y «cambia el disco».
  await page.evaluate(() => { window.__holdWrites = true; });
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press(process.env.PUGIDE_BROWSER === 'webkit' ? 'Meta+End' : 'Control+End');
  await page.keyboard.type('    p.mio Añadido en PugIDE');
  await waitUntil(async () => (await page.locator('.monaco-editor .view-lines').first().innerText()).replace(/\u00a0/g, ' ').includes('Añadido en PugIDE'), 4000);
  await page.waitForTimeout(400);
  return app;
}

/** Texto del editor (Monaco pinta los espacios como espacios duros). */
const editorText = async (page) => (await page.locator('.monaco-editor .view-lines').first().innerText()).replace(/\u00a0/g, ' ');

const changeOnDisk = (page, text) => page.evaluate((t) => {
  if (t === null) delete window.__disk['/factura.pug']; else window.__disk['/factura.pug'] = t;
  window.__emit({ type: 'workspace-changed', id: 'w1', paths: ['/factura.pug'] });
}, text);

export default async function (env) {
  let app = await start(env);
  let page = app.page;
  await changeOnDisk(page, DISK1);
  const bar = page.locator('[data-testid="workspace-conflict"]');
  check('66 con cambios aquí y en el disco sale la barra de conflicto con «Ver diferencias»', !!(await waitUntil(async () => (await bar.count()) === 1, 8000)) && (await bar.locator('[data-testid="conflict-diff"]').count()) === 1, await page.locator('#panel-log').innerText().catch(() => ''));
  await bar.locator('[data-testid="conflict-diff"]').click();
  const dlg = page.locator('[data-testid="conflict-diff-dialog"]');
  await dlg.waitFor({ timeout: 5000 });
  check('66 el diálogo dice el archivo y cuántos cambios hay', /Diferencias en factura\.pug/.test(await dlg.innerText()) && /2 cambios · \+3\s*−2 líneas/.test(await dlg.locator('[data-testid="conflict-diff-summary"]').innerText()), await dlg.locator('[data-testid="conflict-diff-summary"]').innerText());
  const rows = dlg.locator('[data-testid="conflict-diff-rows"] .row');
  const removed = await rows.locator('.cell.removed').allInnerTexts();
  const added = await rows.locator('.cell.added').allInnerTexts();
  check('66 a la izquierda lo de aquí (quitado, con −) y a la derecha lo del disco (añadido, con +)', removed.some((t) => t.includes('Pago a 30 días') && t.includes('−')) && removed.some((t) => t.includes('Añadido en PugIDE')) && added.some((t) => t.includes('15 días') && t.includes('+')) && added.some((t) => t.includes('p.iban')), `${removed.join(' / ')} || ${added.join(' / ')}`);
  check('66 las líneas iguales salen en los dos lados, con su número', (await rows.first().innerText()).replace(/\s+/g, ' ').includes('1 doctype html 1 doctype html'), await rows.first().innerText());
  check('66 no depende solo del color: cada cambio lo dice también para el lector de pantalla', (await dlg.locator('.sr-only', { hasText: 'quitada' }).count()) >= 1 && (await dlg.locator('.sr-only', { hasText: 'añadida' }).count()) >= 1);
  check('66 el foco entra en el diálogo', await page.evaluate(() => !!document.activeElement?.closest('[data-testid="conflict-diff-dialog"]')));
  await dlg.locator('[data-testid="conflict-diff-next"]').click();
  check('66 «Cambio siguiente» pasa al segundo cambio', !!(await waitUntil(async () => (await dlg.locator('.row.current').first().getAttribute('data-change')) === '1', 3000)));
  await page.keyboard.press('Alt+ArrowUp');
  check('66 Alt+↑ vuelve al anterior', !!(await waitUntil(async () => (await dlg.locator('.row.current').first().getAttribute('data-change')) === '0', 3000)));
  await page.keyboard.press('Escape');
  check('66 Esc cierra sin decidir: la barra sigue', !!(await waitUntil(async () => (await dlg.count()) === 0, 3000)) && (await bar.count()) === 1);

  // Cargar el del disco, desde el diálogo.
  await bar.locator('[data-testid="conflict-diff"]').click();
  await dlg.waitFor({ timeout: 5000 });
  await dlg.locator('[data-testid="conflict-diff-disk"]').click();
  check('66 «Cargar el del disco» cierra el diálogo, quita la barra y carga esa versión', !!(await waitUntil(async () => (await dlg.count()) === 0 && (await bar.count()) === 0 && (await editorText(page)).includes('p.iban ES12'), 6000)), `dlg=${await dlg.count()} bar=${await bar.count()} ed=${JSON.stringify((await editorText(page)).slice(0, 300))}`);
  await page.waitForTimeout(1200); // pasa una recompilación: no debe volver a poner lo antiguo
  check('66 y lo de aquí ya no está en el editor (tampoco tras recompilar)', !(await editorText(page)).includes('Añadido en PugIDE') && (await editorText(page)).includes('p.iban ES12'), (await editorText(page)).slice(0, 300));
  // Lo descartado queda en el historial del archivo.
  await page.keyboard.press(process.env.PUGIDE_BROWSER === 'webkit' ? 'Meta+k' : 'Control+k');
  await page.keyboard.type('Historial del archivo');
  await page.keyboard.press('Enter');
  const hist = page.locator('[aria-label="Historial del archivo"]');
  await hist.waitFor({ timeout: 5000 });
  check('66 la versión descartada queda en «Historial del archivo»', !!(await waitUntil(async () => /descartado en un conflicto \(lo de PugIDE\)/.test(await hist.innerText()), 6000)), (await hist.innerText()).slice(0, 300));
  check('66 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // Quedarme con lo mío: se escribe en disco lo de aquí.
  app = await start(env);
  page = app.page;
  await changeOnDisk(page, DISK1);
  await page.locator('[data-testid="conflict-diff"]').click();
  await page.locator('[data-testid="conflict-diff-dialog"]').waitFor({ timeout: 8000 });
  await page.evaluate(() => { window.__holdWrites = false; });
  await page.locator('[data-testid="conflict-diff-mine"]').click();
  const written = await waitUntil(() => page.evaluate(() => window.__writes.map((w) => w.files?.['/factura.pug']).find((t) => t?.includes('Añadido en PugIDE')) ?? null), 8000);
  check('66 «Quedarme con lo mío» escribe en disco lo de aquí', !!written && !written.includes('p.iban'), String(written).slice(0, 120));
  check('66 y cierra el diálogo y la barra', !!(await waitUntil(async () => (await page.locator('[data-testid="conflict-diff-dialog"]').count()) === 0 && (await page.locator('[data-testid="workspace-conflict"]').count()) === 0, 4000)), `dlg=${await page.locator('[data-testid="conflict-diff-dialog"]').count()} bar=${await page.locator('[data-testid="workspace-conflict"]').count()}`);
  await app.close();

  // Borrado en el disco.
  app = await start(env);
  page = app.page;
  await changeOnDisk(page, null);
  await page.locator('[data-testid="conflict-diff"]').click();
  const del = page.locator('[data-testid="conflict-diff-dialog"]');
  await del.waitFor({ timeout: 8000 });
  check('66 si se borró en el disco, lo dice y ofrece conservarlo o borrarlo aquí', /se ha borrado en el disco/.test(await del.locator('[data-testid="conflict-diff-deleted"]').innerText()) && /Conservarlo/.test(await del.locator('[data-testid="conflict-diff-mine"]').innerText()) && /Borrarlo aquí también/.test(await del.locator('[data-testid="conflict-diff-disk"]').innerText()));
  await app.close();
}
