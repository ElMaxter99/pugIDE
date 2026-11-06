import { check, run } from '../lib.mjs';
// Disposiciones y tamaños de los paneles (P-08): se guardan en las preferencias del usuario y no viajan con el proyecto
{
  const mem = new Map();
  const hadStorage = 'localStorage' in globalThis;
  if (!hadStorage) globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const a = await run({ '/index.pug': 'p hi\n' }, '/index.pug');
  const prefs = a.PreferencesState;
  const layout = a.LayoutService;
  const saved = () => a.PersistenceService.loadPreferences();

  check('20 disposición de partida: «Editor + vista previa» con el panel lateral abierto y sin tamaños propios', prefs.layout() === 'editor-preview' && !prefs.sidebarCollapsed() && Object.keys(prefs.panelSizes()).length === 0 && prefs.sidebarTab() === 'archivos');
  check('20 los datos van en una pestaña del panel lateral, no en una columna', !layout.dataColumn() && !layout.dataVisible());

  // Cambiar de disposición ajusta el panel lateral y se guarda
  layout.apply('focus-editor');
  check('20 «Foco en el editor» recoge el panel lateral y se guarda', prefs.layout() === 'focus-editor' && prefs.sidebarCollapsed() && saved().layout === 'focus-editor' && saved().sidebarCollapsed === true, JSON.stringify(saved()));
  layout.apply('editor-data-preview');
  check('20 «Editor + datos + vista previa» saca los datos a su columna', layout.dataColumn() && layout.dataVisible() && prefs.sidebarCollapsed());
  prefs.toggleData();
  check('20 ocultar los datos oculta la columna (y se recuerda)', !layout.dataVisible() && saved().dataCollapsed === true);
  layout.apply('editor-data-preview');
  check('20 volver a elegir la disposición vuelve a mostrar los datos', layout.dataVisible() && saved().dataCollapsed === false);
  layout.apply('focus-preview');
  check('20 «Foco en la vista previa · PDF» pone el preview en modo PDF', prefs.layout() === 'focus-preview' && a.PreviewState.isPdf() && saved().previewDevice === 'PDF');

  // Mostrar u ocultar los datos fuera de la columna abre la pestaña «Datos»
  layout.apply('editor-preview');
  layout.toggleData();
  check('20 «Mostrar Datos» abre el panel lateral en su pestaña «Datos»', !prefs.sidebarCollapsed() && prefs.sidebarTab() === 'datos' && saved().sidebarTab === 'datos');
  layout.toggleData();
  check('20 y otra vez lo recoge', prefs.sidebarCollapsed());
  layout.openSidebar('archivos');
  check('20 abrir «Archivos» deja el panel lateral abierto en esa pestaña', !prefs.sidebarCollapsed() && prefs.sidebarTab() === 'archivos');

  // Tamaños: se arrastran en vivo, se guardan al soltar y son por disposición
  layout.setLive('preview', 540);
  check('20 el arrastre se ve al instante sin escribir aún en las preferencias', layout.sizes().preview === 540 && saved().panelSizes['editor-preview'] === undefined);
  layout.commitLive();
  check('20 al soltar se guarda para la disposición activa', saved().panelSizes['editor-preview']?.preview === 540 && layout.sizes().preview === 540, JSON.stringify(saved().panelSizes));
  layout.apply('focus-editor');
  check('20 los tamaños son de cada disposición', layout.sizes().preview === undefined);
  layout.apply('editor-preview');
  check('20 al volver se recuperan', layout.sizes().preview === 540);
  prefs.load();
  check('20 sobreviven a recargar las preferencias', layout.sizes().preview === 540 && prefs.layout() === 'editor-preview');
  layout.setSize('sidebar', 320);
  layout.resetSize('preview');
  check('20 restablecer un panel conserva los demás', layout.sizes().preview === undefined && layout.sizes().sidebar === 320);
  layout.resetSizes();
  check('20 «Restablecer los tamaños» borra los de la disposición', Object.keys(layout.sizes()).length === 0 && saved().panelSizes['editor-preview'] === undefined);

  // El reparto respeta los mínimos y el ancho disponible
  layout.setContainerWidth(1440);
  const r = layout.resolved();
  check('20 a 1440 px la predeterminada reparte 280 / 500 / 660', r.sidebar === 280 && r.editor === 500 && r.preview === 660, JSON.stringify(r));

  // Preferencias antiguas o estropeadas: lo que no vale vuelve a su valor de partida
  localStorage.setItem('pug-ide-preferences', JSON.stringify({ theme: 'dark', sidebarCollapsed: true, layout: 'raro', panelSizes: { 'focus-editor': { preview: 'ancho', sidebar: 250.6 }, raro: { preview: 1 } }, sidebarTab: 'otra' }));
  prefs.load();
  check('20 preferencias antiguas o inválidas: disposición por defecto, tamaños saneados y el panel recogido se respeta', prefs.layout() === 'editor-preview' && prefs.sidebarTab() === 'archivos' && prefs.sidebarCollapsed() && prefs.panelSizes()['focus-editor']?.sidebar === 251 && prefs.panelSizes()['focus-editor']?.preview === undefined && !('raro' in prefs.panelSizes()), JSON.stringify(prefs.panelSizes()));
  localStorage.setItem('pug-ide-preferences', '{no es json');
  prefs.load();
  check('20 un JSON de preferencias roto no tumba la carga', prefs.layout() === 'editor-preview');

  // No viaja con el proyecto: ni el enlace para compartir ni la sesión del proyecto llevan disposición ni tamaños
  layout.apply('focus-editor');
  layout.setSize('preview', 500);
  const { encodeShare, decodeShare } = await import('../.build/services.mjs');
  const payload = decodeShare(encodeShare('Demo', new Map([['/index.pug', 'p hi\n']]), {}, []));
  const keys = payload ? JSON.stringify(payload) : '';
  check('20 el enlace para compartir no lleva la disposición ni los tamaños', !!payload && !/layout|panelSizes|sidebarTab|focus-editor/.test(keys), keys);
  const session = JSON.stringify(a.PersistenceService.loadProjectState() ?? {});
  check('20 la sesión del proyecto tampoco', !/layout|panelSizes|sidebarTab|focus-editor/.test(session), session.slice(0, 200));
  if (!hadStorage) delete globalThis.localStorage;
}
