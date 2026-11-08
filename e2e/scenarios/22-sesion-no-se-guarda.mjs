import { check, run } from '../lib.mjs';
// Si la sesión no cabe en el almacenamiento del navegador, se dice en el Registro (una vez) en vez de perderla en silencio
const warnings = (a) => a.TerminalState.entries().filter((e) => e.source === 'Sesión' && e.type === 'warning');
const full = () => ({ setItem() { throw new Error('QuotaExceededError'); }, getItem: () => null, removeItem() {} });
const works = () => { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k) }; };

{
  globalThis.localStorage = works();
  const a = await run({ '/main.pug': 'p hola\n' }, '/main.pug');
  const before = warnings(a).length;
  a.orch.saveSession();
  check('46 con almacenamiento que funciona no hay aviso', !a.PersistenceService.lastWriteFailed() && warnings(a).length === before, String(warnings(a).length));

  globalThis.localStorage = full();
  a.orch.saveSession();
  check('46 con el almacenamiento lleno la barra de estado lo marca', a.PersistenceService.lastWriteFailed());
  check('46 y el Registro lo explica con una advertencia', warnings(a).length === before + 1 && /No se pudo guardar la sesión/.test(warnings(a)[0]?.message ?? ''), JSON.stringify(warnings(a)));
  check('46 el aviso dice cómo no perderlo (Exportar) y la causa (almacenamiento o datos de ~5 MB)', /Exporta el proyecto/.test(warnings(a)[0].message) && /5 MB/.test(warnings(a)[0].message));
  a.orch.saveSession();
  a.orch.saveSession();
  check('46 no se repite en cada autoguardado', warnings(a).length === before + 1, String(warnings(a).length));

  globalThis.localStorage = works();
  a.orch.saveSession();
  check('46 al recuperarse el almacenamiento la marca desaparece', !a.PersistenceService.lastWriteFailed());
  globalThis.localStorage = full();
  a.orch.saveSession();
  check('46 si vuelve a fallar se avisa otra vez', warnings(a).length === before + 2, String(warnings(a).length));
  delete globalThis.localStorage;
}
