// Utilidades compartidas por los escenarios e2e.
import { makeApp } from './harness.mjs';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const stats = { fails: 0 };
export const check = (name, ok, extra = '') => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + extra)); if (!ok) stats.fails++; };
export async function run(files, open, mutate) {
  const app = await makeApp(files, open);
  await app.orch.initialize();
  await app.orch.manualCompile();
  if (mutate) await mutate(app);
  return app;
}
export const html = (a) => a.PreviewState.compiledHtml();
export const errs = (a) => a.PreviewState.errors().map((e) => e.message).join(' | ');
