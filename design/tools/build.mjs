// Fotografía la app real (build de producción) y escribe las mesas .dc.html del lienzo.
//
//   npm run build:prod
//   node design/tools/build.mjs [--out design/canvas] [--only V-01,V-05] [--verify DIR]
//
// --verify DIR guarda, por mesa, la captura real (DIR/V-NN.real.png) y la de la mesa generada (DIR/V-NN.mesa.png).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './server.mjs';
import { openApp, settle } from './lib.mjs';
import { capture, boardHtml } from './capture.mjs';
import { localHtml } from './local-render.mjs';
import { scenes } from './scenes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(here, '../canvas'));
const only = arg('--only')?.split(',');
const verify = arg('--verify');
if (verify) mkdirSync(verify, { recursive: true });
mkdirSync(out, { recursive: true });

const env = await start();
const rendered = verify ? await (await env.browser.newContext({ viewport: { width: 1440, height: 2400 } })).newPage() : null;
for (const sc of scenes.filter((s) => !only || only.includes(s.id))) {
  const t = Date.now();
  const { context, page } = await openApp(env, { path: sc.path ?? '/ide', session: sc.session, prefs: sc.prefs, consent: sc.consent, storage: sc.storage });
  page.on('pageerror', (e) => { if (!/Service worker is disabled/.test(e.message)) console.log(`  [${sc.id}] pageerror: ${e.message}`); });
  try {
    await settle(page);
    if (sc.run) await sc.run({ page, env });
    await page.mouse.move(1439, 899);
    await settle(page, { ms: 500 });
    let height = 900;
    if (sc.kind === 'landing') {
      // Página de presentación: se fotografía entera (el alto de la mesa es el de la página)
      height = await page.evaluate(() => Math.max(...[...document.querySelectorAll('body *')].map((e) => e.scrollHeight)));
      await page.setViewportSize({ width: 1440, height });
      await settle(page, { ms: 600 });
    }
    if (verify) await page.screenshot({ path: join(verify, `${sc.id}.real.png`) });
    const cap = await capture(page, { hrefs: sc.hrefs ?? [], height });
    const file = join(out, sc.file);
    writeFileSync(file, boardHtml({ title: sc.title, ...cap }));
    if (verify && rendered) {
      const tmp = join(verify, `${sc.id}.local.html`);
      localHtml(file, tmp);
      await rendered.setViewportSize({ width: 1440, height: cap.height });
      await rendered.goto('file://' + tmp);
      await rendered.waitForTimeout(1200);
      await rendered.screenshot({ path: join(verify, `${sc.id}.mesa.png`), clip: { x: 0, y: 0, width: 1440, height: cap.height } });
    }
    console.log(`${sc.id} ${sc.file} ${(cap.html.length / 1024).toFixed(0)} KB  ${Date.now() - t} ms`);
  } catch (e) {
    console.log(`${sc.id} FALLÓ: ${e.stack ?? e}`);
  }
  await context.close();
}
await env.close();
