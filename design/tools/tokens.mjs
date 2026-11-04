// Genera la mesa «Tokens de diseño» (Main.dc.html) a partir de src/styles.scss y del código de los componentes.
//
//   node design/tools/tokens.mjs [--out design/canvas]
//
// Todo sale del código: variables CSS de los dos temas, usos reales de cada variable, tamaños de texto y espaciados
// que aparecen en los componentes, e iconos de Material Symbols en uso. Si cambia styles.scss se vuelve a generar.
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardHtml } from './capture.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const out = resolve(arg('--out') ?? join(here, '../canvas'));

// ---------- Lectura de styles.scss ----------
const scss = readFileSync(join(root, 'src/styles.scss'), 'utf8');
const block = (sel) => {
  const i = scss.indexOf(sel + ' {');
  const j = scss.indexOf('\n}', i);
  return scss.slice(i, j);
};
const vars = (b) => Object.fromEntries([...b.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]));
const dark = vars(block(':root'));
const light = { ...dark, ...vars(block('.light-mode')) };

// ---------- Usos reales de cada variable ----------
function* walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|scss|html)$/.test(n) && !n.endsWith('.d.ts') && !/\.(spec|test)\./.test(n)) yield p;
  }
}
const files = [...walk(join(root, 'src/app')), join(root, 'src/styles.scss'), join(root, 'src/index.html')].map((p) => ({ p, t: readFileSync(p, 'utf8') }));
const usesBy = (name) => {
  const re = new RegExp(`var\\(\\s*${name}[,)\\s]`, 'g');
  const per = [];
  for (const f of files) {
    const n = (f.t.match(re) ?? []).length;
    if (n) per.push([f.p.split('/').pop().replace(/\.(component\.)?(ts|scss|html)$/, '').replace(/\.component$/, ''), n]);
  }
  return per.sort((a, b) => b[1] - a[1]);
};
const uses = (name) => usesBy(name).reduce((n, [, k]) => n + k, 0);
const where = (name) => { const u = usesBy(name); return u.length ? u.slice(0, 4).map(([f, n]) => `${f}${n > 1 ? ' ×' + n : ''}`).join(', ') + (u.length > 4 ? ` y ${u.length - 4} más` : '') : 'Sin uso directo con var() en el código'; };

// ---------- Tamaños de texto y espaciados ----------
const sizeCount = new Map();
const spaceCount = new Map();
for (const f of files) {
  for (const m of f.t.matchAll(/font-size:\s*([\d.]+)px/g)) sizeCount.set(+m[1], (sizeCount.get(+m[1]) ?? 0) + 1);
  for (const m of f.t.matchAll(/(?:padding|margin|gap)(?:-[a-z]+)?:\s*([^;{}]+);/g)) {
    for (const v of m[1].matchAll(/(?<![\d.])(\d+(?:\.\d+)?)px/g)) if (+v[1] > 0) spaceCount.set(+v[1], (spaceCount.get(+v[1]) ?? 0) + 1);
  }
}
const sizes = [...sizeCount].sort((a, b) => a[0] - b[0]);
const spaces = [...spaceCount].filter(([, n]) => n >= 4).sort((a, b) => a[0] - b[0]);

// ---------- Iconos ----------
const icons = JSON.parse(readFileSync(join(root, 'src/fonts/material-symbols-icons.json'), 'utf8'));

// ---------- Contraste ----------
const hexToRgb = (h) => { const m = /^#([0-9a-f]{6})$/i.exec(h); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const A = hexToRgb(a), B = hexToRgb(b); if (!A || !B) return null; const [x, y] = [lum(A), lum(B)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- Descripción de cada variable ----------
const GROUPS = [
  ['Superficies', 'Fondos de la interfaz.', [
    ['--bg-primary', 'Fondo general de la app y del editor de datos'],
    ['--bg-surface', 'Barra superior, panel del preview, estado'],
    ['--bg-surface-dim', 'Superficie atenuada (igual que el fondo en oscuro)'],
    ['--bg-secondary', 'Paleta de comandos, menús, avisos'],
    ['--bg-tertiary', 'Superficie intermedia (sin uso directo todavía)'],
    ['--bg-surface-container', 'Cabeceras de panel y de terminal'],
    ['--bg-surface-container-low', 'Barra lateral y barra de pestañas'],
    ['--bg-surface-container-high', 'Campos y botones secundarios'],
    ['--bg-surface-container-highest', 'Botón pulsado, pestaña activa, kbd'],
    ['--bg-surface-container-lowest', 'Fondo más profundo'],
    ['--bg-surface-variant', 'Variante de superficie (tarjetas)'],
    ['--bg-input', 'Campos de texto y selectores'],
    ['--bg-hover', 'Fila o botón con el puntero encima (translúcido)'],
    ['--bg-active', 'Fila seleccionada (translúcido, tinte del acento)'],
    ['--bg-badge', 'Insignias y contadores (translúcido)'],
    ['--bg-close', 'Botón de cerrar (translúcido)'],
  ]],
  ['Texto', 'Colores de texto (la tabla de contraste mide cada pareja).', [
    ['--text-primary', 'Texto principal'],
    ['--text-secondary', 'Texto secundario y etiquetas'],
    ['--text-tertiary', 'Texto de apoyo, marcadores, líneas de terminal'],
    ['--text-on-primary', 'Texto sobre el acento (botón Guardar)'],
    ['--text-on-primary-container', 'Texto sobre el contenedor del acento'],
    ['--text-on-secondary', 'Texto sobre el color secundario'],
  ]],
  ['Bordes', 'Líneas de 1 px entre paneles y alrededor de campos.', [
    ['--border-color', 'Borde estándar'],
    ['--border-subtle', 'Borde suave (translúcido)'],
  ]],
  ['Acento y colores de énfasis', 'Acento de la marca y colores secundario y terciario.', [
    ['--accent-color', 'Acento: botón principal, selección, enlaces'],
    ['--accent-container', 'Contenedor del acento'],
    ['--accent-hover', 'Acento con el puntero encima'],
    ['--secondary-color', 'Secundario: «Live preview», indicadores'],
    ['--secondary-container', 'Contenedor del secundario'],
    ['--tertiary-color', 'Terciario: avisos suaves'],
    ['--tertiary-container', 'Contenedor del terciario'],
  ]],
  ['Estado', 'Error, aviso, éxito e información.', [
    ['--error-color', 'Errores: avisos, terminal, subrayado'],
    ['--error-container', 'Contenedor de error'],
    ['--warning-color', 'Avisos'],
    ['--success-color', 'Éxito'],
    ['--info-color', 'Información'],
  ]],
  ['Sintaxis del editor de datos', 'Colores del JSON del editor de datos; cambian con el tema para mantener el contraste.', [
    ['--syn-key', 'Claves'],
    ['--syn-string', 'Cadenas'],
    ['--syn-number', 'Números'],
    ['--syn-keyword', 'true, false, null'],
  ]],
  ['Lenguajes', 'Variables por lenguaje; casi ninguna se usa todavía con var() en el código (ver la columna de usos).', [
    ['--pug-color', 'Pug'],
    ['--scss-color', 'SCSS / Sass'],
    ['--json-color', 'JSON'],
    ['--js-color', 'JavaScript'],
    ['--html-color', 'HTML'],
    ['--css-color', 'CSS'],
    ['--tag-color', 'Etiquetas'],
  ]],
];

// ---------- Marcado ----------
const D = { bg: '#16111b', surf: '#231e27', hi: '#2e2832', input: '#110c15', text: '#eadfed', text2: '#cfc2d6', text3: '#988d9f', line: '#4d4354', accent: '#ddb7ff' };
const h = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{\{/g, '&#123;&#123;');
const mono = "font-family:'JetBrains Mono', monospace";
const chip = (v) => {
  const solid = /^#/.test(v);
  const [r, g, b] = solid ? hexToRgb(v) ?? [0, 0, 0] : [0, 0, 0];
  const dim = solid ? lum([r, g, b]) > 0.5 : false;
  return `<div style="display:flex;align-items:center;gap:10px"><div style="width:56px;height:32px;border-radius:4px;background-color:${v};border:1px solid rgba(128,128,128,0.45);flex-shrink:0" role="img" aria-label="Muestra ${h(v)}${dim ? ' (clara)' : ''}"></div><span style="${mono};font-size:12px;color:${D.text2}">${h(v)}</span></div>`;
};
const section = (title, sub, body) => `<section style="display:flex;flex-direction:column;gap:16px"><div style="display:flex;flex-direction:column;gap:4px"><h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.3">${h(title)}</h2>${sub ? `<p style="margin:0;font-size:14px;color:${D.text2};line-height:1.5;max-width:820px">${h(sub)}</p>` : ''}</div>${body}</section>`;
const th = (t, w) => `<div style="${mono};font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${D.text3};${w ? `width:${w}px;` : ''}">${t}</div>`;

const colorTables = GROUPS.map(([title, sub, rows]) => {
  const body = rows.map(([name]) => {
    const n = uses(name);
    return `<div style="display:flex;align-items:center;gap:24px;padding:10px 16px;border-top:1px solid ${D.line}">
<div style="width:300px;display:flex;flex-direction:column;gap:2px"><span style="${mono};font-size:12px;color:${D.text}">${name}</span><span style="font-size:12px;color:${D.text3}">${n ? `${n} uso${n === 1 ? '' : 's'} en la app` : 'sin uso directo con var()'}</span></div>
<div style="flex:1;${mono};font-size:12px;color:${D.text2};min-width:0">${h(where(name))}</div>
<div style="width:200px">${chip(dark[name])}</div>
<div style="width:200px">${chip(light[name])}</div></div>`;
  }).join('');
  return section(title, sub, `<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};overflow:hidden"><div style="display:flex;gap:24px;padding:10px 16px"><div style="width:300px">${th('Variable')}</div><div style="flex:1">${th('Dónde se usa (archivo · veces)')}</div>${th('Oscuro (por defecto)', 200)}${th('Claro (.light-mode)', 200)}</div>${body}</div>`);
}).join('\n');

// Contraste de los textos sobre las superficies principales
const PAIRS = [
  ['--text-primary', '--bg-primary'], ['--text-primary', '--bg-secondary'], ['--text-secondary', '--bg-primary'], ['--text-secondary', '--bg-secondary'],
  ['--text-tertiary', '--bg-primary'], ['--text-tertiary', '--bg-secondary'], ['--accent-color', '--bg-primary'], ['--text-on-primary', '--accent-color'],
  ['--secondary-color', '--bg-primary'], ['--error-color', '--bg-primary'], ['--warning-color', '--bg-primary'], ['--success-color', '--bg-primary'],
];
const cell = (theme, fg, bg) => {
  const r = ratio(theme[fg], theme[bg]);
  const ok = r >= 4.5;
  return `<div style="width:170px;display:flex;align-items:center;gap:8px"><span style="${mono};font-size:12px;color:${D.text}">${r ? r.toFixed(2) + ' : 1' : '—'}</span><span style="${mono};font-size:11px;padding:1px 6px;border-radius:3px;border:1px solid ${ok ? '#a6e3a1' : '#ffb4ab'};color:${ok ? '#a6e3a1' : '#ffb4ab'}">${ok ? 'AA' : 'bajo'}</span></div>`;
};
const contrast = section('Contraste', 'Razón de contraste WCAG de cada pareja de texto y fondo, calculada con los valores de arriba. AA exige 4,5 : 1 para texto normal.',
  `<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};overflow:hidden"><div style="display:flex;gap:24px;padding:10px 16px"><div style="width:420px">${th('Texto sobre fondo')}</div>${th('Oscuro', 170)}${th('Claro', 170)}</div>${PAIRS.map(([f, b]) => `<div style="display:flex;align-items:center;gap:24px;padding:10px 16px;border-top:1px solid ${D.line}"><div style="width:420px;${mono};font-size:12px;color:${D.text2}">${f} sobre ${b}</div>${cell(dark, f, b)}${cell(light, f, b)}</div>`).join('')}</div>`);

// Tipografía
const typeFamilies = section('Tipografía', 'Dos familias autoalojadas (variables): Geist para la interfaz y JetBrains Mono para código, etiquetas de panel, terminal y datos.',
  `<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:16px">
<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};padding:20px;display:flex;flex-direction:column;gap:8px"><span style="${mono};font-size:12px;color:${D.text3}">--font-family</span><span style="font-size:40px;font-weight:600;line-height:1.1">Geist</span><span style="font-size:14px;color:${D.text2}">Aa Bb Cc 0123456789 áéíóúñ ¿?¡! · pesos 400, 500 y 600</span></div>
<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};padding:20px;display:flex;flex-direction:column;gap:8px"><span style="${mono};font-size:12px;color:${D.text3}">--font-mono</span><span style="${mono};font-size:40px;font-weight:500;line-height:1.1">JetBrains Mono</span><span style="${mono};font-size:13px;color:${D.text2}">Aa Bb Cc 0123456789 =&gt; {} [] () ;</span></div></div>`);
const sizeRows = sizes.map(([px, n]) => `<div style="display:flex;align-items:baseline;gap:24px;padding:8px 16px;border-top:1px solid ${D.line}"><span style="${mono};font-size:12px;color:${D.text};width:70px;flex-shrink:0">${px} px</span><span style="${mono};font-size:12px;color:${D.text3};width:90px;flex-shrink:0">${n} regla${n === 1 ? '' : 's'}</span><span style="font-size:${px}px;line-height:1.3;color:${D.text};width:360px;flex-shrink:0;overflow:hidden;white-space:nowrap">${px > 26 ? 'Informe' : 'Informe trimestral'}</span><span style="${mono};font-size:${px}px;line-height:1.3;color:${D.text2};flex:1;min-width:0;overflow:hidden;white-space:nowrap">${px > 26 ? 'main.pug' : 'main.pug · +tarjeta(kpi)'}</span></div>`).join('');
const typeScale = section('Escala de tamaños', 'Tamaños de texto (font-size en px) que aparecen en los componentes de src/app, con el número de reglas que los usan. Interfaz a 13–14 px; etiquetas de panel en mono a 11 px en mayúsculas con 0,05 em de espaciado; títulos de diálogo y de la página de inicio por encima.',
  `<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};overflow:hidden"><div style="display:flex;gap:24px;padding:10px 16px"><div style="width:70px">${th('Tamaño')}</div><div style="width:90px">${th('Uso')}</div><div style="width:360px">${th('Geist')}</div>${th('JetBrains Mono')}</div>${sizeRows}</div>`);

// Radios, espaciado, sombras, medidas
const radii = [['--radius', '0.25rem', '4 px', 'Botones, campos, pestañas'], ['--radius-lg', '0.5rem', '8 px', 'Tarjetas y avisos'], ['--radius-xl', '0.75rem', '12 px', 'Diálogos']];
const radiiHtml = section('Radios', null, `<div style="display:flex;gap:24px;flex-wrap:wrap">${radii.map(([n, rem, px, use]) => `<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start"><div style="width:120px;height:80px;background-color:${D.hi};border:1px solid ${D.line};border-radius:${px.replace(' ', '')}"></div><span style="${mono};font-size:12px;color:${D.text}">${n} · ${rem} · ${px}</span><span style="font-size:12px;color:${D.text3}">${use}</span></div>`).join('')}</div>`);
const spaceHtml = section('Espaciado', 'Valores de padding, margin y gap (px) que se repiten al menos cuatro veces en los componentes. Base de 4 px.',
  `<div style="display:flex;flex-direction:column;gap:6px">${spaces.map(([px, n]) => `<div style="display:flex;align-items:center;gap:16px"><span style="${mono};font-size:12px;color:${D.text};width:56px">${px} px</span><div style="height:12px;width:${px * 4}px;border-radius:2px;background-color:${D.accent}"></div><span style="${mono};font-size:12px;color:${D.text3}">${n}</span></div>`).join('')}</div>`);
const shadows = [['0 4px 12px rgba(221,183,255,0.3)', 'Botón Guardar'], ['0 8px 24px rgba(0,0,0,0.3)', 'Menú contextual'], ['0 16px 48px rgba(0,0,0,0.3)', 'Diálogos'], ['0 12px 40px rgba(0,0,0,0.4)', 'Aviso de privacidad'], ['-8px 0 24px rgba(0,0,0,0.2)', 'Panel del inspector'], ['0 25px 50px -12px rgba(0,0,0,0.5)', 'Hoja del preview y página de inicio']];
const shadowHtml = section('Sombras', 'Solo las usan las capas flotantes y el botón principal.', `<div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:24px">${shadows.map(([s, use]) => `<div style="display:flex;flex-direction:column;gap:12px"><div style="height:72px;border-radius:8px;background-color:${D.surf};border:1px solid ${D.line};box-shadow:${s}"></div><span style="${mono};font-size:11px;color:${D.text2}">${h(s)}</span><span style="font-size:12px;color:${D.text3}">${use}</span></div>`).join('')}</div>`);
const layout = [['Barra superior', '64 px de alto', 'src/app/shared/components/topbar'], ['Barra lateral (Workspace)', '240 px de ancho (40 px colapsada)', 'sidebar'], ['Barra de pestañas', '36 px de alto', 'tabs'], ['Cabecera del preview', 'mín. 36 px', 'preview-panel'], ['Terminal', '180 px de alto (70 vh maximizada)', 'terminal-panel'], ['Barra de estado', '32 px de alto', 'statusbar'], ['Diálogos', 'ancho 520 / 640 / 860 px según el diálogo', 'shortcuts, projects, history'], ['Paleta de comandos', '560 px de ancho', 'command-palette']];
const layoutHtml = section('Medidas del layout', 'La app es de escritorio y ocupa toda la ventana (100 vh): las mesas son de 1440 × 900 px.', `<div style="border:1px solid ${D.line};border-radius:8px;background-color:${D.surf};overflow:hidden">${layout.map(([n, v, c], i) => `<div style="display:flex;gap:24px;padding:10px 16px;${i ? `border-top:1px solid ${D.line}` : ''}"><span style="font-size:13px;width:260px">${n}</span><span style="${mono};font-size:12px;color:${D.text2};width:340px">${v}</span><span style="${mono};font-size:12px;color:${D.text3}">${c}</span></div>`).join('')}</div>`);
const iconsHtml = section('Iconos', `Material Symbols Outlined, autoalojados (subconjunto de ${icons.length} glifos; al añadir uno: npm run fonts:icons). Tamaños habituales: 14, 16, 18 y 24 px. Los decorativos llevan aria-hidden="true".`,
  `<div style="display:grid;grid-template-columns:repeat(8, minmax(0, 1fr));gap:8px">${icons.map((n) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1px solid ${D.line};border-radius:4px;background-color:${D.surf}"><span aria-hidden="true" style="font-family:'Material Symbols Outlined';font-size:24px;line-height:1;font-feature-settings:'liga';font-variation-settings:'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;color:${D.text}">${n}</span><span style="${mono};font-size:10px;color:${D.text3};text-align:center;word-break:break-all">${n}</span></div>`).join('')}</div>`);

const body = `<div style="width:1440px;box-sizing:border-box;padding:56px 64px;background-color:${D.bg};color:${D.text};font-family:'Geist', system-ui, sans-serif;font-size:14px;line-height:1.5;display:flex;flex-direction:column;gap:48px">
<div style="display:flex;flex-direction:column;gap:8px"><p style="margin:0;${mono};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${D.text2}">PugIDE · Sistema visual</p><h1 style="margin:0;font-size:44px;font-weight:600;line-height:1.1">Tokens de diseño</h1><p style="margin:0;font-size:16px;line-height:1.5;color:${D.text2};max-width:860px">Generados desde <span style="${mono};font-size:14px">src/styles.scss</span> y los componentes de <span style="${mono};font-size:14px">src/app</span> con <span style="${mono};font-size:14px">node design/tools/tokens.mjs</span>. Toda pantalla nueva usa estas variables, en tema oscuro (por defecto) y claro (clase <span style="${mono};font-size:14px">.light-mode</span>). Nunca un color fijo si existe la variable.</p>
<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap"><a href="Componentes.dc.html" style="display:inline-block;padding:8px 16px;border-radius:4px;background-color:${D.accent};color:#490080;font-weight:600;font-size:14px;text-decoration:none">Ver componentes</a><a href="V-01-IDE.dc.html" style="display:inline-block;padding:8px 16px;border-radius:4px;border:1px solid ${D.line};color:${D.text};font-size:14px;text-decoration:none">Ver V-01 IDE</a></div></div>
${colorTables}
${contrast}
${typeFamilies}
${typeScale}
<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:48px">${radiiHtml}${spaceHtml}</div>
${shadowHtml}
${layoutHtml}
${iconsHtml}
</div>`;

mkdirSync(out, { recursive: true });
const height = Number(process.env.PUGIDE_TOKENS_HEIGHT || 0) || 9000;
writeFileSync(join(out, 'Main.dc.html'), boardHtml({ title: 'Tokens de diseño de PugIDE', html: body, width: 1440, height }));
console.log(`Main.dc.html: ${dark ? Object.keys(dark).length : 0} variables, ${sizes.length} tamaños, ${spaces.length} espaciados, ${icons.length} iconos`);
