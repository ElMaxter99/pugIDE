// Auditoría de fidelidad (no forma parte de la batería: `npm run audit:fidelidad`). Mide qué hace PugIDE con casos reales de
// traducciones (A, B, C), datos de ejemplo (D) y Pug (E) frente a lo que haría el proyecto real. Imprime «OK» o «FALLA» por caso
// y un resumen; sirve para ver cuánto mejora cada versión (la 0.19 parte de 44/96).
import { run, html as rawHtml, errs } from './lib.mjs';
import { listLocales, looksLikeTranslations, localeCodeFromFileName } from './.build/services.mjs';
const html = (a) => rawHtml(a).replace(/ data-pugide-line="\d+"/g, '').replace(/<script>[\s\S]*<\/script>/g, '').replace(/<style data-pugide[\s\S]*?<\/style>/g, '');

const out = [];
const log = (sec, caso, ok, got, want = '') => out.push({ sec, caso, ok, got: String(got).replace(/\s+/g, ' ').slice(0, 150), want });
const body = (a) => { const m = /<p[^>]*>([\s\S]*?)<\/p>/.exec(html(a)); return m ? m[1] : html(a).slice(0, 120); };

async function tr(caso, translations, tpl, want, extraFiles = {}, locale = 'es') {
  try {
    const files = { '/main.pug': tpl, [`/locales/${locale}/translations.json`]: JSON.stringify(translations), ...extraFiles };
    const a = await run(files, '/main.pug');
    const got = errs(a) ? 'ERROR: ' + errs(a) : body(a);
    log('A·traductor', caso, got === want, got, want);
  } catch (e) { log('A·traductor', caso, false, 'EXCEPCIÓN ' + e.message, want); }
}

// ---------- A · el traductor (t) frente a lo que hacen i18next, vue-i18n, ngx-translate, i18n-js ----------
await tr('clave anidada', { HOME: { TITLE: 'Hola' } }, "p= t('HOME.TITLE')", 'Hola');
await tr('clave plana con puntos', { 'HOME.TITLE': 'Hola' }, "p= t('HOME.TITLE')", 'Hola');
await tr('{{nombre}} (i18next, ngx-translate)', { HI: 'Hola {{name}}' }, "p= t('HI', { name: 'Lucía' })", 'Hola Lucía');
await tr('{nombre} (vue-i18n)', { HI: 'Hola {name}' }, "p= t('HI', { name: 'Lucía' })", 'Hola Lucía');
await tr('%{nombre} (i18n-js, Rails)', { HI: 'Hola %{name}' }, "p= t('HI', { name: 'Lucía' })", 'Hola Lucía');
await tr('{{- nombre}} sin escapar (i18next)', { HI: 'Hola {{- name}}' }, "p!= t('HI', { name: '<b>Lucía</b>' })", 'Hola <b>Lucía</b>');
await tr('formato {{valor, number}} (i18next)', { N: 'Total {{v, number}}' }, "p= t('N', { v: 1234.5 })", 'Total 1,234.5');
await tr('plural i18next _one/_other con count', { items_one: '{{count}} elemento', items_other: '{{count}} elementos' }, "p= t('items', { count: 2 })", '2 elementos');
await tr('plural i18next, count = 1', { items_one: '{{count}} elemento', items_other: '{{count}} elementos' }, "p= t('items', { count: 1 })", '1 elemento');
await tr('plural i18next v3 (_plural)', { item: '{{count}} elemento', item_plural: '{{count}} elementos' }, "p= t('item', { count: 3 })", '3 elementos');
await tr('plural ICU {count, plural, …}', { N: '{count, plural, one {# elemento} other {# elementos}}' }, "p= t('N', { count: 2 })", '2 elementos');
await tr('plural vue-i18n (a | b)', { N: 'ningún elemento | un elemento | {count} elementos' }, "p= t('N', { count: 2 })", '2 elementos');
await tr('anidado $t(otra.clave) (i18next)', { A: 'Hola', B: '$t(A), mundo' }, "p= t('B')", 'Hola, mundo');
await tr('espacio de nombres ns:clave', { HOME: { TITLE: 'Hola' } }, "p= t('common:HOME.TITLE')", 'Hola');
await tr('valor por defecto como 2.º argumento', {}, "p= t('NO.EXISTE', 'Valor por defecto')", 'Valor por defecto');
await tr('defaultValue en las opciones', {}, "p= t('NO.EXISTE', { defaultValue: 'Valor por defecto' })", 'Valor por defecto');
await tr('clave que no existe → la clave', {}, "p= t('NO.EXISTE')", 'NO.EXISTE');
await tr('lista de claves de reserva t([a, b])', { B: 'Segunda' }, "p= t(['A', 'B'])", 'Segunda');
await tr('idioma forzado {lng:"fr"} (el activo es es)', { HI: 'Hola' }, "p= t('HI', { lng: 'fr' })", 'Salut', { '/locales/fr/translations.json': JSON.stringify({ HI: 'Salut' }) });
await tr('contexto (i18next) key_male', { F_male: 'Amigo', F: 'Amigo/a' }, "p= t('F', { context: 'male' })", 'Amigo');
await tr('returnObjects (lista)', { LIST: ['uno', 'dos'] }, "p= t('LIST', { returnObjects: true }).join(',')", 'uno,dos');
await tr('i18n.t(...) con el objeto i18n', { HI: 'Hola' }, "p= i18n.t('HI')", 'Hola');
await tr('__("clave") (i18n de Node/Express)', { HI: 'Hola' }, "p= __('HI')", 'Hola');
await tr('$t("clave")', { HI: 'Hola' }, "p= $t('HI')", 'Hola');
await tr('i18n.language / locale como variable', {}, "p= typeof locale + '|' + typeof lang + '|' + (typeof i18n !== 'undefined' && i18n.language)", 'string|string|es');

// ---------- B · detección de claves en la plantilla (para crear el esqueleto de traducciones) ----------
async function det(caso, tpl, wantKeys) {
  try {
    const a = await run({ '/main.pug': tpl }, '/main.pug');
    const tr = a.DataState.data().translations ?? {};
    const keys = [];
    const walk = (o, p) => { for (const [k, v] of Object.entries(o)) (v && typeof v === 'object') ? walk(v, p + k + '.') : keys.push(p + k); };
    walk(tr, '');
    log('B·detección', caso, wantKeys.every((k) => keys.includes(k)) && keys.length === wantKeys.length, keys.join(',') || '(ninguna)', wantKeys.join(','));
  } catch (e) { log('B·detección', caso, false, 'EXCEPCIÓN ' + e.message, wantKeys.join(',')); }
}
await det("t('A.B')", "p= t('A.B')", ['A.B']);
await det('t("A.B") comillas dobles', 'p= t("A.B")', ['A.B']);
await det('t(`A.B`) plantilla literal', 'p= t(`A.B`)', ['A.B']);
await det('#{t(...)} interpolado', "p #{t('A.B')} y más", ['A.B']);
await det('en un atributo', "a(title=t('A.B')) x", ['A.B']);
await det('con parámetros', "p= t('A.B', { n: 1 })", ['A.B']);
await det('i18n.t', "p= i18n.t('A.B')", ['A.B']);
await det('$t', "p= $t('A.B')", ['A.B']);
await det('__', "p= __('A.B')", ['A.B']);
await det('translate.instant', "p= translate.instant('A.B')", ['A.B']);
await det('req.t (i18next-http-middleware)', "p= req.t('A.B')", ['A.B']);
await det('res.__ / locals.t', "p= locals.t('A.B')", ['A.B']);
await det('con espacio de nombres ns:clave', "p= t('common:A.B')", ['common:A.B']);
await det('clave con guion y número', "p= t('FOOTER.LINE-2')", ['FOOTER.LINE-2']);
await det('texto como clave (gettext) «Hola mundo»', "p= t('Hola mundo')", ['Hola mundo']);
await det('clave dinámica t("A." + x)', "- const x = 'B'\np= t('A.' + x)", []);
await det('varias claves a la vez', "p= t('A.B')\np= t('A.C')\np= t('D')", ['A.B', 'A.C', 'D']);

// ---------- C · dónde busca PugIDE los archivos de idioma de un proyecto real ----------
const layouts = [
  ['locales/es/translations.json (el de PugIDE)', '/locales/es/translations.json'],
  ['public/locales/es/translation.json (i18next, por defecto)', '/public/locales/es/translation.json'],
  ['locales/es/translation.json (i18next)', '/locales/es/translation.json'],
  ['locales/es.json', '/locales/es.json'],
  ['i18n/es.json', '/i18n/es.json'],
  ['src/assets/i18n/es.json (ngx-translate)', '/src/assets/i18n/es.json'],
  ['lang/es-ES.json', '/lang/es-ES.json'],
  ['locales/es/common.json (espacio de nombres de i18next)', '/locales/es/common.json'],
];
for (const [caso, path] of layouts) log('C·archivos de idioma', 'carpeta ' + caso, listLocales([path]).length === 1, listLocales([path]).length ? 'se reconoce' : 'no se reconoce', 'se reconoce');
const sample = JSON.stringify({ HOME: { TITLE: 'Hola' } });
for (const [n, want] of [['es.json', 'es'], ['es-ES.json', 'es-ES'], ['es_ES.json', 'es-ES'], ['pt_BR.json', 'pt-BR'], ['translation.json', null], ['common.json', null]]) {
  const asks = looksLikeTranslations(n, sample);
  log('C·archivos de idioma', `suelto ${n}: se pregunta si es un idioma`, asks, asks ? 'sí' : 'no', 'sí');
}

// ---------- D · datos de ejemplo por nombre de campo (lo que se ve sin escribir nada) ----------
const LOREM = /\b(dolor|magna|ipsum|elit|nisi|ullamco|consectetur|tempor|labore|aliqua|veniam|adipiscing|eiusmod|incididunt|laboris|minim|amet|quis)\b/i;
const notLorem = (v) => !(typeof v === 'string' && LOREM.test(v));
const isCode = (re) => (v) => typeof v === 'string' && re.test(v);
const bool = (v) => typeof v === 'boolean';
const lang = isCode(/^[a-z]{2}(-[A-Z]{2})?$/);
// Cada campo se usa en la plantilla como lo haría una plantilla real (`if activo` para un sí/no, `p= nombre` para el resto);
// los datos que salen son los que verías al abrirla.
const campos = [
  ['numeroFactura', isCode(/[A-Za-z].*\d|\d.*[-/].*\d/), 'un número de factura (FA-2026-0312)'],
  ['invoiceNumber', isCode(/[A-Za-z].*\d|\d.*[-/].*\d/), 'INV-2026-0312'],
  ['moneda', isCode(/^(EUR|USD|GBP|€|\$|£|euros?)$/i), 'EUR'],
  ['currency', isCode(/^(EUR|USD|GBP|€|\$|£)$/i), 'EUR'],
  ['iban', isCode(/^[A-Z]{2}\d{2}[ \d]{12,}/), 'ES91 2100 0418 4502 0005 1332'],
  ['nif', isCode(/^[A-Z0-9]{8,9}[A-Z0-9]$/), '48211905K'],
  ['cif', isCode(/^[A-Z]\d{7,8}[A-Z0-9]$/), 'B41238856'],
  ['dni', isCode(/^\d{8}[A-Z]$/), '48211905K'],
  ['provincia', notLorem, 'una provincia (Sevilla)'],
  ['razonSocial', notLorem, 'un nombre de empresa'],
  ['activo', bool, 'true / false', 'if'],
  ['isPaid', bool, 'true / false', 'if'],
  ['pagada', bool, 'true / false', 'if'],
  ['ean', (v) => /^\d{13}$/.test(String(v)), '8412345678905'],
  ['peso', (v) => typeof v === 'number' || (typeof v === 'string' && /\d/.test(v)), 'un peso (12,5 kg)'],
  ['altura', (v) => typeof v === 'number' || (typeof v === 'string' && /\d/.test(v)), 'una altura (1,72 m)'],
  ['lang', lang, 'es'],
  ['locale', lang, 'es-ES'],
  ['idioma', lang, 'es'],
  ['totalPages', Number.isInteger, 'un número entero de páginas'],
  ['fechaNacimiento', (v) => typeof v === 'string' && new Date(v) < new Date(), 'una fecha pasada'],
  ['observaciones', notLorem, 'texto en español, no latín'],
  ['descripcion', notLorem, 'texto en español, no latín'],
];
{
  const tpl = campos.map(([n, , , uso]) => (uso === 'if' ? `if ${n}\n  p ${n}` : `p= ${n}`)).join('\n');
  const a = await run({ '/main.pug': tpl }, '/main.pug');
  const data = a.DataState.data();
  for (const [n, ok, hint] of campos) log('D·datos de ejemplo', n, ok(data[n]), JSON.stringify(data[n]).slice(0, 60), hint);
}

// ---------- E · Pug y proyectos ----------
async function pg(caso, files, want, open = '/main.pug') {
  try {
    const a = await run(files, open);
    const h = html(a);
    const got = errs(a) ? 'ERROR: ' + errs(a).slice(0, 110) : h.replace(/\s+/g, ' ').slice(0, 110);
    log('E·Pug', caso, typeof want === 'function' ? want(h, errs(a)) : (!errs(a) && h.includes(want)), got, typeof want === 'function' ? '(función)' : want);
  } catch (e) { log('E·Pug', caso, false, 'EXCEPCIÓN ' + e.message, String(want)); }
}
await pg('include relativo', { '/main.pug': 'body\n  include partials/h.pug', '/partials/h.pug': 'h1 Cabecera' }, '<h1>Cabecera</h1>');
await pg('include sin extensión', { '/main.pug': 'body\n  include partials/h', '/partials/h.pug': 'h1 Cabecera' }, '<h1>Cabecera</h1>');
await pg('include absoluto /partials/h (basedir)', { '/main.pug': 'body\n  include /partials/h.pug', '/partials/h.pug': 'h1 Cabecera' }, '<h1>Cabecera</h1>');
await pg('include ../ desde una subcarpeta', { '/pages/main.pug': 'body\n  include ../partials/h.pug', '/partials/h.pug': 'h1 Cabecera' }, '<h1>Cabecera</h1>', '/pages/main.pug');
await pg('extends + block', { '/main.pug': 'extends layouts/base\nblock c\n  p Hola', '/layouts/base.pug': 'html\n  body\n    block c' }, '<p>Hola</p>');
await pg('extends absoluto', { '/main.pug': 'extends /layouts/base\nblock c\n  p Hola', '/layouts/base.pug': 'html\n  body\n    block c' }, '<p>Hola</p>');
await pg('include de un .css (texto crudo)', { '/main.pug': 'style\n  include s.css', '/s.css': 'p{color:red}' }, 'p{color:red}');
await pg('include de un .md con :markdown', { '/main.pug': 'div\n  include:markdown t.md', '/t.md': '# Título' }, '<h1');
await pg('filtro :markdown-it', { '/main.pug': 'div\n  :markdown-it\n    # T' }, (h, e) => !e, '');
await pg('filtro :scss (necesita Node)', { '/main.pug': 'style\n  :scss\n    $c:red;p{color:$c}' }, (h, e) => !e || /scss/i.test(e));
await pg('require("moment") (Node)', { '/main.pug': "- const moment = require('moment')\np= moment().year()" }, (h, e) => /moment|require/i.test(e));
await pg('función de helper no definida formatCurrency()', { '/main.pug': 'p= formatCurrency(10)' }, (h, e) => /formatCurrency/.test(e) || h.includes('<p>'));
await pg('Intl.NumberFormat es-ES', { '/main.pug': "p= new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(1234.5)" }, '1234,50');
await pg('toLocaleDateString es-ES', { '/main.pug': "p= new Date(2026, 2, 12).toLocaleDateString('es-ES')" }, '12/3/2026');
await pg('mixin con bloque y atributos', { '/main.pug': 'mixin card(t)\n  .card&attributes(attributes)\n    h2= t\n    block\n+card("A")(id="x")\n  p Hola' }, '<div class="card" id="x"');
await pg('self / locals con propiedades (self.title)', { '/main.pug': 'p= self.title' }, (h, e) => !e);
await pg('doctype html + pretty', { '/main.pug': 'doctype html\nhtml\n  body\n    p Hola' }, '<!DOCTYPE html>');

// ---------- salida ----------
const secs = [...new Set(out.map((o) => o.sec))];
const good = out.filter((o) => o.ok).length;
console.log(`RESUMEN ${good}/${out.length}: ` + secs.map((s) => `${s} ${out.filter((o) => o.sec === s && o.ok).length}/${out.filter((o) => o.sec === s).length}`).join(' · '));
for (const s of secs) {
  const rows = out.filter((o) => o.sec === s);
  console.log(`\n## ${s}: ${rows.filter((r) => r.ok).length}/${rows.length}`);
  for (const r of rows) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.caso}  →  ${r.got}${r.ok ? '' : `   (esperado: ${r.want})`}`);
}
