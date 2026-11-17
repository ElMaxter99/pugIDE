/**
 * Importar un CSV como juegos de datos (P-44): una fila = un juego de datos, la primera fila son las claves. Puro y sin
 * red: solo se lee el archivo que la persona elige. Separador autodetectado (`,` `;` tabulador), comillas, saltos de
 * línea dentro de una celda y BOM de UTF-8; las claves con punto crean objetos (`paciente.nombre`).
 */
export type CsvDelimiter = ',' | ';' | '\t';
export type CsvColumnType = 'texto' | 'número' | 'sí/no';

/** Filas que se importan de una vez: cada PDF tarda 1–2 s y cada juego se guarda en la sesión. */
export const CSV_MAX_ROWS = 500;

export const stripBom = (text: string): string => text.replace(/^\uFEFF/, '');

/** Separador más probable: el que más veces aparece (fuera de comillas) en las primeras líneas, y de forma regular. */
export function detectDelimiter(text: string): CsvDelimiter {
  const sample = stripBom(text).slice(0, 8000);
  const counts: Record<CsvDelimiter, number[]> = { ',': [], ';': [], '\t': [] };
  let inQuotes = false;
  let line: Record<CsvDelimiter, number> = { ',': 0, ';': 0, '\t': 0 };
  let lines = 0;
  for (let i = 0; i < sample.length && lines < 8; i++) {
    const c = sample[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (c === ',' || c === ';' || c === '\t')) line[c]++;
    else if (!inQuotes && c === '\n') {
      if (line[','] + line[';'] + line['\t'] > 0 || lines === 0) { for (const d of [',', ';', '\t'] as CsvDelimiter[]) counts[d].push(line[d]); lines++; }
      line = { ',': 0, ';': 0, '\t': 0 };
    }
  }
  if (lines === 0) for (const d of [',', ';', '\t'] as CsvDelimiter[]) counts[d].push(line[d]);
  // Puntúa por la constancia (todas las líneas con el mismo número) y por cuántos separadores hay.
  let best: CsvDelimiter = ',';
  let bestScore = 0;
  for (const d of [';', '\t', ','] as CsvDelimiter[]) {
    const c = counts[d];
    const first = c[0] ?? 0;
    if (!first) continue;
    const same = c.filter((n) => n === first).length;
    const score = same * 1000 + first;
    if (score > bestScore) { best = d; bestScore = score; }
  }
  return best;
}

/** Filas de celdas. Las filas vacías (todas las celdas sin texto) se ignoran. */
export function parseCsv(text: string, delimiter: CsvDelimiter): string[][] {
  const src = stripBom(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const endCell = (): void => { row.push(cell); cell = ''; };
  const endRow = (): void => { endCell(); if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += c;
    } else if (c === '"' && cell === '') inQuotes = true;
    else if (c === delimiter) endCell();
    else if (c === '\r') { if (src[i + 1] === '\n') i++; endRow(); }
    else if (c === '\n') endRow();
    else cell += c;
  }
  if (cell !== '' || row.length) endRow();
  return rows;
}

/** Texto → valor: número (85 · 85,50 · 85.5), sí/no, true/false o texto. `00123` y los números largos se quedan como texto. */
export function convertCell(raw: string, delimiter: CsvDelimiter, asText: boolean): string | number | boolean {
  const v = raw.trim();
  if (asText || v === '') return asText ? raw : '';
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (/^(sí|si)$/i.test(v)) return true;
  if (/^no$/i.test(v)) return false;
  const m = /^(-?)(\d+)(?:([.,])(\d+))?$/.exec(v);
  if (m) {
    const [, sign, int, sep, frac] = m;
    if ((int.length > 1 && int.startsWith('0')) || int.length > 15 || (frac && frac.length > 15)) return raw;
    if (sep === ',' && delimiter === ',') return raw; // con «,» de separador no puede ser un decimal
    return Number(`${sign}${int}${frac ? '.' + frac : ''}`);
  }
  return raw;
}

const typeOfValue = (v: unknown): CsvColumnType => (typeof v === 'number' ? 'número' : typeof v === 'boolean' ? 'sí/no' : 'texto');

export interface CsvOptions {
  delimiter: CsvDelimiter;
  /** La primera fila son las claves (por defecto sí). */
  header: boolean;
  asText: boolean;
  /** Columna cuyo valor da nombre al juego; -1 = «Fila 1, Fila 2…». */
  nameColumn: number;
  /** Primera fila de datos que se importa (0 = desde el principio) y cuántas como máximo. */
  offset: number;
  limit: number;
}

export interface CsvDataset { name: string; data: Record<string, unknown> }

export interface CsvResult {
  keys: string[];
  types: CsvColumnType[];
  /** Filas de datos del archivo (todas) y las que se importan. */
  total: number;
  datasets: CsvDataset[];
  /** Primeras filas tal como vienen en el archivo, para la vista previa. */
  preview: string[][];
  warnings: string[];
  error: string | null;
}

/** Claves de la cabecera: sin espacios sobrantes, sin vacías y sin repetir (`fecha`, `fecha (2)`). */
export function cleanKeys(header: string[]): { keys: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  const keys = header.map((raw, i) => {
    let key = raw.trim().replace(/\s+/g, ' ') || `columna${i + 1}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) {
      const original = key;
      key = `${key} (${n})`;
      warnings.push(`La columna ${original} está repetida: la ${n === 2 ? 'segunda' : n === 3 ? 'tercera' : `n.º ${n}`} pasa a ${key}.`);
    }
    return key;
  });
  return { keys, warnings };
}

/** Coloca `value` en `data` siguiendo el camino `a.b.c`. Devuelve false si choca con un valor que no es un objeto. */
function setPath(data: Record<string, unknown>, key: string, value: unknown): boolean {
  const parts = key.split('.').filter((p) => p !== '');
  if (parts.length <= 1) { data[parts[0] ?? key] = value; return true; }
  let node = data;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (next === undefined) node[parts[i]] = {};
    else if (typeof next !== 'object' || next === null || Array.isArray(next)) return false;
    node = node[parts[i]] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (typeof node[last] === 'object' && node[last] !== null) return false;
  node[last] = value;
  return true;
}

const rowList = (rows: number[]): string => (rows.length <= 3 ? rows.join(', ').replace(/, (\d+)$/, ' y $1') : `${rows.slice(0, 3).join(', ')}…`);

export function buildCsvDatasets(text: string, opts: CsvOptions): CsvResult {
  const empty: CsvResult = { keys: [], types: [], total: 0, datasets: [], preview: [], warnings: [], error: null };
  const rows = parseCsv(text, opts.delimiter);
  if (!rows.length) return { ...empty, error: 'El archivo no tiene filas de datos.' };
  const width = Math.max(...rows.slice(0, 50).map((r) => r.length));
  const headerRow = opts.header ? rows[0] : Array.from({ length: width }, (_, i) => `columna${i + 1}`);
  const body = opts.header ? rows.slice(1) : rows;
  const { keys, warnings } = cleanKeys(headerRow);
  if (!body.length) return { ...empty, keys, error: 'El archivo no tiene filas de datos.' };
  if (keys.length === 1 && body.some((r) => /[;,\t]/.test(r[0] ?? '')) && !text.includes('"')) {
    return { ...empty, keys, total: body.length, error: 'El archivo trae una sola columna con separadores dentro. Prueba con otro separador.' };
  }
  const firstRowNumber = opts.header ? 2 : 1;
  const short: number[] = [];
  const long: number[] = [];
  body.forEach((r, i) => { if (r.length < keys.length) short.push(i + firstRowNumber); else if (r.length > keys.length) long.push(i + firstRowNumber); });
  if (short.length) warnings.push(`${short.length === 1 ? '1 fila' : `${short.length} filas`} (${rowList(short)}) ${short.length === 1 ? 'tiene' : 'tienen'} menos columnas que la cabecera: se rellenan con vacío.`);
  if (long.length) warnings.push(`${long.length === 1 ? '1 fila' : `${long.length} filas`} (${rowList(long)}) ${long.length === 1 ? 'tiene' : 'tienen'} más columnas que la cabecera: las sobrantes se ignoran.`);

  const types: CsvColumnType[] = keys.map((_, c) => {
    const kinds = new Set(body.map((r) => convertCell(r[c] ?? '', opts.delimiter, opts.asText)).filter((v) => v !== '').map(typeOfValue));
    return kinds.size === 1 ? [...kinds][0] : 'texto';
  });

  const chunk = body.slice(Math.max(0, opts.offset), Math.max(0, opts.offset) + Math.max(1, opts.limit));
  const conflicts = new Set<string>();
  const datasets = chunk.map((r, i) => {
    const data: Record<string, unknown> = {};
    keys.forEach((key, c) => {
      // Una columna que no es de texto con alguna celda de otro tipo se queda como texto en toda la columna.
      let v = convertCell(r[c] ?? '', opts.delimiter, opts.asText);
      if (types[c] === 'texto' && typeof v !== 'string') v = r[c] ?? '';
      if (!setPath(data, key, v)) { data[key] = v; conflicts.add(key); }
    });
    const named = opts.nameColumn >= 0 ? String(r[opts.nameColumn] ?? '').trim() : '';
    return { name: named || `Fila ${opts.offset + i + 1}`, data };
  });
  if (conflicts.size) warnings.push(`La clave ${[...conflicts][0]} choca con otra: se usa tal cual, sin crear un objeto.`);
  return { keys, types, total: body.length, datasets, preview: body.slice(0, 5), warnings, error: null };
}

/** Trozos de `CSV_MAX_ROWS` en que se parte un archivo con más filas: `[{ offset: 0, label: 'Las 500 primeras' }, …]`. */
export function csvChunks(total: number, size = CSV_MAX_ROWS): { offset: number; label: string }[] {
  const out: { offset: number; label: string }[] = [];
  for (let o = 0; o < total; o += size) out.push({ offset: o, label: o === 0 ? `Las ${size} primeras` : `Las filas ${o + 1} a ${Math.min(total, o + size)}` });
  return out;
}
