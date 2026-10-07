/**
 * Generadores de datos de ejemplo realistas, deterministas (PRNG con semilla) y 100% locales.
 * Eligen el valor por el nombre del campo (`email`, `precio`, `fecha`...) y, si no hay pista,
 * por el tipo del valor actual. No hay llamadas de red: las imagenes son SVG embebidos (`data:`).
 */

export type MockLocale = 'es' | 'en';
export type Rng = () => number;
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Hash de cadena a entero de 32 bits (FNV-1a). */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG mulberry32: misma semilla, misma secuencia. */
export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)];
const int = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const pad = (n: number, len = 2): string => String(n).padStart(len, '0');

/** Texto generico de relleno (lorem ipsum): igual en es/en; los campos con significado (nombre, email...) siguen usando datos reales. */
const LOREM_WORDS = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'dolore', 'magna', 'aliqua', 'enim', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'commodo', 'consequat'];
const LOREM_TITLES = ['Lorem ipsum dolor sit amet', 'Consectetur adipiscing elit', 'Sed do eiusmod tempor', 'Ut labore et dolore magna', 'Quis nostrud exercitation', 'Duis aute irure dolor'];
const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Curabitur pretium tincidunt lacus, nulla gravida orci a odio.',
];

interface Lexicon {
  first: string[];
  last: string[];
  cities: string[];
  countries: string[];
  streets: string[];
  companies: string[];
  words: string[];
  titles: string[];
  domains: string[];
  statuses: string[];
  phone: (rng: Rng) => string;
}

const ES: Lexicon = {
  first: ['Lucía', 'Mateo', 'Sofía', 'Hugo', 'Valeria', 'Daniel', 'Carmen', 'Pablo', 'Elena', 'Javier', 'Marta', 'Alejandro'],
  last: ['García', 'Martínez', 'López', 'Sánchez', 'Fernández', 'Gómez', 'Ruiz', 'Díaz', 'Moreno', 'Navarro', 'Torres', 'Romero'],
  cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Zaragoza', 'Málaga', 'Granada'],
  countries: ['España', 'México', 'Argentina', 'Colombia', 'Chile', 'Perú', 'Portugal'],
  streets: ['Calle Mayor', 'Avenida de la Constitución', 'Calle del Sol', 'Paseo de Gracia', 'Calle Alcalá', 'Plaza España'],
  companies: ['Soluciones Aurora', 'Grupo Mediterráneo', 'Tecnologías Norte', 'Industrias Levante', 'Estudio Brújula'],
  words: LOREM_WORDS,
  titles: LOREM_TITLES,
  domains: ['ejemplo.es', 'correo.com', 'empresa.es', 'mail.org'],
  statuses: ['activo', 'pendiente', 'completado', 'en revisión'],
  phone: (r) => `+34 6${int(r, 0, 9)}${int(r, 0, 9)} ${pad(int(r, 0, 99))} ${pad(int(r, 0, 99))} ${pad(int(r, 0, 99))}`,
};

const EN: Lexicon = {
  first: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Grace', 'Henry', 'Chloe', 'Jack'],
  last: ['Smith', 'Johnson', 'Brown', 'Taylor', 'Miller', 'Davis', 'Wilson', 'Clark', 'Walker', 'Hall', 'Young', 'King'],
  cities: ['London', 'New York', 'Chicago', 'Toronto', 'Sydney', 'Dublin', 'Seattle', 'Boston'],
  countries: ['United Kingdom', 'United States', 'Canada', 'Australia', 'Ireland', 'New Zealand'],
  streets: ['Main Street', 'Oak Avenue', 'Park Lane', 'High Street', 'Maple Road', 'Station Road'],
  companies: ['Northwind Labs', 'Bright Harbor', 'Acme Works', 'Summit Group', 'Blue Orchard'],
  words: LOREM_WORDS,
  titles: LOREM_TITLES,
  domains: ['example.com', 'mail.com', 'company.org', 'inbox.net'],
  statuses: ['active', 'pending', 'completed', 'in review'],
  phone: (r) => `+1 (${int(r, 200, 989)}) ${int(r, 200, 989)}-${pad(int(r, 0, 9999), 4)}`,
};

const LEX: Record<MockLocale, Lexicon> = { es: ES, en: EN };

const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const slug = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

export function mockSentence(rng: Rng, _locale: MockLocale, words?: number): string {
  if (words === undefined) return pick(rng, LOREM_SENTENCES);
  const out: string[] = [];
  for (let i = 0; i < words; i++) out.push(LOREM_WORDS[(Math.floor(rng() * LOREM_WORDS.length) + i) % LOREM_WORDS.length]);
  return capitalize(out.join(' ')) + '.';
}

export function mockParagraph(rng: Rng, locale: MockLocale, sentences = int(rng, 2, 3)): string {
  return Array.from({ length: sentences }, () => mockSentence(rng, locale)).join(' ');
}

export function mockDate(rng: Rng, withTime = false): string {
  const y = int(rng, 2022, 2026);
  const m = int(rng, 1, 12);
  const d = int(rng, 1, 28);
  const date = `${y}-${pad(m)}-${pad(d)}`;
  return withTime ? `${date}T${pad(int(rng, 0, 23))}:${pad(int(rng, 0, 59))}:${pad(int(rng, 0, 59))}.000Z` : date;
}

export function mockUuid(rng: Rng): string {
  const hex = (n: number): string => Array.from({ length: n }, () => int(rng, 0, 15).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${pick(rng, ['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
}

const PALETTE = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

/** Imagen de ejemplo como SVG embebido (sin red): rectangulo de color con una etiqueta. */
export function mockImage(rng: Rng, width = 400, height = 300, label = ''): string {
  const bg = pick(rng, PALETTE);
  const text = label.replace(/[<>&"]/g, '') || `${width}x${height}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="${Math.max(12, Math.round(Math.min(width, height) / 8))}" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** Valores para `format` de JSON Schema. */
export function mockFormat(format: string, rng: Rng, locale: MockLocale): string | undefined {
  const lex = LEX[locale];
  switch (format) {
    case 'date': return mockDate(rng);
    case 'date-time': return mockDate(rng, true);
    case 'time': return `${pad(int(rng, 0, 23))}:${pad(int(rng, 0, 59))}:${pad(int(rng, 0, 59))}`;
    case 'email': case 'idn-email': return `${slug(pick(rng, lex.first))}.${slug(pick(rng, lex.last))}@${pick(rng, lex.domains)}`;
    case 'uri': case 'url': case 'iri': return `https://www.${pick(rng, lex.domains)}/${pick(rng, lex.words)}`;
    case 'uuid': return mockUuid(rng);
    case 'hostname': return `www.${pick(rng, lex.domains)}`;
    case 'ipv4': return `${int(rng, 11, 223)}.${int(rng, 0, 255)}.${int(rng, 0, 255)}.${int(rng, 1, 254)}`;
    case 'ipv6': return `2001:db8::${int(rng, 1, 9999).toString(16)}`;
    case 'phone': case 'tel': return lex.phone(rng);
    case 'color': return pick(rng, PALETTE);
    case 'password': return 'x'.repeat(8);
    default: return undefined;
  }
}

/** Divide un nombre de campo (camelCase, snake_case, kebab-case) en palabras minusculas sin acentos. */
export function nameTokens(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export interface MockContext {
  rng: Rng;
  locale: MockLocale;
  /** Tipo del valor actual (`string`, `number`, `boolean`) cuando el nombre no da pistas. */
  hint?: 'string' | 'number' | 'boolean';
  /** Ruta completa, p. ej. `translations.HOME.TITLE`; ayuda con claves de traduccion. */
  path?: string;
}

type Rule = { match: (t: string[], joined: string) => boolean; gen: (c: MockContext, t: string[]) => unknown };
const has = (...words: string[]) => (t: string[]): boolean => words.some((w) => t.includes(w));
const last = (t: string[]): string => t[t.length - 1] ?? '';

const RULES: Rule[] = [
  { match: has('email', 'mail', 'correo'), gen: (c) => mockFormat('email', c.rng, c.locale) },
  { match: has('phone', 'tel', 'telefono', 'movil', 'mobile', 'celular', 'fax'), gen: (c) => LEX[c.locale].phone(c.rng) },
  { match: has('uuid', 'guid'), gen: (c) => mockUuid(c.rng) },
  { match: (t) => has('image', 'img', 'imagen', 'foto', 'photo', 'picture', 'avatar', 'logo', 'thumbnail', 'thumb', 'banner', 'cover', 'portada', 'icon', 'icono')(t) && !has('alt', 'caption', 'title', 'titulo')(t),
    gen: (c, t) => {
      const small = has('avatar', 'logo', 'icon', 'icono', 'thumb', 'thumbnail')(t);
      return small ? mockImage(c.rng, 128, 128, has('avatar')(t) ? 'avatar' : '') : mockImage(c.rng, 640, 360);
    } },
  { match: has('url', 'link', 'href', 'website', 'web', 'sitio', 'enlace'), gen: (c) => mockFormat('uri', c.rng, c.locale) },
  { match: has('username', 'login', 'handle', 'nickname', 'nick'), gen: (c) => `${slug(pick(c.rng, LEX[c.locale].first))}${int(c.rng, 1, 99)}` },
  { match: (t) => has('lastname', 'surname', 'apellido', 'apellidos')(t) || (has('last', 'family')(t) && has('name')(t)), gen: (c) => pick(c.rng, LEX[c.locale].last) },
  { match: (t) => (has('firstname', 'given', 'nombre')(t) && !has('empresa', 'company', 'producto', 'product', 'archivo', 'file')(t)) || (has('first')(t) && has('name')(t)),
    gen: (c) => pick(c.rng, LEX[c.locale].first) },
  { match: (t) => has('fullname', 'autor', 'author', 'cliente', 'customer', 'persona', 'person', 'contacto', 'contact', 'owner', 'propietario')(t) || (t.length === 1 && t[0] === 'name'),
    gen: (c) => `${pick(c.rng, LEX[c.locale].first)} ${pick(c.rng, LEX[c.locale].last)}` },
  { match: has('company', 'empresa', 'organization', 'organizacion', 'compania', 'brand', 'marca'), gen: (c) => pick(c.rng, LEX[c.locale].companies) },
  { match: has('city', 'ciudad', 'localidad', 'town', 'poblacion'), gen: (c) => pick(c.rng, LEX[c.locale].cities) },
  { match: has('country', 'pais'), gen: (c) => pick(c.rng, LEX[c.locale].countries) },
  { match: has('zip', 'postal', 'cp', 'zipcode', 'codigopostal'), gen: (c) => pad(int(c.rng, 1000, 52999), 5) },
  { match: has('address', 'direccion', 'domicilio', 'street', 'calle'), gen: (c) => `${pick(c.rng, LEX[c.locale].streets)}, ${int(c.rng, 1, 120)}` },
  { match: has('color', 'colour'), gen: (c) => pick(c.rng, PALETTE) },
  { match: has('uuid'), gen: (c) => mockUuid(c.rng) },
  { match: has('year', 'ano', 'anio'), gen: (c) => int(c.rng, 1990, 2026) },
  { match: (t) => has('datetime', 'timestamp')(t), gen: (c) => mockDate(c.rng, true) },
  { match: has('date', 'fecha', 'dia', 'created', 'updated', 'creado', 'actualizado', 'birthday', 'nacimiento', 'deadline', 'vencimiento', 'emision'), gen: (c) => mockDate(c.rng) },
  { match: has('time', 'hora'), gen: (c) => mockFormat('time', c.rng, c.locale) },
  { match: has('price', 'precio', 'amount', 'importe', 'total', 'subtotal', 'cost', 'coste', 'costo', 'tarifa', 'fee', 'salary', 'salario', 'sueldo', 'balance', 'saldo', 'tax', 'iva', 'impuesto'),
    gen: (c) => Math.round((c.rng() * 480 + 5) * 100) / 100 },
  { match: has('discount', 'descuento', 'percent', 'porcentaje', 'progress', 'progreso'), gen: (c) => int(c.rng, 5, 90) },
  { match: has('rating', 'puntuacion', 'score', 'valoracion', 'stars', 'estrellas'), gen: (c) => Math.round((c.rng() * 2 + 3) * 10) / 10 },
  { match: has('age', 'edad'), gen: (c) => int(c.rng, 18, 75) },
  { match: has('quantity', 'cantidad', 'qty', 'count', 'cuenta', 'stock', 'units', 'unidades', 'num', 'numero', 'number', 'items'), gen: (c) => int(c.rng, 1, 12) },
  { match: (t) => last(t) === 'id' || last(t) === 'codigo' || last(t) === 'code' || last(t) === 'sku' || last(t) === 'ref', gen: (c, t) => (last(t) === 'id' ? int(c.rng, 1, 9999) : `${pick(c.rng, ['AB', 'XK', 'MQ', 'ZR'])}-${int(c.rng, 1000, 9999)}`) },
  { match: has('status', 'estado', 'state'), gen: (c) => pick(c.rng, LEX[c.locale].statuses) },
  { match: has('title', 'titulo', 'heading', 'headline', 'subject', 'asunto', 'encabezado'), gen: (c) => pick(c.rng, LEX[c.locale].titles) },
  { match: has('description', 'descripcion', 'desc', 'summary', 'resumen', 'bio', 'about', 'body', 'cuerpo', 'content', 'contenido', 'text', 'texto', 'message', 'mensaje', 'comment', 'comentario', 'notes', 'nota', 'notas', 'review', 'resena', 'subtitle', 'subtitulo', 'lead'),
    gen: (c, t) => (has('summary', 'resumen', 'subtitle', 'subtitulo', 'lead', 'bio', 'message', 'mensaje', 'comment', 'comentario')(t) ? mockSentence(c.rng, c.locale) : mockParagraph(c.rng, c.locale)) },
  { match: has('label', 'etiqueta', 'tag', 'category', 'categoria', 'tipo', 'type', 'role', 'rol', 'slug'), gen: (c) => pick(c.rng, LEX[c.locale].words) },
  { match: has('name', 'nombre'), gen: (c) => capitalize(pick(c.rng, LEX[c.locale].words)) + ' ' + pick(c.rng, LEX[c.locale].words) },
];

/** Genera un valor realista para un campo segun su nombre y, si no hay pista, el tipo. */
export function mockValue(name: string, ctx: MockContext): unknown {
  const tokens = nameTokens(name);
  const joined = tokens.join('');
  const inTranslations = (ctx.path ?? '').split('.')[0] === 'translations';
  if (ctx.hint === 'boolean') return ctx.rng() < 0.6;
  for (const rule of RULES) {
    if (!rule.match(tokens, joined)) continue;
    const value = rule.gen(ctx, tokens);
    if (value === undefined) continue;
    // Una pista numerica no debe convertirse en texto (p. ej. `count` con tipo string si se pidio numero).
    if (ctx.hint === 'number' && typeof value !== 'number') break;
    if (inTranslations && typeof value !== 'string') return String(value);
    return value;
  }
  if (ctx.hint === 'number') return int(ctx.rng, 1, 100);
  if (inTranslations) return mockSentence(ctx.rng, ctx.locale, int(ctx.rng, 2, 5)).replace(/\.$/, '');
  return capitalize(mockSentence(ctx.rng, ctx.locale, int(ctx.rng, 2, 4)).replace(/\.$/, ''));
}

export interface MockOptions {
  seed?: number | string;
  locale?: MockLocale;
  /** `all`: sustituye todas las hojas; `empty`: solo las vacias ('' / null / 0 / false por defecto). */
  mode?: 'all' | 'empty';
  /** Si se indica, los arrays de objetos/valores se amplian a este numero de elementos. */
  arrayLength?: number;
}

function isPlaceholder(v: unknown): boolean {
  return v === '' || v === null || v === undefined || v === 0 || v === false;
}

/** Valor que `mockifyData` da a una hoja de texto vacia en `path` (para reconocer mocks automaticos sin editar). */
export function mockLeaf(key: string, path: string, opts: Pick<MockOptions, 'seed' | 'locale'> = {}): unknown {
  return mockValue(key, { rng: createRng(`${opts.seed ?? 1}:${path}`), locale: opts.locale ?? 'es', hint: 'string', path });
}

/**
 * Devuelve una copia de `data` con las hojas sustituidas por valores de ejemplo. Cada hoja usa un PRNG
 * derivado de (semilla, ruta), asi anadir campos no cambia los demas y la misma semilla es reproducible.
 */
export function mockifyData(data: Obj, opts: MockOptions = {}): Obj {
  const seed = opts.seed ?? 1;
  const locale = opts.locale ?? 'es';
  const mode = opts.mode ?? 'all';
  const walk = (value: unknown, key: string, path: string): unknown => {
    if (Array.isArray(value)) {
      let items = value;
      const target = opts.arrayLength;
      if (target && items.length > 0 && items.length < target) {
        items = [...items];
        while (items.length < target) items.push(structuredClone(items[0]));
      }
      return items.map((it, i) => walk(it, key, `${path}.${i}`));
    }
    if (isObj(value)) {
      const out: Obj = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, k, path ? `${path}.${k}` : k);
      return out;
    }
    if (mode === 'empty' && !isPlaceholder(value)) return value;
    const hint = typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : typeof value === 'string' ? 'string' : undefined;
    // `translations.HOME.TITLE`: el nombre util es el ultimo segmento, pero el path marca el contexto.
    return mockValue(key, { rng: createRng(`${seed}:${path}`), locale, hint, path });
  };
  const out: Obj = {};
  for (const [k, v] of Object.entries(data)) out[k] = walk(v, k, k);
  return out;
}

/** Variante de "datos vacios": hojas a null y arrays vacios, para probar el template con datos ausentes. */
export function errorifyData(data: Obj): Obj {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return [];
    if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return null;
  };
  return walk(data) as Obj;
}
