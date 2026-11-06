import { check, openApp, previewText, waitUntil, openLogTab, openProblemsTab } from '../lib.mjs';

const activePath = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getModel()?.uri.path);
const activeLine = (page) => page.evaluate(() => window.monaco.editor.getEditors()[0].getPosition()?.lineNumber);
const setModel = (page, path, text) => page.evaluate(([p, t]) => window.monaco.editor.getModels().find((m) => m.uri.path === p).setValue(t), [path, text]);
const focusedTestId = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

const TWO_PROBLEMS = {
  '/main.pug': 'html\n  body\n    h1= t("A")\n    +falta()\n',
  '/locales/es/translations.json': '{ "A": ',
};

// Panel inferior «Problemas | Registro»: un solo sitio para los problemas, con filtros, navegación, arreglos y la franja del preview
export default async function (env) {
  // ---------- 1. Dos problemas: pestañas, filas, filtros, navegación ----------
  let app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Problemas', files: TWO_PROBLEMS, openTabPaths: ['/main.pug', '/locales/es/translations.json'], activeTabPath: '/main.pug' },
  });
  let { page } = app;
  const rows = page.locator('app-problems-panel .diag-row');
  await rows.nth(1).waitFor({ timeout: 10000 });

  const tablist = page.locator('app-terminal-panel [role="tablist"]');
  check('35 el panel inferior tiene pestañas «Problemas» y «Registro»', (await tablist.getByRole('tab').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).join('|') === 'Problemas 2|Registro', (await tablist.innerText()).replace(/\s+/g, ' '));
  check('35 «Problemas» es la pestaña activa y la que se ve', (await page.locator('[data-testid="tab-problems"]').getAttribute('aria-selected')) === 'true' && (await page.locator('app-terminal-panel [role="tabpanel"]').getAttribute('id')) === 'panel-problems');
  check('35 la pestaña «Problemas» cuenta el total (2)', (await page.locator('[data-testid="tab-problems-count"]').innerText()).trim() === '2');

  const first = rows.filter({ hasText: 'falta' }).first();
  check('35 el problema de compilación explica la causa', /ningún archivo define/.test(await first.locator('.why').innerText()), await first.innerText());
  const marked = first.locator('.code .ln.mark');
  check('35 enseña el fragmento de código con la línea del error marcada (+falta())', (await marked.count()) === 1 && (await marked.innerText()).includes('+falta()') && (await marked.locator('.num').innerText()).trim() === '4', await first.locator('.code').innerText());
  check('35 y los botones «Ir al error» y «Copiar mensaje»', (await first.getByRole('button', { name: /Ir al error · main\.pug:4/ }).count()) === 1 && (await first.getByRole('button', { name: 'Copiar mensaje' }).count()) === 1);

  // Filtros
  check('35 los filtros cuentan: Todos 2, Errores 2, Avisos 0', (await page.locator('[data-testid="pb-filter-all"]').innerText()).includes('2') && (await page.locator('[data-testid="pb-filter-error"]').innerText()).includes('2') && (await page.locator('[data-testid="pb-filter-warning"]').innerText()).includes('0'));
  await page.locator('[data-testid="pb-filter-warning"]').click();
  await waitUntil(async () => (await rows.count()) === 0);
  check('35 «Avisos» sin avisos lo dice (no deja la lista en blanco)', /Ningún problema coincide/.test(await page.locator('app-problems-panel .empty').innerText()));
  await page.locator('[data-testid="pb-filter-error"]').click();
  await waitUntil(async () => (await rows.count()) === 2);
  check('35 «Errores» muestra los dos', (await rows.count()) === 2);
  await page.locator('[data-testid="pb-filter-all"]').click();

  // Solo el archivo abierto (la pestaña activa es main.pug)
  await page.locator('[data-testid="pb-only-open"]').check();
  await waitUntil(async () => (await rows.count()) === 1);
  check('35 «Solo el archivo abierto» deja el problema de main.pug', (await rows.count()) === 1 && (await rows.first().innerText()).includes('main.pug'), (await rows.allInnerTexts()).join(' | '));
  await page.locator('[data-testid="pb-only-open"]').uncheck();
  await waitUntil(async () => (await rows.count()) === 2);

  // Anterior / siguiente
  const position = page.locator('[data-testid="pb-position"]');
  check('35 sin selección dice «2 problemas»', (await position.innerText()).trim() === '2 problemas', await position.innerText());
  await page.locator('[data-testid="pb-next"]').click();
  await waitUntil(async () => (await position.innerText()).trim() === '1 de 2');
  const firstPath = await waitUntil(async () => (await activePath(page)) ?? null);
  check('35 «Siguiente» va al primero («1 de 2») y abre su archivo en esa línea', (await position.innerText()).trim() === '1 de 2' && !!firstPath && (await activeLine(page)) > 0, `${await activePath(page)}:${await activeLine(page)}`);
  await page.locator('[data-testid="pb-next"]').click();
  await waitUntil(async () => (await position.innerText()).trim() === '2 de 2');
  check('35 «Siguiente» otra vez va al segundo («2 de 2»)', (await position.innerText()).trim() === '2 de 2');
  await page.locator('[data-testid="pb-next"]').click();
  await waitUntil(async () => (await position.innerText()).trim() === '1 de 2');
  check('35 y al final da la vuelta', (await position.innerText()).trim() === '1 de 2');
  await page.locator('[data-testid="pb-prev"]').click();
  await waitUntil(async () => (await position.innerText()).trim() === '2 de 2');
  check('35 «Anterior» retrocede dando la vuelta', (await position.innerText()).trim() === '2 de 2');
  check('35 la fila actual queda resaltada', (await page.locator('app-problems-panel .diag-row.selected').count()) === 1);

  // F8 / Mayús+F8 con el foco en el panel
  await page.locator('[data-testid="pb-next"]').focus();
  await page.keyboard.press('F8');
  await waitUntil(async () => (await position.innerText()).trim() === '1 de 2');
  check('35 F8 con el foco en el panel pasa al siguiente', (await position.innerText()).trim() === '1 de 2');
  await page.locator('[data-testid="pb-next"]').focus(); // «Ir a» enfoca el editor, donde F8 es de Monaco
  await page.keyboard.press('Shift+F8');
  await waitUntil(async () => (await position.innerText()).trim() === '2 de 2');
  check('35 Mayús+F8 vuelve al anterior', (await position.innerText()).trim() === '2 de 2');

  // Ir al error
  await page.locator('app-problems-panel .diag-go', { hasText: 'main.pug' }).click();
  check('35 «Ir al error» lleva a main.pug:4', !!(await waitUntil(async () => (await activePath(page)) === '/main.pug' && (await activeLine(page)) === 4, 4000)), `${await activePath(page)}:${await activeLine(page)}`);

  // Teclado de las pestañas
  await page.locator('[data-testid="tab-problems"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('#panel-log').waitFor({ timeout: 4000 });
  check('35 → cambia a «Registro» y mueve el foco a su pestaña', (await page.locator('[data-testid="tab-log"]').getAttribute('aria-selected')) === 'true' && (await waitUntil(async () => (await focusedTestId(page)) === 'tab-log')) === true, String(await focusedTestId(page)));
  await page.keyboard.press('ArrowLeft');
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
  check('35 ← vuelve a «Problemas»', (await page.locator('[data-testid="tab-problems"]').getAttribute('aria-selected')) === 'true');
  await page.keyboard.press('End');
  await page.locator('#panel-log').waitFor({ timeout: 4000 });
  check('35 Fin salta a la última pestaña (Registro)', (await page.locator('[data-testid="tab-log"]').getAttribute('aria-selected')) === 'true');
  await page.keyboard.press('Home');
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
  check('35 Inicio salta a la primera pestaña (Problemas)', (await page.locator('[data-testid="tab-problems"]').getAttribute('aria-selected')) === 'true');

  // El Registro no repite los problemas de compilación: «Esenciales» no los trae, «Todo» sí (como detalle)
  await openLogTab(page);
  const logText = async () => (await page.locator('app-terminal-panel').innerText()).replace(/\s+/g, ' ');
  check('35 «Esenciales» del Registro no repite el error de compilación', !/Línea 4/.test(await logText()), await logText());
  await page.locator('[data-testid="log-filter-all"]').click();
  await waitUntil(async () => /Línea 4/.test(await logText()));
  check('35 «Todo» sí lo conserva como detalle', /Línea 4/.test(await logText()), await logText());
  await openProblemsTab(page);

  // Barra de estado: los contadores abren «Problemas»
  check('35 la barra de estado cuenta los errores (2)', /2 errores/.test(await page.locator('[data-testid="status-errors"]').innerText()), await page.locator('[data-testid="status-errors"]').innerText());
  await page.locator('[data-testid="tab-log"]').click();
  await page.locator('[data-testid="status-errors"]').click();
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
  check('35 pulsar los errores de la barra de estado abre «Problemas» y lleva allí el foco', (await page.locator('[data-testid="tab-problems"]').getAttribute('aria-selected')) === 'true' && (await waitUntil(async () => (await focusedTestId(page)) === 'tab-problems')) === true, String(await focusedTestId(page)));

  // Paleta
  await page.locator('[data-testid="tab-log"]').click();
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('panel Problemas');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === 'Abrir el panel Problemas');
  await page.keyboard.press('Enter');
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
  check('35 el comando «Abrir el panel Problemas» de la paleta funciona', (await page.locator('[data-testid="tab-problems"]').getAttribute('aria-selected')) === 'true');
  check('35 sin errores no controlados (dos problemas)', app.errors.length === 0, app.errors.join(' | '));
  await app.close();

  // ---------- 2. Arreglo con un clic desde el panel ----------
  app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Arreglo', files: { '/main.pug': 'html\n  body\n    +tarjeta("hola")\n', '/mixins.pug': 'mixin saludo(n)\n  p= n\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  page = app.page;
  const fix = page.locator('app-problems-panel .diag-fix');
  await fix.waitFor({ timeout: 10000 });
  check('35 el panel ofrece el arreglo con un clic', (await fix.innerText()).includes('Crear mixin tarjeta'), await fix.innerText());
  await fix.click();
  check('35 aplicarlo deja el panel sin problemas', !!(await waitUntil(async () => (await page.locator('app-problems-panel .diag-row').count()) === 0 && (await page.locator('[data-testid="problem-strip"]').count()) === 0, 10000)));
  check('35 y la pestaña pierde su contador', (await page.locator('[data-testid="tab-problems-count"]').count()) === 0);
  check('35 el panel dice que no hay problemas', /Sin problemas/.test(await page.locator('app-problems-panel .empty').innerText()));
  await app.close();

  // ---------- 3. Franja del preview y última vista correcta ----------
  app = await openApp(env, {
    path: '/ide',
    session: { projectName: 'Franja', files: { '/main.pug': 'h1 Vista buena\n' }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' },
  });
  page = app.page;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 8000 });
  await waitUntil(async () => (await previewText(page)).includes('Vista buena'));
  check('35 sin problemas no hay franja en el preview', (await page.locator('[data-testid="problem-strip"]').count()) === 0);
  await setModel(page, '/main.pug', 'h1 Vista buena\n+inexistente()\n');
  const strip = page.locator('[data-testid="problem-strip"]');
  await strip.waitFor({ timeout: 10000 });
  check('35 al fallar aparece una franja pequeña «1 problema»', (await page.locator('[data-testid="problem-strip-count"]').innerText()).trim() === '1 problema', await strip.innerText());
  const box = await strip.boundingBox();
  check('35 la franja es pequeña (una línea, menos de 60 px)', !!box && box.height < 60, JSON.stringify(box));
  await waitUntil(async () => /Última vista correcta · hace \d+ s/.test(await strip.innerText()));
  check('35 dice «Última vista correcta · hace N s»', /Última vista correcta · hace \d+ s/.test(await strip.innerText()), await strip.innerText());
  check('35 y el preview conserva la última vista correcta (no se queda en blanco)', (await previewText(page)).includes('Vista buena'), await previewText(page));

  // «Ver» abre y enfoca el panel, aunque estuviera cerrado
  await page.getByRole('button', { name: 'Cerrar el panel' }).click();
  await waitUntil(async () => (await page.locator('app-terminal-panel').count()) === 0);
  await page.locator('[data-testid="problem-strip-view"]').click();
  await page.locator('#panel-problems').waitFor({ timeout: 4000 });
  check('35 «Ver» abre el panel «Problemas» y lleva el foco a él', (await waitUntil(async () => (await focusedTestId(page)) === 'tab-problems')) === true, String(await focusedTestId(page)));

  await setModel(page, '/main.pug', 'h1 Vista nueva\n');
  await waitUntil(async () => (await strip.count()) === 0 && (await previewText(page)).includes('Vista nueva'), 10000);
  check('35 al corregir desaparece la franja y el preview muestra la vista nueva', (await strip.count()) === 0 && (await previewText(page)).includes('Vista nueva'), await previewText(page));
  check('35 sin errores ni peticiones externas', app.errors.length === 0 && app.external.length === 0, app.errors.concat(app.external).join(' | '));
  await app.close();
}
