/** Lee la sesión guardada (texto de localStorage) y la comprueba: rescata lo que sirve y dice qué pasó con el resto. */

export interface LoadedSession {
  projectName: string;
  files: Record<string, string>;
  openTabPaths: string[];
  activeTabPath: string | null;
  [k: string]: unknown;
}

export interface SessionReading {
  state: LoadedSession | null;
  /** Por qué no se pudo leer entera (null: estaba bien). */
  problem: string | null;
  /** Archivos descartados por no ser texto. */
  dropped: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function readSession(raw: string | null): SessionReading {
  if (!raw) return { state: null, problem: null, dropped: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { state: null, problem: `el JSON está truncado o dañado (${(err as Error).message})`, dropped: [] };
  }
  if (!isObj(parsed)) return { state: null, problem: 'no es un objeto de sesión', dropped: [] };
  if (!isObj(parsed['files'])) return { state: null, problem: 'falta la lista de archivos', dropped: [] };
  const files: Record<string, string> = {};
  const dropped: string[] = [];
  for (const [path, content] of Object.entries(parsed['files'])) {
    if (typeof content === 'string') files[path] = content;
    else dropped.push(path);
  }
  if (!Object.keys(files).length) return { state: null, problem: 'no queda ningún archivo de texto válido', dropped };
  const openTabPaths = Array.isArray(parsed['openTabPaths']) ? parsed['openTabPaths'].filter((p): p is string => typeof p === 'string' && p in files) : [];
  const active = parsed['activeTabPath'];
  return {
    state: {
      ...parsed,
      projectName: typeof parsed['projectName'] === 'string' && parsed['projectName'] ? parsed['projectName'] : 'Proyecto',
      files,
      openTabPaths,
      activeTabPath: typeof active === 'string' && active in files ? active : null,
    },
    problem: dropped.length ? `${dropped.length} archivo${dropped.length === 1 ? '' : 's'} sin contenido de texto` : null,
    dropped,
  };
}
