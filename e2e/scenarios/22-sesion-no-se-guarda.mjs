import { check, run } from '../lib.mjs';
// Desde la 0.16, si la sesión no cabe en localStorage (~5 MB) va a IndexedDB y sobrevive a recargar. Solo si tampoco
// se puede escribir ahí se dice en el Registro (una vez) en vez de perderla en silencio.
const warnings = (a) => a.TerminalState.entries().filter((e) => e.source === 'Sesión' && e.type === 'warning');
const full = (m = new Map()) => ({ setItem(k, v) { if (String(v).length > 40) throw new Error('QuotaExceededError'); m.set(k, v); }, getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k) });
const works = (m = new Map()) => ({ setItem: (k, v) => m.set(k, v), getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k) });
const memory = () => { let raw = null; return { get: async () => raw, put: async (r) => { raw = r; }, clear: async () => { raw = null; }, peek: () => raw }; };
const broken = () => ({ get: async () => null, put: async () => { throw new Error('IndexedDB bloqueado'); }, clear: async () => {} });

{
  const shared = new Map();
  globalThis.localStorage = works(shared);
  const a = await run({ '/main.pug': 'p hola\n' }, '/main.pug');
  const p = a.PersistenceService;
  const idb = memory();
  p.sessionBackend = idb;
  const before = warnings(a).length;
  a.orch.saveSession();
  await p.flushSession();
  check('46 con almacenamiento que funciona no hay aviso', !p.lastWriteFailed() && warnings(a).length === before, String(warnings(a).length));
  check('46 la sesión pequeña va a localStorage (lectura inmediata al arrancar)', shared.has('pug-ide-project') && idb.peek() === null);

  // localStorage lleno: la sesión va a IndexedDB, sin aviso, y se vuelve a leer de ahí.
  globalThis.localStorage = full(shared);
  a.orch.saveSession();
  await p.flushSession();
  check('46 si no cabe en localStorage se guarda en IndexedDB, sin aviso', !p.lastWriteFailed() && warnings(a).length === before && /p hola/.test(idb.peek() ?? ''), String(idb.peek()).slice(0, 60));
  check('46 y deja la marca y quita la copia vieja de localStorage', shared.has('pug-ide-project-idb') && !shared.has('pug-ide-project'));
  const back = await p.loadProjectState();
  check('46 al arrancar se lee la de IndexedDB', back?.files?.['/main.pug'] === 'p hola\n', JSON.stringify(back?.files));
  check('46 la portada sabe que hay sesión guardada', p.hasSavedSession());

  // Tampoco se puede en IndexedDB: ahora sí se avisa, y localStorage conserva lo último bueno.
  p.sessionBackend = broken();
  shared.delete('pug-ide-project-idb');
  shared.set('pug-ide-project', 'ULTIMA-BUENA');
  a.orch.saveSession();
  await p.flushSession(); await new Promise((r) => setTimeout(r, 0));
  check('46 si tampoco cabe en IndexedDB la barra de estado lo marca', p.lastWriteFailed());
  check('46 y el Registro lo explica con una advertencia', warnings(a).length === before + 1 && /No se pudo guardar la sesión/.test(warnings(a).at(-1)?.message ?? ''), JSON.stringify(warnings(a)));
  check('46 el aviso dice cómo no perderlo (Exportar)', /Exporta el proyecto/.test(warnings(a).at(-1).message));
  check('46 lo último que se guardó bien no se borra', shared.get('pug-ide-project') === 'ULTIMA-BUENA');
  a.orch.saveSession(); await p.flushSession();
  a.orch.saveSession(); await p.flushSession(); await new Promise((r) => setTimeout(r, 0));
  check('46 no se repite en cada autoguardado', warnings(a).length === before + 1, String(warnings(a).length));

  // Vuelve a caber en localStorage: se quita la marca y la copia de IndexedDB.
  p.sessionBackend = idb;
  await idb.put('vieja');
  shared.set('pug-ide-project-idb', '1');
  globalThis.localStorage = works(shared);
  a.orch.saveSession();
  await p.flushSession(); await new Promise((r) => setTimeout(r, 0));
  check('46 al recuperarse el almacenamiento la marca desaparece', !p.lastWriteFailed() && !shared.has('pug-ide-project-idb') && idb.peek() === null);
  delete globalThis.localStorage;
}
