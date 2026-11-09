import { check, openApp, waitUntil } from '../lib.mjs';

// P-21: tema Automático/Oscuro/Claro, enlaces de salto y F6 entre regiones.
const isLight = (page) => page.evaluate(() => document.documentElement.classList.contains('light-mode'));
const region = (page) => page.evaluate(() => document.activeElement?.closest('[data-region]')?.getAttribute('data-region') ?? null);

export default async function (env) {
  // Sin haber elegido nada, manda el sistema
  let app = await openApp(env, { path: '/ide', colorScheme: 'light' });
  let { page } = app;
  check('52 sin elección, con sistema claro se ve claro', await isLight(page));
  await page.emulateMedia({ colorScheme: 'dark' });
  check('52 si el sistema cambia, la app lo sigue', !!(await waitUntil(async () => !(await isLight(page)), 3000)));

  // Menú de tema
  await page.locator('button[aria-label="Cambiar tema claro u oscuro"]').click();
  await page.locator('[role="menuitemradio"]').first().waitFor({ timeout: 4000 });
  const items = await page.locator('[role="menuitemradio"]').allInnerTexts();
  check('52 el menú ofrece Automático, Oscuro y Claro', ['Automático', 'Oscuro', 'Claro'].every((l) => items.some((t) => t.includes(l))), JSON.stringify(items));
  check('52 «Automático» está marcado', (await page.locator('[role="menuitemradio"][aria-checked="true"]').innerText()).includes('Automático'));
  await page.locator('[role="menuitemradio"]', { hasText: 'Claro' }).click();
  check('52 elegir Claro lo fija aunque el sistema sea oscuro', !!(await waitUntil(() => isLight(page), 3000)));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  check('52 y no lo cambia el sistema', await isLight(page));
  await page.reload();
  await page.waitForTimeout(1500);
  check('52 la elección se recuerda', await isLight(page));
  await app.close();

  // Quien ya eligió oscuro lo conserva con un sistema claro
  app = await openApp(env, { path: '/ide', prefs: { theme: 'dark' }, colorScheme: 'light' });
  check('52 quien eligió oscuro conserva oscuro', !(await isLight(app.page)));
  await app.close();

  // Enlaces de salto y F6
  app = await openApp(env, { path: '/ide' });
  page = app.page;
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('52 el primer Tab cae en «Saltar al editor»', first === 'Saltar al editor', first);
  check('52 el enlace salta a la vista (visible al enfocarlo)', await page.locator('[data-testid="skip-editor"]').isVisible());
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  check('52 «Saltar a la vista previa» lleva el foco a la vista previa', !!(await waitUntil(async () => (await region(page)) === 'preview', 3000)), String(await region(page)));

  const seen = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('F6');
    await page.waitForTimeout(150);
    seen.push(await region(page));
  }
  check('52 F6 recorre las regiones en orden y da la vuelta', seen[0] === 'problemas' && seen[1] === 'archivos' && seen[2] === 'editor', JSON.stringify(seen));
  await page.keyboard.press('Shift+F6');
  await page.waitForTimeout(150);
  const back = await region(page);
  check('52 Mayús+F6 va a la región anterior', back === seen[4], `${back} vs ${seen[4]}`);
  check('52 la región tiene marco un momento', await page.evaluate(() => !!document.querySelector('[data-region].region-flash')));
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');

  const shortcuts = await page.evaluate(() => document.querySelector('app-main-layout') !== null);
  check('52 (la pantalla del IDE sigue ahí)', shortcuts);
  await app.close();
}
