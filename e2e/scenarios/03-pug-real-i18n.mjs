import { check, run, html, errs, sleep } from '../lib.mjs';
import { readFileSync, readdirSync } from 'node:fs';
// Pug real, helpers, i18n y traducciones
// 16. real-world report: top-level `- var` helpers, `var reported = pdfData.reported` alias, i18n `t('KEY')`
//     calls, inline functions / object literals / Array.from, rows.slice(...) iteration
{
  const d = new URL('../fixtures/allianz/', import.meta.url).pathname;
  const a = await run({
    '/index.pug': readFileSync(d + 'index.pug', 'utf8'),
    '/mixins.pug': readFileSync(d + 'mixins.pug', 'utf8'),
  }, '/index.pug');
  const data = a.DataState.data();
  const rep = data.pdfData?.reported;
  check('16 compiles without errors', !errs(a), errs(a));
  check('16 data root is pdfData + translations (no JS junk)', JSON.stringify(Object.keys(data).sort()) === '["pdfData","translations"]', Object.keys(data).join(','));
  check('16 reported shape', rep && 'exercise' in rep && 'fullName' in rep.declaredClient && Array.isArray(rep.rows) && Array.isArray(rep.dividends), JSON.stringify(data));
  check('16 row items typed', rep.rows[0] && 'fundName' in rep.rows[0] && 'gain' in rep.rows[0] && typeof rep.rows[0].participations === 'number', JSON.stringify(rep?.rows));
  check('16 mocked translation rendered, table rendered', html(a).includes(data.translations.FISCAL_REPORT_ALLIANZ.TITLE) && html(a).includes('<table'), html(a).slice(0, 200));
}

// 17. index compiled while its mixins file is still empty (data gets pdfData.reported = ''), then the mixins are pasted in
{
  const d = new URL('../fixtures/allianz/', import.meta.url).pathname;
  const mixins = readFileSync(d + 'mixins.pug', 'utf8');
  const a = await run({
    '/main.pug': readFileSync(d + 'index.pug', 'utf8'),
    '/mixins.pug': '',
  }, '/main.pug');
  a.EditorState.files.update((f) => { f.set('/mixins.pug', mixins); return f; });
  await a.orch.manualCompile();
  check('17 pasted mixins compile after empty placeholder data', !errs(a), errs(a) + JSON.stringify(a.DataState.data()));
  check('17 reported is an object', typeof a.DataState.data().pdfData?.reported === 'object', JSON.stringify(a.DataState.data()));
}
// 18. translations: t('A.B') and i18n.t('A.B') keys land in data.translations (nested) and the preview uses the values
{
  const a = await run({
    '/index.pug': "html\n  body\n    h1= t('PAGE.TITLE')\n    p= i18n.t('PAGE.INTRO', { name: user.name })\n    p #{t('PAGE.EMPTY')}\n    a(title=t('PAGE.LINK'))\n",
  }, '/index.pug');
  const d = a.DataState.data();
  check('18 keys nested under translations', d.translations?.PAGE && ['TITLE', 'INTRO', 'EMPTY', 'LINK'].every((k) => k in d.translations.PAGE), JSON.stringify(d));
  check('18 i18n / t not data, user.name is', !('i18n' in d) && !('t' in d) && 'name' in d.user, JSON.stringify(d));
  check('18 auto-mocked translation rendered', html(a).includes('>' + d.translations.PAGE.TITLE + '<') && !errs(a), errs(a) + html(a));
  a.DataState.setData({ ...d, translations: { PAGE: { TITLE: 'Informe', INTRO: 'Hola {{name}}', EMPTY: '', LINK: 'Ir' } }, user: { name: 'Ana' } });
  await a.orch.manualCompile();
  check('18 filled translations rendered (+ params, empty -> key)', html(a).includes('>Informe<') && html(a).includes('Hola Ana') && html(a).includes('PAGE.EMPTY') && html(a).includes('title="Ir"'), html(a));
}
