import { check, openApp, waitUntil, openLogTab } from '../lib.mjs';

const DAY = 24 * 60 * 60 * 1000;
const session = { projectName: 'Copia', files: { '/main.pug': 'p hola\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };
const terminal = async (page) => { await openLogTab(page); return page.locator('app-terminal-panel').innerText(); };

// Recordatorio de exportar: solo si hace tiempo, no a un usuario nuevo, y exportar lo apaga
export default async function (env) {
  const fresh = await openApp(env, { path: '/ide', session, wait: 5000 });
  check('09 un usuario nuevo no recibe el recordatorio', !(await terminal(fresh.page)).includes('no exportas'), (await terminal(fresh.page)).slice(0, 200));
  const info = await fresh.page.evaluate(() => ({ first: localStorage.getItem('pug-ide-first-use'), last: localStorage.getItem('pug-ide-last-backup') }));
  check('09 se anota el primer uso', !!info.first && info.last === null, JSON.stringify(info));
  await fresh.close();

  const old = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-first-use': String(Date.now() - 20 * DAY) }, wait: 5000 });
  const shown = await waitUntil(async () => (await terminal(old.page)).includes('Hace 20 días que no exportas'));
  check('09 tras semanas sin exportar aparece el recordatorio', !!shown, (await terminal(old.page)).slice(0, 300));

  // Exportar (.zip) lo anota y el recordatorio no vuelve
  const download = old.page.waitForEvent('download');
  await old.page.keyboard.press('Control+k');
  await old.page.keyboard.type('Descargar proyecto');
  await waitUntil(async () => (await old.page.locator('.item .title').allInnerTexts()).includes('Descargar proyecto como .zip'));
  await old.page.keyboard.press('Enter');
  const file = await download;
  check('09 se descarga el .zip', file.suggestedFilename().endsWith('.zip'), file.suggestedFilename());
  const last = await old.page.evaluate(() => Number(localStorage.getItem('pug-ide-last-backup')));
  check('09 exportar anota la fecha de la copia', Date.now() - last < 60_000, String(last));
  await old.close();

  const backedUp = await openApp(env, { path: '/ide', session, storage: { 'pug-ide-first-use': String(Date.now() - 90 * DAY), 'pug-ide-last-backup': String(Date.now() - DAY) }, wait: 5000 });
  check('09 con una copia reciente no hay recordatorio', !(await terminal(backedUp.page)).includes('no exportas'));
  check('09 sin errores ni peticiones externas', backedUp.errors.length === 0 && backedUp.external.length === 0, backedUp.errors.join(' | '));
  await backedUp.close();
}
