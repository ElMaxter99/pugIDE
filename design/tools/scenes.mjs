// Escenas: cada una deja la app real en un estado y `build.mjs` la fotografía como mesa del lienzo.
//
//   id         identificador estable de la mesa (V-NN)
//   file       nombre del .dc.html
//   title      título de la mesa en el lienzo
//   theme      'dark' | 'light'
//   path       ruta de la app
//   session    sesión guardada (por defecto, el «Informe trimestral» de fixtures.mjs)
//   prefs      preferencias guardadas
//   run        acciones sobre la página antes de fotografiar
//   hrefs      enlaces de prototipo entre mesas [{ sel, href }]
//   height     alto de la mesa (por defecto 900)
import { FILES, FILES_ERROR, SESSION, PREFS, MAIN_PUG_PDF, uploadAsset, sleep, waitUntil, previewFrame } from './lib.mjs';

const TABS3 = ['/main.pug', '/mixins.pug', '/styles/informe.scss'];
const session = (over = {}) => ({ ...SESSION, ...over });
const light = { ...PREFS, theme: 'light' };

const IDE = 'V-01-IDE.dc.html';
const closeToIde = [{ sel: '[role="dialog"] button[aria-label="Cerrar"], [role="dialog"] .dialog-btn.secondary', href: IDE }];

const withLogo = async ({ page }) => { await uploadAsset(page); };
const palette = async (page, text) => {
  await page.keyboard.press('Control+k');
  await page.locator('[aria-label="Paleta de comandos"]').waitFor();
  if (text) { await page.keyboard.type(text, { delay: 20 }); await sleep(400); }
};
const paletteRun = async (page, text) => { await palette(page, text); await page.keyboard.press('Enter'); await sleep(700); };

/** El IDE con el proyecto de ejemplo, logotipo subido y tres pestañas. */
const ide = { path: '/ide', session: session({ openTabPaths: TABS3 }), run: withLogo };

// Errores: un mixin que no existe y un JSON de traducciones roto (dos problemas)
const errSession = session({
  files: { ...FILES_ERROR, '/locales/es/translations.json': '{\n  "INFORME": {\n    "RESUMEN": "Resumen ejecutivo",\n' },
  openTabPaths: ['/main.pug', '/mixins.pug'],
});

const pdfSession = session({ files: { ...FILES, '/main.pug': MAIN_PUG_PDF }, openTabPaths: ['/main.pug', '/mixins.pug', '/styles/informe.scss'] });

const errors = async ({ page }) => {
  await page.locator('.compile-error').waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: /Todos los problemas/ }).click();
  await sleep(500);
};
const pdf = async ({ page }) => {
  await uploadAsset(page);
  await page.locator('button[title="PDF / página impresa"]').click();
  await sleep(2500);
};
const projects = async ({ page }) => {
  await page.locator('button[title^="Abrir, crear"]').click();
  await page.locator('[aria-label="Mis proyectos"]').waitFor();
  await sleep(500);
};

export const scenes = [
  {
    id: 'V-01', file: IDE, title: 'V-01 IDE: editor, datos y preview', theme: 'dark', ...ide,
    hrefs: [
      { sel: 'h1.logo a', href: 'V-04-Inicio.dc.html' },
      { sel: 'button[title^="Paleta de comandos"]', href: 'V-12-Paleta.dc.html' },
      { sel: 'button[title^="Abrir, crear"]', href: 'V-11-Proyectos.dc.html' },
      { sel: 'button[title^="Copiar un enlace"]', href: 'V-23-Compartir.dc.html' },
    ],
  },
  {
    id: 'V-02', file: 'V-02-Errores.dc.html', title: 'V-02 Errores: explicación, arreglo y lista de problemas', theme: 'dark',
    path: '/ide', session: errSession, run: errors,
  },
  {
    id: 'V-04', file: 'V-04-Inicio.dc.html', title: 'V-04 Inicio: presentación', theme: 'dark', path: '/', session: null, prefs: PREFS, kind: 'landing',
    hrefs: [{ sel: 'a[href="/ide"], button.btn-primary, .hero-actions > *:first-child', href: IDE }, { sel: '.hero-actions > *:nth-child(2)', href: IDE }],
  },
  { id: 'V-05', file: 'V-05-IDE-claro.dc.html', title: 'V-05 IDE: tema claro', theme: 'light', ...ide, prefs: light },
  { id: 'V-06', file: 'V-06-PDF.dc.html', title: 'V-06 Preview PDF: hojas y avisos de corte', theme: 'dark', path: '/ide', session: pdfSession, run: pdf },
  {
    id: 'V-07', file: 'V-07-Inspector.dc.html', title: 'V-07 Inspector: elemento del preview', theme: 'dark', ...ide,
    run: async ({ page }) => {
      await uploadAsset(page);
      await page.locator('button[title="Inspeccionar elemento"]').click();
      await sleep(800);
      const f = await previewFrame(page);
      if (f) await f.locator('.tarjeta h3').first().click({ force: true }).catch(() => {});
      await sleep(900);
    },
  },
  {
    id: 'V-08', file: 'V-08-Terminal.dc.html', title: 'V-08 Terminal: maximizada con filtro de avisos', theme: 'dark', path: '/ide', session: session({ openTabPaths: TABS3 }),
    run: async ({ page }) => {
      await page.locator('button[title="Maximizar el Registro"]').click();
      await page.getByRole('button', { name: /^Warnings/ }).click();
      await sleep(500);
    },
  },
  {
    id: 'V-09', file: 'V-09-Datos.dc.html', title: 'V-09 Editor de datos: árbol de un juego de datos', theme: 'dark', ...ide,
    run: async ({ page }) => {
      await uploadAsset(page);
      for (const k of ['kpis', 'ventas']) await page.locator('app-data-tree').getByText(k, { exact: true }).first().click().catch(() => {});
      await sleep(600);
    },
  },
  {
    id: 'V-10', file: 'V-10-Archivos-que-faltan.dc.html', title: 'V-10 Archivos que faltan: aviso en el árbol y en la terminal', theme: 'dark', path: '/ide', session: session({ openTabPaths: TABS3 }),
    run: async ({ page }) => { await page.getByRole('button', { name: /^Warnings/ }).click(); await sleep(400); },
  },
  { id: 'V-11', file: 'V-11-Proyectos.dc.html', title: 'V-11 Mis proyectos', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await projects(c); }, hrefs: closeToIde },
  { id: 'V-12', file: 'V-12-Paleta.dc.html', title: 'V-12 Paleta de comandos', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await palette(c.page); }, hrefs: [] },
  { id: 'V-13', file: 'V-13-Atajos.dc.html', title: 'V-13 Atajos de teclado', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await paletteRun(c.page, 'atajos'); }, hrefs: closeToIde },
  {
    id: 'V-14', file: 'V-14-Historial.dc.html', title: 'V-14 Historial del archivo', theme: 'dark', ...ide,
    run: async (c) => {
      await withLogo(c);
      const { page } = c;
      await page.locator('.monaco-editor').first().click({ position: { x: 200, y: 80 } });
      for (const line of ['// Revisado por Marta, 3 de noviembre', '// Pendiente: añadir gráfico de bajas']) {
        await page.keyboard.press('Control+End');
        await page.keyboard.type('\n' + line, { delay: 5 });
        await page.keyboard.press('Control+s');
        await sleep(700);
      }
      await paletteRun(page, 'historial');
      await sleep(600);
    },
    hrefs: closeToIde,
  },
  { id: 'V-16', file: 'V-16-Buscar.dc.html', title: 'V-16 Buscar en el proyecto', theme: 'dark', ...ide,
    run: async (c) => {
      await withLogo(c);
      const { page } = c;
      await page.locator('.monaco-editor').first().click({ position: { x: 200, y: 80 } });
      await page.keyboard.press('Control+Shift+F');
      await sleep(400);
      await page.keyboard.type('tarjeta', { delay: 20 });
      await sleep(2000);
      // Monaco recoloca el editor al cambiar el alto del panel de búsqueda
      await page.setViewportSize({ width: 1440, height: 901 });
      await page.setViewportSize({ width: 1440, height: 900 });
      await sleep(1000);
    } },
  { id: 'V-17', file: 'V-17-Anadir-idioma.dc.html', title: 'V-17 Añadir idioma', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await paletteRun(c.page, 'añadir idioma'); await c.page.keyboard.type('es-CAT'); }, hrefs: closeToIde },
  { id: 'V-18', file: 'V-18-Nuevo-archivo.dc.html', title: 'V-18 Nuevo archivo', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await c.page.locator('button[title="Nuevo archivo"]').click(); await sleep(500); }, hrefs: closeToIde },
  {
    id: 'V-19', file: 'V-19-Borrar-archivo.dc.html', title: 'V-19 Borrar archivo', theme: 'dark', ...ide,
    run: async (c) => {
      await withLogo(c);
      await c.page.getByText('cabecera.pug', { exact: true }).first().click({ button: 'right' });
      await c.page.locator('.context-menu .context-item', { hasText: 'Borrar' }).click();
      await sleep(500);
    },
    hrefs: closeToIde,
  },
  { id: 'V-20', file: 'V-20-Importar.dc.html', title: 'V-20 Importar proyecto', theme: 'dark', ...ide, run: async (c) => { await withLogo(c); await c.page.locator('button[title^="Importar proyecto"]').click(); await sleep(500); }, hrefs: closeToIde },
  {
    id: 'V-21', file: 'V-21-Menu-contextual.dc.html', title: 'V-21 Menú contextual del árbol de archivos', theme: 'dark', ...ide,
    run: async (c) => { await withLogo(c); await c.page.getByText('cabecera.pug', { exact: true }).first().click({ button: 'right' }); await sleep(400); },
  },
  { id: 'V-22', file: 'V-22-Privacidad.dc.html', title: 'V-22 Aviso de privacidad (analítica opcional)', theme: 'dark', ...ide, consent: null, run: async (c) => { await withLogo(c); await sleep(800); } },
  {
    id: 'V-23', file: 'V-23-Compartir.dc.html', title: 'V-23 Compartir: aviso de enlace copiado', theme: 'dark', ...ide,
    run: async (c) => { await withLogo(c); await c.page.locator('button[title^="Copiar un enlace"]').click(); await sleep(900); },
  },
  { id: 'V-24', file: 'V-24-Inicio-claro.dc.html', title: 'V-24 Inicio: tema claro', theme: 'light', path: '/', session: null, prefs: light, kind: 'landing' },
  { id: 'V-25', file: 'V-25-Errores-claro.dc.html', title: 'V-25 Errores: tema claro', theme: 'light', path: '/ide', session: errSession, prefs: light, run: errors },
  { id: 'V-26', file: 'V-26-PDF-claro.dc.html', title: 'V-26 Preview PDF: tema claro', theme: 'light', path: '/ide', session: pdfSession, prefs: light, run: pdf },
  { id: 'V-27', file: 'V-27-Proyectos-claro.dc.html', title: 'V-27 Mis proyectos: tema claro', theme: 'light', ...ide, prefs: light, run: async (c) => { await withLogo(c); await projects(c); }, hrefs: closeToIde },
];

// V-15 (proyecto compartido) necesita recargar la página con el enlace en la barra de direcciones
scenes.splice(scenes.findIndex((s) => s.id === 'V-16'), 0, {
  id: 'V-15', file: 'V-15-Proyecto-compartido.dc.html', title: 'V-15 Abrir proyecto compartido', theme: 'dark', ...ide,
  run: async (c) => {
    await withLogo(c);
    const { page } = c;
    await page.context().grantPermissions([], { origin: new URL(page.url()).origin });
    await page.locator('button[title^="Copiar un enlace"]').click();
    await sleep(800);
    await page.evaluate(() => { try { localStorage.setItem('__noop', '1'); } catch { /* */ } });
    await page.reload();
    await page.locator('[aria-label="Abrir proyecto compartido"]').waitFor({ timeout: 15000 });
    await sleep(800);
  },
  hrefs: closeToIde,
});
