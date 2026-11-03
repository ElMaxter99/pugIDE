/**
 * Etiquetas de pestaña: el nombre del archivo y, si otra pestaña abierta se llama igual
 * (`locales/es-ES/translations.json` y `locales/es-CAT/translations.json`), también su carpeta.
 */
export function tabLabels(tabs: ReadonlyArray<{ id: string; name: string; path: string }>): Map<string, string> {
  const counts = new Map<string, number>();
  for (const t of tabs) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
  const labels = new Map<string, string>();
  for (const t of tabs) {
    const parent = t.path.split('/').filter(Boolean).slice(-2, -1)[0];
    labels.set(t.id, (counts.get(t.name) ?? 0) > 1 && parent ? `${parent}/${t.name}` : t.name);
  }
  return labels;
}
