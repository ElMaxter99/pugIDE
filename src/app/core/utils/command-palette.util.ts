/** Lo mínimo que la paleta necesita de un comando para buscarlo. */
export interface SearchableCommand {
  title: string;
  group?: string;
  keywords?: string;
}

/** Minúsculas y sin acentos, para buscar "compilar" y encontrar "Compilación". */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Filtra y ordena comandos: cada palabra de la consulta debe aparecer en el título, grupo o
 * palabras clave. Primero los que empiezan por la consulta, luego los que la tienen al inicio de
 * una palabra del título, luego el resto (se conserva el orden original dentro de cada nivel).
 */
export function filterCommands<T extends SearchableCommand>(commands: readonly T[], query: string): T[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...commands];
  const scored: { cmd: T; score: number; index: number }[] = [];
  commands.forEach((cmd, index) => {
    const title = normalizeSearch(cmd.title);
    const hay = `${title} ${normalizeSearch(cmd.group ?? '')} ${normalizeSearch(cmd.keywords ?? '')}`;
    if (!tokens.every((t) => hay.includes(t))) return;
    const q = tokens.join(' ');
    const score = title.startsWith(q) ? 0 : tokens.every((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(title)) ? 1 : 2;
    scored.push({ cmd, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((s) => s.cmd);
}
