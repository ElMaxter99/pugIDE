import { check, openApp, previewText, sleep } from '../lib.mjs';

// Service worker: tras una visita, la app arranca sin conexión (Monaco, preview, iconos y fuentes incluidos)
export default async function (env) {
  const online = await openApp({ ...env, serviceWorkers: 'allow' }, { wait: 2500 });
  const { page, context } = online;
  let registered = false;
  for (let i = 0; i < 45 && !registered; i++) {
    registered = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
    if (!registered) await sleep(1000);
  }
  check('05 el service worker se registra', registered);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await sleep(4000); // prefetch de la app y de los motores
  await page.locator('text=demo.css').first().click().catch(() => {}); // Monaco pide y cachea sus lenguajes
  await sleep(1500);
  await page.reload();
  await sleep(3000);
  check('05 la página queda controlada por el service worker', await page.evaluate(() => !!navigator.serviceWorker.controller));

  await context.setOffline(true);
  const off = await context.newPage();
  const errors = [];
  const failed = [];
  off.on('pageerror', (e) => { if (!/Unexpected token '<'/.test(e.message)) errors.push(e.message); });
  // La analítica de Vercel (/_vercel/insights) solo existe en el despliegue de Vercel: se ignora.
  off.on('requestfailed', (r) => { if (!r.url().includes('/_vercel/')) failed.push(r.url().slice(0, 80)); });
  await off.goto(env.baseURL + '/ide?demo=true');
  await sleep(6000);
  check('05 sin conexión: carga el editor Monaco', (await off.locator('.monaco-editor').count()) === 1);
  check('05 sin conexión: el preview compila el proyecto demo', (await previewText(off)).includes('Demo Completo'));
  const iconWidth = await off.evaluate(() => {
    const el = [...document.querySelectorAll('.material-symbols-outlined')].find((e) => e.textContent.trim() === 'folder_open');
    return el ? Math.round(el.getBoundingClientRect().width) : null;
  });
  check('05 sin conexión: los iconos se dibujan', iconWidth !== null && iconWidth <= 30, String(iconWidth));
  check('05 sin conexión: ninguna petición falla ni hay errores', failed.length === 0 && errors.length === 0, failed.concat(errors).join(' | '));
  await online.close();
}
