// Genera la mesa «Componentes» (y su versión en tema claro): piezas reales de la app, fotografiadas en cada estado.
//
//   node design/tools/components.mjs [--out design/canvas] [--only dark|light]
//
// Cada pieza se extrae del DOM de la app real (como las pantallas) y se coloca sobre el fondo que tiene en la app.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from './server.mjs';
import { openApp, settle, uploadAsset, sleep, FILES, FILES_ERROR, SESSION, PREFS, MAIN_PUG_PDF, chooseMenu } from './lib.mjs';
import { extractInPage } from './extract-page.mjs';
import { freeze, boardHtml } from './capture.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(here, '../canvas'));
const only = arg('--only');

const TABS3 = ['/main.pug', '/mixins.pug', '/styles/informe.scss'];
const base = { ...SESSION, openTabPaths: TABS3 };
const errFiles = { ...FILES_ERROR, '/locales/es/translations.json': '{\n  "INFORME": {\n    "RESUMEN": "Resumen ejecutivo",\n' };

// Contextos: estados de la app de los que se sacan las piezas
const paletteOpen = async (page) => { await page.keyboard.press('Control+k'); await page.locator('[aria-label="Paleta de comandos"]').waitFor(); await sleep(300); };
const contexts = {
  ide: { session: base, run: async ({ page }) => { await uploadAsset(page); } },
  missing: { session: base, run: async () => {} },
  errors: { session: { ...base, files: errFiles, openTabPaths: ['/main.pug', '/mixins.pug'] }, run: async ({ page }) => { await page.locator('.compile-error').waitFor(); await page.getByRole('button', { name: /Todos los problemas/ }).click(); await sleep(400); } },
  pdf: { session: { ...base, files: { ...FILES, '/main.pug': MAIN_PUG_PDF } }, run: async ({ page }) => { await uploadAsset(page); await page.locator('button[title="PDF / página impresa"]').click(); await sleep(2200); } },
  dirty: { session: base, run: async ({ page }) => { await uploadAsset(page); await page.locator('.monaco-editor').first().click({ position: { x: 200, y: 80 } }); await page.keyboard.press('Control+End'); await page.keyboard.type('\n// cambio sin guardar'); await sleep(500); } },
  share: { session: base, run: async ({ page }) => { await uploadAsset(page); await chooseMenu(page, 'exportar', 'share'); await sleep(900); } },
  newfile: { session: base, run: async ({ page }) => { await uploadAsset(page); await page.locator('button[title="Nuevo archivo"]').click(); await sleep(400); } },
  delete: { session: base, run: async ({ page }) => { await uploadAsset(page); await page.getByText('cabecera.pug', { exact: true }).first().click({ button: 'right' }); await page.locator('.context-menu .context-item', { hasText: 'Borrar' }).click(); await sleep(400); } },
  menu: { session: base, run: async ({ page }) => { await uploadAsset(page); await page.getByText('cabecera.pug', { exact: true }).first().click({ button: 'right' }); await sleep(300); } },
  palette: { session: base, run: async ({ page }) => { await uploadAsset(page); await paletteOpen(page); } },
  projects: { session: base, run: async ({ page }) => { await uploadAsset(page); await chooseMenu(page, 'proyecto', 'projects'); await page.locator('[aria-label="Mis proyectos"]').waitFor(); await sleep(400); } },
  shortcuts: { session: base, run: async ({ page }) => { await uploadAsset(page); await paletteOpen(page); await page.keyboard.type('atajos'); await sleep(300); await page.keyboard.press('Enter'); await sleep(500); } },
  consent: { session: base, consent: null, run: async ({ page }) => { await uploadAsset(page); await sleep(600); } },
  landing: { path: '/', session: null, run: async () => {} },
};

// Piezas: [grupo, nombre, contexto, selector, opciones { nth, hover }]
const SPECIMENS = [
  ['Botones', 'Menú de la barra (Proyecto)', 'ide', '.topbar-actions .menu-trigger', { nth: 0 }],
  ['Botones', 'Menú de la barra · puntero encima', 'ide', '.topbar-actions .menu-trigger', { nth: 0, hover: true }],
  ['Botones', 'Campo de la paleta (Ctrl K)', 'ide', '.topbar-actions .search-field'],
  ['Botones', 'Autocompilar (barra de estado)', 'ide', '[data-testid="autocompile-toggle"]'],
  ['Botones', 'Botón principal (Guardar)', 'ide', '.save-btn'],
  ['Botones', 'Botón de icono', 'ide', '.topbar-actions .icon-btn'],
  ['Botones', 'Botón de icono · puntero encima', 'ide', '.topbar-actions .icon-btn', { hover: true }],
  ['Botones', 'Botón de panel (Workspace)', 'ide', '.workspace-actions .add-btn', { nth: 2 }],
  ['Botones', 'Botón del preview con texto (Inspector)', 'ide', '.inspector-btn'],
  ['Botones', 'Botón del preview con texto · activo', 'ide', '.inspector-btn', { setup: async (page) => { await page.locator('.inspector-btn').click(); await sleep(300); }, sel: '.inspector-btn.active' }],
  ['Botones', 'Botón de menú «Vista»', 'ide', '[data-testid="preview-view-menu"]'],
  ['Botones', 'Botón del diálogo · principal', 'newfile', '.dialog-btn.primary'],
  ['Botones', 'Botón del diálogo · secundario', 'newfile', '.dialog-btn.secondary'],
  ['Campos y selectores', 'Campo de texto de diálogo', 'newfile', '.dialog-input'],
  ['Campos y selectores', 'Selector de juego de datos', 'ide', '.dataset-bar select', { nth: 0 }],
  ['Campos y selectores', 'Selector de zoom', 'ide', '.zoom-select[aria-label="Zoom"]'],
  ['Pestañas y navegación', 'Barra de pestañas', 'ide', '.tabs-bar'],
  ['Pestañas y navegación', 'Pestaña con cambios sin guardar', 'dirty', '.tab.active'],
  ['Pestañas y navegación', 'Selector de dispositivo del preview', 'ide', '.device-switcher', { nth: 0 }],
  ['Pestañas y navegación', 'Pestañas de la terminal', 'ide', '.terminal-tabs'],
  ['Árbol de archivos', 'Carpeta', 'ide', '.file-row.directory-row', { nth: 0 }],
  ['Árbol de archivos', 'Archivo', 'ide', '.file-row.file-item:not(.active)', { nth: 1 }],
  ['Árbol de archivos', 'Archivo abierto', 'ide', '.file-row.file-item.active'],
  ['Árbol de archivos', 'Archivo · puntero encima', 'ide', '.file-row.file-item:not(.active)', { nth: 1, hover: true }],
  ['Árbol de archivos', 'Árbol del proyecto', 'ide', '.file-tree'],
  ['Árbol de archivos', 'Aviso de archivos que faltan', 'missing', '.missing-assets'],
  ['Avisos y estado', 'Error de compilación con explicación y arreglo', 'errors', '.compile-error'],
  ['Avisos y estado', 'Lista de todos los problemas', 'errors', 'app-problems-list'],
  ['Avisos y estado', 'Aviso del botón Compartir', 'share', '.share-notice'],
  ['Avisos y estado', 'Barra del modo PDF', 'pdf', '.pdf-bar'],
  ['Avisos y estado', 'Estado: errores, avisos y compilación', 'ide', '.status-left'],
  ['Avisos y estado', 'Estado: guardado', 'ide', '.status-right'],
  ['Avisos y estado', 'Terminal · información', 'ide', '.log-entry.log-info'],
  ['Avisos y estado', 'Terminal · aviso', 'ide', '.log-entry.log-warning'],
  ['Avisos y estado', 'Terminal · éxito', 'ide', '.log-entry.log-success'],
  ['Avisos y estado', 'Terminal · error con enlace', 'errors', '.log-entry.log-error', { nth: 0 }],
  ['Insignias y etiquetas', 'Contador de terminal', 'ide', '.terminal-tab .count', { nth: 0 }],
  ['Insignias y etiquetas', 'Contador de terminal · aviso', 'ide', '.terminal-tab .count.warning'],
  ['Insignias y etiquetas', 'Contador de terminal · error', 'errors', '.terminal-tab .count.error'],
  ['Insignias y etiquetas', 'Indicador de cambios sin guardar', 'dirty', '.dirty-dot'],
  ['Insignias y etiquetas', 'Etiqueta de versión (inicio)', 'landing', '.version-badge'],
  ['Diálogos y capas', 'Diálogo con campo (Nuevo archivo)', 'newfile', '.dialog'],
  ['Diálogos y capas', 'Diálogo de aviso (Borrar archivo)', 'delete', '.dialog'],
  ['Diálogos y capas', 'Menú contextual', 'menu', '.context-menu'],
  ['Diálogos y capas', 'Atajos de teclado', 'shortcuts', '.dialog'],
  ['Diálogos y capas', 'Mis proyectos', 'projects', '.dialog'],
  ['Diálogos y capas', 'Paleta de comandos', 'palette', '.palette'],
  ['Diálogos y capas', 'Aviso de privacidad', 'consent', '.consent'],
];

const env = await start();
const results = {};
for (const theme of only ? [only] : ['dark', 'light']) {
  const prefs = { ...PREFS, theme };
  const groups = new Map();
  let refSeed = null;
  for (const [ctxName, c] of Object.entries(contexts)) {
    const specs = SPECIMENS.filter((s) => s[2] === ctxName);
    if (!specs.length) continue;
    const { context, page } = await openApp(env, { path: c.path ?? '/ide', session: c.session, prefs, consent: c.consent });
    try {
      await settle(page);
      await c.run({ page });
      await page.mouse.move(1439, 899);
      await settle(page, { ms: 300 });
      await freeze(page);
      for (const [group, name, , selector, o = {}] of specs) {
        if (o.setup) await o.setup(page);
        const sel = o.sel ?? selector;
        if (o.hover) { await page.locator(sel).nth(o.nth ?? 0).hover(); await sleep(250); }
        const r = await page.evaluate(extractInPage, { fragment: { selector: sel, nth: o.sel ? 0 : o.nth ?? 0 }, refSeed, rootSelector: 'body', width: 1440, height: 900 });
        if (!refSeed && r.refs) refSeed = r.refs;
        if (o.hover) await page.mouse.move(1439, 899);
        if (r.missing || !r.html) { console.log(`  [${theme}] FALTA: ${name} (${sel}) en ${ctxName}`); continue; }
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push({ name, selector: sel, ...r });
      }
    } catch (e) {
      console.log(`  [${theme}] contexto ${ctxName} FALLÓ: ${e.message.split('\n')[0]}`);
    }
    await context.close();
  }
  results[theme] = groups;
}
await env.close();

// ---------- Marcado de la mesa ----------
const TOK = {
  dark: { bg: '#16111b', surf: '#231e27', text: '#eadfed', text2: '#cfc2d6', text3: '#988d9f', line: '#4d4354', accent: '#ddb7ff' },
  light: { bg: '#f9f9f9', surf: '#eeeeee', text: '#1a1c1c', text2: '#4d4354', text3: '#625869', line: '#cfc2d6', accent: '#8127cf' },
};
const h = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{\{/g, '&#123;&#123;');
mkdirSync(out, { recursive: true });
for (const [theme, groups] of Object.entries(results)) {
  const T = TOK[theme];
  const mono = "font-family:'JetBrains Mono', monospace";
  const sections = [...groups].map(([group, items]) => `<section style="display:flex;flex-direction:column;gap:20px">
<h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.3">${h(group)}</h2>
<div style="display:flex;flex-wrap:wrap;gap:28px 32px;align-items:flex-start">${items.map((it) => `<figure style="margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:1312px${it.w > 900 ? ';width:100%' : ''}">
<figcaption style="display:flex;flex-direction:column;gap:2px"><span style="font-size:13px;font-weight:500;color:${T.text}">${h(it.name)}</span><span style="${mono};font-size:11px;color:${T.text3}">${h(it.selector)}</span></figcaption>
<div style="display:flex;padding:16px;border:1px dashed ${T.line};border-radius:8px;background-color:${it.bg === 'transparent' ? T.bg : it.bg}${it.w > 900 ? ';align-self:stretch' : ''}">${it.w > 900 ? it.html.replace(/width:[\d.]+px/, 'width:100%') : it.html}</div></figure>`).join('')}</div></section>`).join('\n');
  const html = `<div style="width:1440px;box-sizing:border-box;padding:56px 64px;background-color:${T.bg};color:${T.text};font-family:'Geist', system-ui, sans-serif;font-size:14px;line-height:1.5;display:flex;flex-direction:column;gap:48px">
<div style="display:flex;flex-direction:column;gap:8px"><p style="margin:0;${mono};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${T.text2}">PugIDE · Sistema visual</p><h1 style="margin:0;font-size:44px;font-weight:600;line-height:1.1">Componentes${theme === 'light' ? ' · tema claro' : ''}</h1>
<p style="margin:0;font-size:16px;line-height:1.5;color:${T.text2};max-width:900px">Piezas reales de la app, fotografiadas de su DOM con <span style="${mono};font-size:14px">node design/tools/components.mjs</span> en cada estado (normal, puntero encima, activo, con cambios, con error). Debajo de cada una, el selector del componente en <span style="${mono};font-size:14px">src/app</span>. Una pantalla nueva se compone con estas piezas y los tokens, no con estilos propios.</p>
<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap"><a href="Main.dc.html" style="display:inline-block;padding:8px 16px;border-radius:4px;background-color:${T.accent};color:${theme === 'dark' ? '#490080' : '#ffffff'};font-weight:600;font-size:14px;text-decoration:none">Ver tokens</a><a href="${theme === 'dark' ? 'Componentes-claro.dc.html' : 'Componentes.dc.html'}" style="display:inline-block;padding:8px 16px;border-radius:4px;border:1px solid ${T.line};color:${T.text};font-size:14px;text-decoration:none">${theme === 'dark' ? 'Ver en tema claro' : 'Ver en tema oscuro'}</a></div></div>
${sections}
</div>`;
  const file = theme === 'dark' ? 'Componentes.dc.html' : 'Componentes-claro.dc.html';
  writeFileSync(join(out, file), boardHtml({ title: theme === 'dark' ? 'Componentes de PugIDE' : 'Componentes de PugIDE en tema claro', html, width: 1440, height: 6000 }));
  console.log(`${file}: ${[...groups.values()].reduce((n, g) => n + g.length, 0)} piezas`);
}
