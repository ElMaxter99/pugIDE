import { openApp, openProblemsTab, previewFrame, waitUntil } from '../lib.mjs';
import { check } from '../lib.mjs';

// Less real: se enlaza una hoja `.less` desde el Pug, se resuelve `@import` y una hoja que falta aparece en «Problemas».
const session = (files) => ({ projectName: 'Less', files, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' });
const style = async (page, sel, prop) => {
  try {
    const f = await previewFrame(page);
    return await f.evaluate(([s, p]) => { const el = document.querySelector(s); return el ? getComputedStyle(el)[p] : null; }, [sel, prop]);
  } catch { return null; }
};
const expectStyle = async (page, sel, prop, want, seen) => !!(await waitUntil(async () => (seen.v = await style(page, sel, prop)) === want, 9000));

export default async function (env) {
  const pug = (...links) => `doctype html\nhtml\n  head\n${links.map((l) => `    link(rel='stylesheet' href='${l}')`).join('\n')}\n  body\n    p.a hola\n    p.b mezcla\n`;
  const less = [
    "@import 'vars.less';",
    '.a { color: @azul; }',
    '.b { color: darken(#ff0000, 10%); }',
    '',
  ].join('\n');
  const app = await openApp(env, { path: '/ide', session: session({ '/main.pug': pug('/styles/tema.less'), '/styles/tema.less': less, '/styles/vars.less': '@azul: #0000ff;\n' }) });
  const { page } = app;
  await page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  const seen = { v: null };
  check('41 Less: variable e @import (azul)', await expectStyle(page, '.a', 'color', 'rgb(0, 0, 255)', seen), String(seen.v));
  check('41 Less: función darken (rojo oscuro)', await expectStyle(page, '.b', 'color', 'rgb(204, 0, 0)', seen), String(seen.v));
  await app.close();

  const miss = await openApp(env, { path: '/ide', session: session({ '/main.pug': pug('/styles/nada.less') }) });
  await miss.page.locator('.monaco-editor').first().waitFor({ timeout: 25000 });
  await openProblemsTab(miss.page);
  check('41 una hoja .less que falta aparece en «Problemas»', !!(await waitUntil(async () => /nada\.less/.test(await miss.page.locator('app-problems-panel').innerText()), 9000)), await miss.page.locator('app-problems-panel').innerText());
  await miss.close();
}
