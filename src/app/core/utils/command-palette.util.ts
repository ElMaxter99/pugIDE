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

/** Identificadores de los comandos usados hace poco, del más reciente al más antiguo y sin repetir. */
export function pushRecent(recent: readonly string[], id: string, max = 5): string[] {
  return [id, ...recent.filter((r) => r !== id)].slice(0, max);
}

/** Con la consulta vacía, los comandos recientes van arriba (en su orden) y el resto conserva el suyo. */
export function withRecentsFirst<T extends { id: string }>(commands: readonly T[], recent: readonly string[]): { list: T[]; recentCount: number } {
  const byId = new Map(commands.map((c) => [c.id, c]));
  const top = recent.map((id) => byId.get(id)).filter((c): c is T => !!c);
  const topIds = new Set(top.map((c) => c.id));
  return { list: [...top, ...commands.filter((c) => !topIds.has(c.id))], recentCount: top.length };
}

export interface TextPart {
  text: string;
  match: boolean;
}

/** Parte el título para resaltar lo que coincide con la consulta (sin distinguir mayúsculas ni acentos). */
export function highlightParts(title: string, query: string): TextPart[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [{ text: title, match: false }];
  // Texto normalizado carácter a carácter, con el índice del carácter original que le corresponde.
  let norm = '';
  const origin: number[] = [];
  [...title].forEach((ch, i) => {
    const n = normalizeSearch(ch);
    for (let k = 0; k < n.length; k++) { norm += n[k]; origin.push(i); }
  });
  const chars = [...title];
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    for (;;) {
      const at = norm.indexOf(t, from);
      if (at < 0) break;
      for (let k = at; k < at + t.length; k++) marked[origin[k]] = true;
      from = at + t.length;
    }
  }
  const parts: TextPart[] = [];
  chars.forEach((ch, i) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) last.text += ch;
    else parts.push({ text: ch, match: marked[i] });
  });
  return parts;
}
