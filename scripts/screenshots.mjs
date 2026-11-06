// Regenera las capturas del README (docs/screenshots/*.png) desde el build de producción:
//
//   npm run build:prod && npm run screenshots
//
// Reutiliza las escenas y el proyecto de ejemplo «Informe trimestral» de design/tools (las mismas que alimentan el lienzo
// de diseño), así que README, lienzo y app enseñan siempre lo mismo. Solo Chromium; 1440×900.
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from '../design/tools/server.mjs';
import { chooseMenu, openApp, settle, sleep, uploadAsset } from '../design/tools/lib.mjs';
import { scenes } from '../design/tools/scenes.mjs';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/screenshots');
mkdirSync(out, { recursive: true });

/** nombre del archivo → escena de design/tools (id) */
const FROM_SCENES = {
  inicio: 'V-04',
  ide: 'V-01',
  errores: 'V-02',
  pdf: 'V-06',
  paleta: 'V-12',
  'ide-claro': 'V-05',
};

const env = await start();
try {
  for (const [name, id] of Object.entries(FROM_SCENES)) {
    const sc = scenes.find((s) => s.id === id);
    if (!sc) throw new Error(`No existe la escena ${id} en design/tools/scenes.mjs`);
    const { context, page } = await openApp(env, { path: sc.path ?? '/ide', session: sc.session, prefs: sc.prefs, consent: sc.consent, storage: sc.storage });
    await settle(page);
    if (sc.run) await sc.run({ page, env });
    // En «errores» el panel inferior se maximiza para que se vea el problema completo con su arreglo con un clic.
    if (name === 'errores') await page.locator('app-terminal-panel button[title^="Maximizar"]').click();
    await page.mouse.move(1439, 899);
    await settle(page, { ms: 700 });
    await page.screenshot({ path: join(out, `${name}.png`) });
    console.log(`✓ ${name}.png (${id})`);
    await context.close();
  }

  // Instantáneas del proyecto: dos guardadas con nombre, diálogo abierto
  const ide = scenes.find((s) => s.id === 'V-01');
  const { context, page } = await openApp(env, { path: ide.path, session: ide.session, prefs: ide.prefs, consent: ide.consent });
  await settle(page);
  await uploadAsset(page);
  const dlg = page.locator('[role="dialog"][aria-label="Instantáneas del proyecto"]');
  const save = async (name) => {
    await chooseMenu(page, 'proyecto', 'snapshots');
    await dlg.waitFor();
    await dlg.locator('[data-testid="snapshot-name"]').fill(name);
    await dlg.locator('[data-testid="snapshot-save"]').click();
    await sleep(700);
  };
  await save('Versión inicial del informe');
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const model = window.monaco.editor.getModels().find((m) => m.uri.path === '/main.pug');
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: model.getValue() + '\n//- Revisado por Dirección\n' }], () => null);
  });
  await sleep(900);
  await save('Con el resumen revisado');
  await page.mouse.move(1439, 899);
  await sleep(500);
  await page.screenshot({ path: join(out, 'instantaneas.png') });
  console.log('✓ instantaneas.png');
  await context.close();
} finally {
  await env.close();
}
