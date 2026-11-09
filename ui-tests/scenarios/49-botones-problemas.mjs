import { check, openApp, waitUntil } from '../lib.mjs';

// P-20: los botones de arreglo de «Problemas» están en la línea del título y se ven con cualquier tamaño de ventana.
const FILES = { '/main.pug': 'html\n  body\n    h1= titulo\n    +falta()\n    p fin\n    footer\n' };
const visibleInPanel = (page) => page.evaluate(() => {
  const panel = document.querySelector('app-terminal-panel')?.getBoundingClientRect();
  const status = document.querySelector('app-statusbar')?.getBoundingClientRect();
  const out = {};
  for (const [k, sel] of [['fix', '.diag-fix'], ['go', '.diag-go'], ['copy', '.diag-row .act:last-child']]) {
    const b = document.querySelector(`app-problems-panel ${sel}`)?.getBoundingClientRect();
    out[k] = !!b && b.width > 0 && !!panel && !!status && b.top >= panel.top && b.bottom <= panel.bottom + 1 && b.bottom <= status.top + 1;
  }
  return out;
});

export default async function (env) {
  for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080], [1100, 640]]) {
    const app = await openApp(env, { path: '/ide', session: { projectName: 'Problemas', files: FILES, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' }, viewport: { width: w, height: h } });
    const { page } = app;
    const row = page.locator('app-problems-panel .diag-row').first();
    await row.waitFor({ timeout: 12000 });
    await page.waitForTimeout(300);
    const v = await visibleInPanel(page);
    check(`49 «Crear mixin…», «Ir al error» y «Copiar mensaje» se ven a ${w}×${h}`, v.fix && v.go && v.copy, JSON.stringify(v));
    if (w === 1440) {
      const headBox = await row.locator('.head').boundingBox();
      const goBox = await row.locator('.diag-go').boundingBox();
      check('49 los botones van en la línea del título', !!headBox && !!goBox && goBox.y >= headBox.y && goBox.y + goBox.height <= headBox.y + headBox.height + 1, JSON.stringify({ headBox, goBox }));
      check('49 el fragmento enseña 3 líneas (la del error y una por arriba y otra por debajo)', (await row.locator('.code .ln').count()) === 3 && (await row.locator('.code .ln.mark .num').innerText()).trim() === '4');
      await row.getByRole('button', { name: 'Ver más' }).click();
      check('49 «Ver más» enseña más contexto', !!(await waitUntil(async () => (await row.locator('.code .ln').count()) > 3 && (await row.getByRole('button', { name: 'Ver menos' }).count()) === 1, 3000)));
      await row.getByRole('button', { name: 'Ver menos' }).click();
      check('49 y «Ver menos» lo recoge', !!(await waitUntil(async () => (await row.locator('.code .ln').count()) === 3, 3000)));
      check('49 «Ir al error» sigue diciendo el archivo y la línea (nombre accesible)', (await row.getByRole('button', { name: /Ir al error · main\.pug:4/ }).count()) === 1);
    }
    check(`49 sin errores no controlados (${w}×${h})`, app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
    await app.close();
  }
}
