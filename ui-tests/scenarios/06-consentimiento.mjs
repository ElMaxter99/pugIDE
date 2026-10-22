import { check, openApp, sleep, waitUntil } from '../lib.mjs';

const insights = (app) => app.requests.filter((u) => u.includes('/_vercel/insights/')).length;
const banner = (page) => page.locator('[aria-label="Aviso de privacidad"]');

// Aviso de privacidad: la analítica anónima solo se carga si el usuario la acepta
export default async function (env) {
  // Sin decidir: aviso visible y ninguna petición de analítica
  let app = await openApp(env, { path: '/', consent: null, wait: 2500 });
  check('06 sin decisión previa se muestra el aviso en la landing', (await banner(app.page).count()) === 1);
  check('06 sin decisión no se carga la analítica', insights(app) === 0, String(insights(app)));
  check('06 la landing avisa de la analítica opcional', (await app.page.locator('.privacy-note').innerText()).includes('permiso'));

  // Aceptar: se carga el script, se guarda la decisión y el aviso desaparece
  await app.page.click('[aria-label="Aviso de privacidad"] button:has-text("Aceptar")');
  await sleep(1200);
  check('06 aceptar carga la analítica y cierra el aviso', insights(app) > 0 && (await banner(app.page).count()) === 0, String(insights(app)));
  check('06 la decisión se guarda', (await app.page.evaluate(() => localStorage.getItem('pug-ide-analytics-consent'))) === 'granted');
  const before = insights(app);
  await app.page.reload();
  await sleep(2000);
  check('06 al volver no se pregunta de nuevo y la analítica se carga', (await banner(app.page).count()) === 0 && insights(app) > before);
  await app.close();

  // Rechazar: nunca se carga
  app = await openApp(env, { path: '/ide', consent: null, wait: 3000 });
  check('06 el aviso también aparece en el IDE', (await banner(app.page).count()) === 1);
  await app.page.click('[aria-label="Aviso de privacidad"] button:has-text("Rechazar")');
  await sleep(800);
  await app.page.reload();
  await sleep(2500);
  check('06 rechazar: sin aviso y sin analítica, ni tras recargar', (await banner(app.page).count()) === 0 && insights(app) === 0, String(insights(app)));

  // Cambiar de opinión desde la paleta de comandos
  await app.page.keyboard.press('Control+k');
  await app.page.keyboard.type('privacidad');
  const list = () => app.page.locator('.item .title').allInnerTexts();
  await waitUntil(async () => (await list()).length === 1);
  const items = await list();
  check('06 la paleta no pierde las teclas escritas nada más abrirla', (await app.page.inputValue('input[role=combobox]')) === 'privacidad');
  check('06 la paleta muestra la decisión actual', items.some((t) => t.includes('no permitida')), JSON.stringify(items));
  await app.page.keyboard.press('Enter');
  const consent = () => app.page.evaluate(() => localStorage.getItem('pug-ide-analytics-consent'));
  const granted = await waitUntil(async () => (await consent()) === 'granted' && insights(app) > 0);
  check('06 permitirla desde la paleta carga la analítica', !!granted, `consent=${await consent()} peticiones=${insights(app)} paleta=${await app.page.locator('[aria-label="Paleta de comandos"]').count()}`);
  await app.close();
}
