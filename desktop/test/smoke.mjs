// Prueba de humo de la app de escritorio: lanza Electron de verdad (Playwright `_electron`) contra la web compilada y
// comprueba arranque, seguridad (CSP y sandbox de producción), ausencia de red, service worker y analítica apagados.
// Necesita `npm run build:prod` en la carpeta del proyecto. En Linux sin pantalla: `xvfb-run -a npm test`.
import { _electron as electron } from 'playwright-core';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(here, '..');
let failed = 0;
const step = (m) => console.log(`... ${m}`); // trazas: si algo se cuelga en el CI, el log dice dónde
// Perro guardián: si la prueba no termina, falla con un mensaje en vez de colgar el flujo hasta su límite de tiempo.
const watchdog = setTimeout(() => { console.log('FAIL la prueba de humo no terminó en 4 minutos (¿Electron colgado al arrancar?)'); process.exit(1); }, 4 * 60 * 1000);
watchdog.unref?.();
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !detail ? '' : `  -> ${detail}`}`); if (!ok) failed++; };
const wait = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch { /* sigue */ } await new Promise((r) => setTimeout(r, 250)); } return null; };

// Por defecto, el Electron de desktop/node_modules con el código de src/. Con PUGIDE_EXECUTABLE se prueba el binario ya
// empaquetado (el de `npm run pack` o el instalado), que es el que recibe la gente.
const packaged = process.env.PUGIDE_EXECUTABLE;
// Perfil y carpeta de trabajo de usar y tirar: la prueba no toca los de la persona.
const profile = mkdtempSync(join(tmpdir(), 'pugide-perfil-'));
const folder = mkdtempSync(join(tmpdir(), 'pugide-cliente-'));
mkdirSync(join(folder, 'styles'));
mkdirSync(join(folder, '.git'));
writeFileSync(join(folder, 'main.pug'), 'doctype html\nhtml\n  head\n    link(rel="stylesheet" href="styles/a.css")\n  body\n    h1 Desde el disco\n');
writeFileSync(join(folder, 'styles', 'a.css'), 'h1 { color: #333 }\n');
writeFileSync(join(folder, '.git', 'config.txt'), 'no se toca');
writeFileSync(join(folder, 'notas.pdf'), 'binario');
step('lanzando Electron');
const app = await electron.launch({ timeout: 90000, executablePath: packaged || createRequire(import.meta.url)('electron'), args: [...(packaged ? [] : ['.']), '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', `--user-data-dir=${profile}`], cwd: desktopDir, env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1', PUGIDE_TEST_PICK_FOLDER: folder } });
const violations = [];
const external = [];
try {
  step('Electron lanzado, esperando la ventana');
  const page = await app.firstWindow();
  step('ventana abierta: ' + page.url());
  page.on('console', (m) => { if (/Content Security Policy|Refused to /i.test(m.text())) violations.push(m.text().slice(0, 200)); });
  page.on('request', (r) => { const u = r.url(); if (!/^(pugide:|blob:|data:|devtools:)/.test(u)) external.push(u); });
  // La ventana puede abrirse antes de que cargue la app (en el primer arranque de un binario empaquetado tarda más): se espera.
  await page.waitForURL(/^pugide:\/\/app\//, { timeout: 60000 });
  await page.waitForLoadState('domcontentloaded');

  check('arranca en la app (pugide://app/ide)', page.url().startsWith('pugide://app/'), page.url());
  check('la ventana se llama PugIDE', (await page.title()).includes('PugIDE'), await page.title());
  const icon = await app.evaluate(({ app: a }) => {
    const { existsSync } = process.getBuiltinModule('node:fs');
    const file = `${a.getAppPath()}/build/${process.platform === 'win32' ? 'icon.ico' : 'icon.png'}`;
    return { file, ok: existsSync(file) };
  });
  check('el icono de la ventana está en la app (si no, se ve el de Electron)', icon.ok, icon.file);
  const info = await page.evaluate(() => window.pugideDesktop ?? null);
  check('el preload expone la plataforma y la versión', !!info && typeof info.platform === 'string' && /^\d+\.\d+\.\d+/.test(info.version), JSON.stringify(info));
  check('y la dirección web para los enlaces de compartir', info?.webUrl === 'https://pug-ide.vercel.app', String(info?.webUrl));
  const shape = await page.evaluate(() => Object.fromEntries(Object.entries(window.pugideDesktop).map(([k, v]) => [k, typeof v])));
  check('y solo dos funciones acotadas (invoke con lista de canales y onEvent)', JSON.stringify(Object.keys(shape).sort()) === '["invoke","onEvent","platform","version","webUrl"]' && shape.invoke === 'function' && shape.onEvent === 'function', JSON.stringify(shape));
  const denied = await page.evaluate(async () => { try { await window.pugideDesktop.invoke('fs:read', { path: '/etc/passwd' }); return 'permitido'; } catch (e) { return String(e.message); } });
  check('un canal que no está en la lista se rechaza', /no permitido/i.test(denied), denied);
  const noToken = await page.evaluate(() => window.pugideDesktop.invoke('ws:create', { name: 'x', color: '#ddb7ff', token: 'inventado' }));
  check('no se puede crear un espacio en una carpeta que no se eligió con el diálogo', noToken === null, JSON.stringify(noToken));
  // Monaco define un `require` propio (su cargador AMD), así que no basta con mirar si existe: se comprueba que la página no
  // pueda llegar a Node (ni `process` de Node ni cargar `fs`).
  await wait(async () => (await page.locator('.monaco-editor').count()) > 0); // que el cargador de Monaco ya esté puesto
  const node = await page.evaluate(() => {
    const hasProcess = typeof process !== 'undefined' && !!process.versions?.node;
    let fs = false;
    try { fs = typeof require === 'function' && !!require('fs')?.readFileSync; } catch { fs = false; }
    return { hasProcess, fs, module: typeof module !== 'undefined' };
  });
  check('la página no tiene Node (ni process de Node, ni puede cargar fs)', !node.hasProcess && !node.fs && !node.module, JSON.stringify(node));

  const editor = await wait(async () => (await page.locator('.monaco-editor').count()) > 0);
  check('carga el editor (Monaco, con sus workers bajo la CSP)', !!editor);
  const preview = await wait(async () => (await page.locator('app-preview-panel iframe').count()) > 0);
  check('carga la vista previa', !!preview);
  const compiled = await wait(async () => page.frames().some((f) => f !== page.mainFrame() && f.url().startsWith('blob:') || f.url().startsWith('pugide://app/assets/preview-frame')), 30000);
  check('la vista previa compila y pinta (marco aislado)', !!compiled);

  const csp = await page.evaluate(async () => {
    const get = async (p) => (await fetch(p)).headers.get('content-security-policy') ?? '';
    return { main: await get('/ide'), render: await get('/assets/render-frame.html'), prev: await get('/assets/preview-frame.html') };
  });
  check('la app lleva la CSP de producción', /default-src 'self'/.test(csp.main) && /object-src 'none'/.test(csp.main), csp.main.slice(0, 80));
  check('los marcos del usuario llevan su sandbox', /sandbox allow-scripts/.test(csp.render) && /sandbox allow-scripts/.test(csp.prev), `${csp.render.slice(-40)} | ${csp.prev.slice(-40)}`);
  const status = await page.evaluate(async () => ({ spa: (await fetch('/ide/algo')).status, miss: (await fetch('/assets/no-existe.js')).status, trav: (await fetch('/..%2f..%2fpackage.json')).status }));
  check('las rutas de la app (SPA) funcionan, lo que no existe da 404 y no se sale de la carpeta', status.spa === 200 && status.miss === 404 && status.trav === 403, JSON.stringify(status));

  const sw = await page.evaluate(async () => { try { return navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0; } catch { return 0; } });
  check('no hay service worker (la app se actualiza con el instalador)', sw === 0, String(sw));
  check('no hay aviso de privacidad ni analítica', (await page.locator('app-consent-banner [role="region"]').count()) === 0);

  const before = app.windows().length;
  await page.evaluate(() => { window.open('https://example.com/', '_blank'); });
  await new Promise((r) => setTimeout(r, 800));
  check('un enlace externo no abre ventanas dentro de la app', app.windows().length === before, String(app.windows().length));

  // ---------- Aviso de versión nueva (P-27): se pregunta una vez y, sin permiso, no hay red ----------
  step('aviso de versión nueva');
  await page.locator('[data-testid="welcome-close"]').click({ timeout: 10000 }).catch(() => undefined);
  const ask = page.locator('[data-testid="update-ask"]');
  check('tras la bienvenida se pregunta (una vez) si se quieren avisos de versión nueva', !!(await wait(async () => (await ask.count()) === 1, 10000)));
  check('la pregunta dice a dónde se consulta y que no se envía nada', /github\.com/.test(await ask.innerText()) && /No se envía nada/.test(await ask.innerText()));
  await page.locator('[data-testid="update-ask-no"]').click();
  await wait(async () => (await ask.count()) === 0, 5000);
  const upd = await page.evaluate(() => window.pugideDesktop.invoke('upd:state'));
  check('«No, gracias» lo deja apagado y no vuelve a preguntar', upd.asked === true && upd.enabled === false && upd.latest === null, JSON.stringify(upd));
  check('la versión instalada es la de la app', /^\d+\.\d+\.\d+/.test(upd.current), upd.current);

  // ---------- Espacios de trabajo (P-26) ----------
  step('espacios de trabajo');
  await page.locator('[data-testid="workspaces-open"]').click();
  const wsDlg = page.locator('[data-testid="workspaces"]');
  await wsDlg.waitFor({ timeout: 5000 });
  check('la lista de espacios empieza vacía y lo explica', /Aún no tienes espacios de trabajo/.test(await wsDlg.innerText()));
  await page.locator('[data-testid="workspace-new"]').click();
  check('sin carpeta no deja crear', await page.locator('[data-testid="workspace-create"]').isDisabled());
  await page.locator('[data-testid="workspace-pick"]').click();
  await wait(async () => (await page.locator('[data-testid="workspace-found"]').count()) === 1, 8000);
  check('al elegir la carpeta dice lo que ya hay en ella', /1 plantilla \.pug/.test(await page.locator('[data-testid="workspace-found"]').innerText()));
  await page.locator('[data-testid="workspace-name"]').fill('Cliente de prueba');
  await page.locator('[data-testid="workspace-create"]').click();
  await wsDlg.waitFor({ state: 'detached', timeout: 15000 });
  const paths = () => page.evaluate(() => [...document.querySelectorAll('app-file-tree [data-path]')].map((e) => e.getAttribute('data-path')));
  check('el espacio abre los archivos de la carpeta', !!(await wait(async () => { const p = await paths(); return p.includes('/main.pug') && p.includes('/styles/a.css'); }, 15000)), (await paths()).join());
  check('lo que la app no maneja (.git, un PDF) no aparece', !(await paths()).some((p) => /\.git|notas\.pdf/.test(p)));
  check('la barra enseña el espacio y que está guardado en disco', !!(await wait(async () => /Guardado en disco/.test(await page.locator('[data-testid="workspace-status"]').innerText()), 8000)) && /Cliente de prueba/.test(await page.locator('[data-testid="menu-espacio"]').innerText()));
  const editorText = async () => (await page.locator('.monaco-editor .view-lines').first().innerText()).replace(/\u00a0/g, ' ');
  check('el editor enseña el archivo del disco', !!(await wait(async () => /Desde el disco/.test(await editorText()), 10000)), await editorText());

  // Editar en la app → se escribe en el archivo
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End');
  await page.keyboard.type('\n//- Editado en PugIDE');
  const onDisk = () => readFileSync(join(folder, 'main.pug'), 'utf8');
  check('lo que se edita en la app se guarda en el archivo del disco', !!(await wait(() => /Editado en PugIDE/.test(onDisk()), 15000)), onDisk());
  check('los datos del espacio van a .pugide/datasets.json', !!(await wait(() => existsSync(join(folder, '.pugide', 'datasets.json')), 10000)));
  check('lo ajeno sigue intacto en el disco', readFileSync(join(folder, '.git', 'config.txt'), 'utf8') === 'no se toca' && existsSync(join(folder, 'notas.pdf')));

  // Editar fuera (otro editor) → se recarga solo
  await new Promise((r) => setTimeout(r, 1800)); // margen para no confundirlo con el guardado propio
  writeFileSync(join(folder, 'styles', 'a.css'), 'h1 { color: #b00020 }\n');
  writeFileSync(join(folder, 'nuevo.pug'), 'p archivo nuevo\n');
  check('un archivo creado fuera aparece en el árbol', !!(await wait(async () => (await paths()).includes('/nuevo.pug'), 12000)), (await paths()).join());
  await page.locator('app-file-tree .file-row[data-path="/styles/a.css"]').click();
  check('un cambio hecho fuera (otro editor) se recarga solo en la app', !!(await wait(async () => /#b00020/.test(await editorText()), 12000)), await editorText());

  // Seguridad: no se puede escribir fuera de la carpeta
  const escape = await page.evaluate(async () => { const id = (await window.pugideDesktop.invoke('ws:list')).lastId; return window.pugideDesktop.invoke('ws:write', { id, change: { files: { '/../fuera.txt': 'x' }, assets: [], deleted: ['/../../otro.txt'] } }); });
  check('no se puede escribir ni borrar fuera de la carpeta del espacio', escape.written.length === 0 && escape.failed.includes('/../fuera.txt') && !existsSync(join(folder, '..', 'fuera.txt')), JSON.stringify(escape));

  // Cerrar el espacio deja la carpeta como está
  await page.locator('[data-testid="menu-espacio"]').click();
  await page.locator('[role="menuitem"]', { hasText: 'Cerrar el espacio' }).click();
  check('cerrar el espacio vuelve a los proyectos de la app y no borra nada del disco', !!(await wait(async () => (await page.locator('[data-testid="workspaces-open"]').count()) === 1, 10000)) && /Editado en PugIDE/.test(onDisk()) && existsSync(join(folder, 'nuevo.pug')));

  await new Promise((r) => setTimeout(r, 1500));
  check('sin violaciones de la CSP', violations.length === 0, violations.slice(0, 3).join(' | '));
  check('sin peticiones a internet (funciona sin conexión)', external.length === 0, external.slice(0, 3).join(' | '));
} finally {
  step('cerrando');
  await Promise.race([app.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => undefined);
  for (const d of [profile, folder]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* temporal */ } }
}
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
