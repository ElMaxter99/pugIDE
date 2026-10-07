import { check, run } from '../lib.mjs';
// Paneles Workspace y Data colapsables, con el estado guardado en preferencias
// 30. Collapsible panels
{
  const mem = new Map();
  const hadStorage = 'localStorage' in globalThis;
  if (!hadStorage) globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const a = await run({ '/index.pug': 'p hi\n' }, '/index.pug');
  const prefs = a.PreferencesState;
  check('30 paneles expandidos por defecto', !prefs.sidebarCollapsed() && !prefs.dataCollapsed());
  prefs.toggleSidebar();
  prefs.toggleData();
  check('30 toggle colapsa Workspace y Data', prefs.sidebarCollapsed() && prefs.dataCollapsed());
  const saved = a.PersistenceService.loadPreferences();
  check('30 el estado se persiste', saved.sidebarCollapsed === true && saved.dataCollapsed === true, JSON.stringify(saved));
  prefs.load();
  check('30 el estado se restaura al cargar', prefs.sidebarCollapsed() && prefs.dataCollapsed());
  prefs.toggleSidebar();
  prefs.toggleData();
  check('30 toggle vuelve a expandir', !prefs.sidebarCollapsed() && !prefs.dataCollapsed());
  if (!hadStorage) delete globalThis.localStorage;
}
