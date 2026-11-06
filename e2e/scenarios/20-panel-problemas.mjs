import { check, run } from '../lib.mjs';
// Panel «Problemas»: un solo sitio para los problemas, y el Registro no los repite en «Esenciales»

{
  const a = await run({ '/main.pug': 'html\n  body\n    +falta()\n', '/locales/es/translations.json': '{ "A": ' }, '/main.pug');
  const rows = a.DiagnosticsState.rows();
  check('20 los problemas localizados y el JSON inválido están en el panel', rows.length === 2 && rows.every((r) => r.severity === 'error' && r.path && r.line), JSON.stringify(rows));
  check('20 el recuento los suma', a.DiagnosticsState.counts().errors === 2 && a.DiagnosticsState.counts().total === 2, JSON.stringify(a.DiagnosticsState.counts()));
  const entries = a.TerminalState.entries();
  const compile = entries.filter((e) => e.type === 'error');
  check('20 el Registro conserva los errores de compilación y de idiomas, pero como detalle', compile.length >= 2 && compile.every((e) => e.detail === true), JSON.stringify(compile));
  check('20 «Esenciales» no los repite', a.TerminalState.filteredEntries().every((e) => e.type !== 'error') && a.TerminalState.essentialIssueCount() === 0, JSON.stringify(a.TerminalState.filteredEntries()));
  a.TerminalState.setFilter('all');
  check('20 «Todo» sí los trae', a.TerminalState.filteredEntries().some((e) => e.type === 'error'));
}
{
  const a = await run({ '/main.pug': 'html\n  body\n    +falta()\n' }, '/main.pug');
  const first = a.DiagnosticsState.step(1);
  const second = a.DiagnosticsState.step(1);
  check('20 siguiente problema da la vuelta con un solo problema', !!first && first === second, JSON.stringify([first, second]));
  check('20 y recuerda cuál es la fila seleccionada', a.DiagnosticsState.selectedId() === 'd0');
}
{
  const a = await run({ '/main.pug': 'p ok\n' }, '/main.pug');
  check('20 sin problemas el panel está vacío y se anota la vista correcta', a.DiagnosticsState.rows().length === 0 && a.PreviewState.lastGoodAt() > 0, String(a.PreviewState.lastGoodAt()));
  const good = a.PreviewState.compiledHtml();
  a.EditorState.files.update((f) => { const m = new Map(f); m.set('/main.pug', 'p ok\n+roto()\n'); return m; });
  a.EditorState.editorContent.set('p ok\n+roto()\n');
  await a.OrchestratorService.manualCompile();
  check('20 al fallar se conserva el HTML de la última vista correcta', a.PreviewState.compiledHtml() === good && a.PreviewState.errors().length > 0 && a.DiagnosticsState.counts().total >= 1, a.PreviewState.compiledHtml().slice(0, 80));
}
