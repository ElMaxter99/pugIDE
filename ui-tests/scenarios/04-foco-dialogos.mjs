import { check, openApp, sleep } from '../lib.mjs';

// Accesibilidad de los diálogos: el foco se queda dentro, Escape cierra y el foco vuelve a quien abrió
export default async function (env) {
  const app = await openApp(env);
  const { page } = app;
  const active = () => page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName}|${a.getAttribute('title') ?? ''}|${a.getAttribute('role') ?? ''}|${a.getAttribute('aria-label') ?? ''}` : '';
  });
  const inside = (sel) => page.evaluate((s) => !!document.querySelector(s)?.contains(document.activeElement), sel);

  // Menú «Proyecto» con teclado: Intro abre y enfoca la primera fila («Mis proyectos…»); Intro la elige
  const trigger = page.locator('[data-testid="menu-proyecto"]');
  await trigger.focus();
  await trigger.press('Enter');
  await sleep(300);
  check('04 Menú Proyecto: Intro lo abre y el foco va a la primera fila', (await active()).includes('menuitem'), await active());
  await page.keyboard.press('Enter');
  await sleep(600);
  const projects = '[aria-label="Mis proyectos"]';
  check('04 Mis proyectos: el foco entra en el diálogo', await inside(projects));
  let leaks = 0;
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); if (!(await inside(projects))) leaks++; }
  await page.keyboard.press('Shift+Tab');
  check('04 Mis proyectos: Tab y Shift+Tab no sacan el foco', leaks === 0 && (await inside(projects)), `fugas=${leaks}`);
  await page.keyboard.press('Escape');
  await sleep(400);
  check('04 Mis proyectos: Escape cierra y devuelve el foco al botón del menú', (await page.locator(projects).count()) === 0 && (await active()).endsWith('|Proyecto'), await active());

  const share = page.locator('[data-testid="open-palette"]');
  await share.focus();
  await page.keyboard.press('Control+k');
  await sleep(500);
  check('04 Paleta: el foco va al buscador y Tab no lo saca', (await active()).startsWith('INPUT') && (await page.keyboard.press('Tab'), (await active()).startsWith('INPUT')));
  await page.keyboard.press('Escape');
  await sleep(400);
  check('04 Paleta: Escape devuelve el foco al elemento anterior', (await active()).includes('Abrir la paleta de comandos'), await active());

  const add = page.locator('button[title="Nuevo archivo"]');
  await add.focus();
  await add.press('Enter');
  await sleep(600);
  check('04 Nuevo archivo: el foco va al campo de texto', (await active()).startsWith('INPUT'));
  let leaks2 = 0;
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); if (!(await inside('app-dialog [role="dialog"]'))) leaks2++; }
  check('04 Nuevo archivo: el foco no sale del diálogo', leaks2 === 0, `fugas=${leaks2}`);
  await page.keyboard.press('Escape');
  await sleep(400);
  check('04 Nuevo archivo: Escape cierra y devuelve el foco', (await page.locator('app-dialog [role="dialog"]').count()) === 0 && (await active()).includes('Nuevo archivo'), await active());
  await app.close();
}
