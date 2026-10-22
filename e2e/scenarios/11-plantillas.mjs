import { check, run, html, errs } from '../lib.mjs';
// Plantillas de inicio: cada una compila sin errores con sus datos y su estilo
// 41. Templates
{
  const { PROJECT_TEMPLATES } = await import('../.build/services.mjs');
  check('41 hay tres plantillas con ids únicos', PROJECT_TEMPLATES.length === 3 && new Set(PROJECT_TEMPLATES.map((t) => t.id)).size === 3);
  for (const t of PROJECT_TEMPLATES) {
    const app = await run(t.files, '/main.pug', async (a) => {
      a.DataState.setInitialData(structuredClone(t.data));
      await a.orch.manualCompile();
    });
    const out = html(app);
    const body = out.replace(/<script[\s\S]*?<\/script>/g, '');
    check(`41 ${t.id}: compila sin errores`, out.length > 200 && !errs(app), errs(app));
    check(`41 ${t.id}: usa sus datos y traducciones`, !body.includes('undefined') && !body.includes('[object') && !/\b(INVOICE|EMAIL|REPORT)\.[A-Z_]+\b/.test(body), body.slice(0, 300));
    check(`41 ${t.id}: no deja interpolaciones sin resolver`, !/#\{[^}]*\}/.test(body), (body.match(/#\{[^}]*\}/) || [])[0]);
    check(`41 ${t.id}: el CSS del proyecto llega al HTML`, /<style/.test(out));
    check(`41 ${t.id}: no genera avisos de datos que faltan`, !app.TerminalState.entries().some((e) => e.type === 'error'));
  }
}

// 43. Avisos de calidad en el terminal (datos sin usar, peso del HTML)
{
  const app = await run({ '/main.pug': 'p= usado\n' }, '/main.pug', async (a) => {
    a.DataState.setInitialData({ usado: 'x', sobrante: 1, otro: 2 });
    await a.orch.manualCompile();
  });
  const hints = () => app.TerminalState.entries().filter((e) => e.source === 'Calidad');
  check('43 avisa de los datos que no se usan', hints().some((e) => e.message.includes('sobrante') && e.message.includes('otro') && !e.message.includes('usado,')), JSON.stringify(hints()));
  const n = hints().length;
  await app.orch.manualCompile();
  check('43 no repite el mismo aviso al recompilar', hints().length === n);
}

// 44. El proyecto demo no depende de la red (imágenes locales o data:)
{
  const { readFileSync } = await import('node:fs');
  const demo = JSON.parse(readFileSync(new URL('../../src/assets/demo/demo-data.json', import.meta.url), 'utf8'));
  check('44 el avatar del demo es un data: URI, sin red', typeof demo.avatar === 'string' && demo.avatar.startsWith('data:image/'), String(demo.avatar).slice(0, 60));
}
