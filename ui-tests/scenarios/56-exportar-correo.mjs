import { readFileSync } from 'node:fs';
import { check, openApp, previewText, waitUntil } from '../lib.mjs';

// P-23: «Exportar → HTML para correo…»: CSS en línea, sin scripts, peso contra el límite de Gmail y avisos.
const PUG = `doctype html
html
  head
    link(rel="stylesheet" href="styles/correo.css")
    script.
      window.x = 1
  body
    table.wrap
      tr
        td.cabecera(onclick="alert(1)") Hola Ana
    .fila
      p.texto(style="margin: 4px") Tu resumen de julio
      img(src="https://example.invalid/foto.png")
`;
const CSS = `.wrap { width: 600px }
td.cabecera { color: #ffffff; background: #5b3cc4 }
.texto { color: #333333; margin: 0 }
#nada { color: red }
.fila { display: flex }
a:hover { color: blue }
@media (max-width: 480px) { .wrap { width: 100% } }
@font-face { font-family: 'Inter'; src: url(inter.woff2) }
`;
const session = { projectName: 'Boletín', files: { '/main.pug': PUG, '/styles/correo.css': CSS }, openTabPaths: ['/main.pug'], activeTabPath: '/main.pug' };

export default async function (env) {
  const app = await openApp(env, { path: '/ide', session });
  const { page } = app;
  await waitUntil(async () => /Hola Ana/.test(await previewText(page)), 15000);

  await page.locator('[data-testid="menu-exportar"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'HTML para correo' }).click();
  const dlg = page.locator('[data-testid="email-export"]');
  await dlg.waitFor({ timeout: 4000 });
  check('56 el diálogo dice qué plantilla exporta', (await dlg.locator('h2').innerText()).includes('main.pug'));
  const weight = await page.locator('[data-testid="email-weight"]').innerText();
  check('56 mide el peso contra los 102 KB de Gmail', /KB de 102 KB/.test(weight) && /no lo recorta/.test(weight), weight);
  const warn = await page.locator('[data-testid="email-warnings"]').innerText();
  check('56 avisa de flexbox (Outlook)', /Flexbox o grid/.test(warn) && /\.fila/.test(warn), warn);
  check('56 avisa de la fuente web', /Fuente web «Inter»/.test(warn));
  check('56 avisa de la imagen sin texto alternativo', /1 imagen sin texto alternativo/.test(warn));

  const download = page.waitForEvent('download');
  await page.locator('[data-testid="email-download"]').click();
  const file = await download;
  check('56 se descarga <plantilla>-correo.html', file.suggestedFilename() === 'main-correo.html', file.suggestedFilename());
  const html = readFileSync(await file.path(), 'utf8');
  check('56 el CSS pasa a atributos style', /<td class="cabecera" style="[^"]*color: #ffffff[^"]*background: #5b3cc4/.test(html), html.slice(0, 600));
  check('56 el style propio gana a la regla y se conserva', /<p class="texto" style="[^"]*color: #333333[^"]*margin: 4px/.test(html), html);
  check('56 sin <script> ni atributos de eventos', !/<script/i.test(html) && !/onclick/i.test(html));
  check('56 conserva @media y :hover en un <style>, y nada más', /@media \(max-width: 480px\)/.test(html) && /a:hover/.test(html) && !/\.texto\s*\{/.test(html) && !/@font-face/.test(html));
  check('56 sin restos del editor (inspector, data-pugide)', !/data-pugide/.test(html) && !/pugide-inspector/.test(html));
  await dlg.waitFor({ state: 'detached', timeout: 4000 });

  // Sin poner el CSS en línea se queda el <style> tal cual
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  await page.keyboard.type('Exportar HTML para correo');
  await waitUntil(async () => (await page.locator('.item .title').allInnerTexts())[0] === 'Exportar HTML para correo…');
  await page.keyboard.press('Enter');
  await dlg.waitFor({ timeout: 4000 });
  await page.locator('[data-testid="email-inline"]').uncheck();
  const d2 = page.waitForEvent('download');
  await page.locator('[data-testid="email-download"]').click();
  const html2 = readFileSync(await (await d2).path(), 'utf8');
  check('56 sin «CSS en línea» el <style> se conserva', /\.texto\s*\{/.test(html2) && !/<td class="cabecera" style=/.test(html2));
  check('56 sin errores no controlados', app.errors.length === 0, app.errors.join(' | '));
  await app.close();
}
