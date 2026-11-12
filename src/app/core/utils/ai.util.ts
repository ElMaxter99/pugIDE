/**
 * Asistente de IA (P-30 a P-34): lo que no depende de Angular ni de la CLI. Qué archivos se ofrecen para enviar, la
 * forma de los datos, el texto exacto de la petición, la lectura de las propuestas y su aplicación.
 * El asistente solo existe en la app de escritorio y en local; la web publicada no lo usa.
 */

export type AiProvider = 'claude' | 'copilot';
export type AiTask = 'data' | 'fix';

export interface AiSettings {
  /** Proveedor que el diálogo propone primero. */
  provider: AiProvider;
  /** Modelo por defecto de cada CLI (lo que se pasa a `--model`). */
  models: Record<AiProvider, string>;
  /** Tope de tokens de salida por petición: se corta si lo supera. */
  maxOutputTokens: number;
  /** Pedir confirmación si la entrada estimada pasa de esto. */
  confirmAboveTokens: number;
  /** Apuntar cada petición en el Registro. */
  log: boolean;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'claude',
  models: { claude: 'sonnet', copilot: 'claude-sonnet-5.5' },
  maxOutputTokens: 8000,
  confirmAboveTokens: 20000,
  log: true,
};

export const PROVIDER_LABEL: Record<AiProvider, string> = { claude: 'Claude Code', copilot: 'GitHub Copilot' };

/** Modelos que se ofrecen en la lista; «Otro…» deja escribir cualquier nombre que la CLI acepte. */
export const MODEL_OPTIONS: Record<AiProvider, { id: string; label: string }[]> = {
  claude: [
    { id: 'sonnet', label: 'Sonnet · rápido y económico' },
    { id: 'haiku', label: 'Haiku · el más rápido' },
    { id: 'opus', label: 'Opus · el más capaz' },
    { id: 'fable', label: 'Fable · el más potente (el más caro)' },
  ],
  copilot: [
    { id: 'claude-sonnet-5.5', label: 'claude-sonnet-5.5' },
    { id: 'auto', label: 'auto · lo elige Copilot' },
    { id: 'gpt-5.2', label: 'gpt-5.2' },
    { id: 'claude-opus-5.5', label: 'claude-opus-5.5' },
  ],
};

/** Igual que en la CLI (desktop/src/ai-cli.cjs): sin nada que un shell pueda leer. */
export const AI_MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

export function normalizeAiSettings(raw: unknown): AiSettings {
  const s = raw && typeof raw === 'object' ? (raw as Partial<AiSettings>) : {};
  const model = (p: AiProvider): string => {
    const m = (s.models as Partial<Record<AiProvider, unknown>> | undefined)?.[p];
    return typeof m === 'string' && AI_MODEL_RE.test(m) ? m : DEFAULT_AI_SETTINGS.models[p];
  };
  const int = (v: unknown, def: number, min: number, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : def);
  return {
    provider: s.provider === 'copilot' ? 'copilot' : 'claude',
    models: { claude: model('claude'), copilot: model('copilot') },
    maxOutputTokens: int(s.maxOutputTokens, DEFAULT_AI_SETTINGS.maxOutputTokens, 256, 128000),
    confirmAboveTokens: int(s.confirmAboveTokens, DEFAULT_AI_SETTINGS.confirmAboveTokens, 1000, 1_000_000),
    log: s.log !== false,
  };
}

/** Aproximación de tokens (≈ 3,5 caracteres por token en código y JSON). La cifra real la da la CLI al enviar. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function formatTokens(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1).replace('.', ',')} k` : n.toLocaleString('es-ES');
}

export function formatContextKb(chars: number): string {
  return `${(chars / 1024).toFixed(1).replace('.', ',')} KB`;
}

/** Un elemento que se puede enviar: un archivo, la forma de los datos, los valores, los textos o el error. */
export interface AiContextItem {
  id: string;
  kind: 'template' | 'shape' | 'data' | 'translations' | 'error';
  label: string;
  /** Ruta del archivo, si es uno. */
  path?: string;
  content: string;
  checked: boolean;
}

/** Archivos que alcanza la plantilla de entrada con `include` y `extends` (resueltos como Pug: relativos o desde la raíz). */
export function reachableTemplates(files: ReadonlyMap<string, string>, entryPath: string): string[] {
  const seen = new Set<string>();
  const resolve = (from: string, ref: string): string | null => {
    let target = ref.trim().replace(/^['"]|['"]$/g, '');
    if (!target) return null;
    const base = from.slice(0, from.lastIndexOf('/') + 1);
    target = target.startsWith('/') ? target : base + target;
    const parts: string[] = [];
    for (const seg of target.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    const path = '/' + parts.join('/');
    for (const candidate of [path, `${path}.pug`, `${path}.jade`]) if (files.has(candidate)) return candidate;
    return null;
  };
  const visit = (path: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    const code = files.get(path) ?? '';
    for (const m of code.matchAll(/^\s*(?:include(?::[\w-]+)?|extends)\s+(\S+)/gm)) {
      const target = resolve(path, m[1]);
      if (target && /\.(pug|jade)$/i.test(target)) visit(target);
    }
  };
  if (files.has(entryPath)) visit(entryPath);
  return [...seen];
}

/** Nombres de los mixins que define un archivo (`mixin tarjeta(item)` -> `tarjeta`). */
export function mixinNames(code: string): string[] {
  return [...code.matchAll(/^\s*mixin\s+([\w-]+)/gm)].map((m) => m[1]);
}

/** La forma de los datos: mismas claves, con el tipo en lugar del valor (los arrays, con un solo ejemplo). */
export function dataShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [dataShape(value[0])] : [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, dataShape(v)]));
  if (value === null) return 'null';
  return typeof value === 'number' ? 'número' : typeof value === 'boolean' ? 'booleano' : 'texto';
}

const TRANSLATIONS_KEY = 'translations';

export interface AiContextInput {
  task: AiTask;
  files: ReadonlyMap<string, string>;
  entryPath: string;
  data: Record<string, unknown>;
  datasetName: string;
  error?: { message: string; path?: string; line?: number; snippet?: string } | null;
}

/** Lo que se ofrece para enviar, marcado por defecto lo justo: las plantillas implicadas, la forma de los datos y el error. */
export function buildContextItems(input: AiContextInput): AiContextItem[] {
  const items: AiContextItem[] = [];
  for (const path of reachableTemplates(input.files, input.entryPath)) {
    const code = input.files.get(path) ?? '';
    const mixins = mixinNames(code);
    items.push({ id: `file:${path}`, kind: 'template', path, label: `${path.slice(1)}${mixins.length ? `  (mixin ${mixins.join(', ')})` : ''}`, content: code, checked: true });
  }
  const { [TRANSLATIONS_KEY]: translations, ...data } = input.data;
  items.push({ id: 'shape', kind: 'shape', label: 'Forma de los datos (claves y tipos)', content: JSON.stringify(dataShape(data), null, 2), checked: true });
  items.push({ id: 'data', kind: 'data', label: `Valores actuales de «${input.datasetName}»`, content: JSON.stringify(data, null, 2), checked: input.task === 'fix' });
  if (translations && typeof translations === 'object' && Object.keys(translations).length) {
    items.push({ id: 'translations', kind: 'translations', label: 'Textos de traducción', content: JSON.stringify(translations, null, 2), checked: false });
  }
  if (input.error) {
    const where = input.error.path ? ` (${input.error.path}${input.error.line ? `:${input.error.line}` : ''})` : '';
    items.push({ id: 'error', kind: 'error', label: `Error: ${input.error.message}`.slice(0, 90), content: `${input.error.message}${where}${input.error.snippet ? `\n${input.error.snippet}` : ''}`, checked: true });
  }
  return items;
}

const RESPONSE_FORMAT = `Responde SOLO con un bloque \`\`\`json que contenga un objeto con esta forma (sin texto fuera del bloque):
{
  "summary": "lo que has visto, en una frase",
  "proposals": [
    {
      "title": "título corto",
      "explanation": "por qué, citando archivo:línea cuando puedas",
      "data": { ...los datos completos propuestos... },
      "edits": [ { "path": "/ruta/archivo.pug", "find": "texto exacto que existe una sola vez", "replace": "texto nuevo" } ]
    }
  ]
}`;

/** El texto exacto que recibe la CLI. Todo en español; lo que no esté marcado no va. */
export function buildPrompt(task: AiTask, items: AiContextItem[], instructions: string): string {
  const picked = items.filter((i) => i.checked);
  const parts: string[] = [
    'Eres el asistente de PugIDE, un editor de plantillas Pug. No tienes herramientas: trabaja solo con lo que hay en este mensaje.',
  ];
  if (task === 'data') {
    parts.push('Tarea: propón datos de ejemplo (JSON) para que las plantillas de abajo se vean completas y sin errores.',
      'Respeta las claves y tipos que usan las plantillas y sus mixins. Si una plantilla lee un elemento por posición (p. ej. lista[1].nombre) o recorre una lista, incluye elementos suficientes (al menos 3 en las listas). Usa datos ficticios realistas en español, nunca lorem ipsum. No incluyas la clave "translations".',
      'Da 1 o 2 propuestas; cada una lleva "data" con el objeto completo y "edits" vacío.');
  } else {
    parts.push('Tarea: explica la causa del error de abajo y propón cómo arreglarlo.',
      'Da 1 o 2 propuestas. Si se arregla en los datos, pon "data" con el objeto completo y "edits" vacío. Si se arregla en una plantilla, deja "data" fuera y pon "edits" con cambios mínimos y exactos (el "find" debe existir una sola vez en ese archivo).');
  }
  if (instructions.trim()) parts.push(`Indicaciones de la persona: ${instructions.trim()}`);
  parts.push(RESPONSE_FORMAT);
  for (const item of picked) {
    const title = item.kind === 'template' ? `Archivo ${item.path}` : item.label;
    const lang = item.kind === 'template' ? 'pug' : item.kind === 'error' ? 'text' : 'json';
    parts.push(`### ${title}\n\`\`\`${lang}\n${item.content}\n\`\`\``);
  }
  return parts.join('\n\n');
}

export interface AiEdit { path: string; find: string; replace: string }
export interface AiProposal { title: string; explanation: string; data?: Record<string, unknown>; edits: AiEdit[] }
export interface AiResponse { summary: string; proposals: AiProposal[] }

/** Saca el JSON de la respuesta (el bloque ```json, o el primer objeto) y lo valida. */
export function parseAiResponse(text: string): { ok: true; value: AiResponse } | { ok: false; reason: string } {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  let raw = fenced ? fenced[1] : text;
  if (!fenced) {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return { ok: false, reason: 'La respuesta no trae un JSON.' };
    raw = raw.slice(start, end + 1);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch (e) { return { ok: false, reason: `La respuesta no es un JSON válido: ${(e as Error).message}` }; }
  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(obj['proposals']) ? obj['proposals'] : [];
  const proposals: AiProposal[] = [];
  for (const p of list) {
    if (!p || typeof p !== 'object') continue;
    const r = p as Record<string, unknown>;
    const data = r['data'] && typeof r['data'] === 'object' && !Array.isArray(r['data']) ? (r['data'] as Record<string, unknown>) : undefined;
    const edits = (Array.isArray(r['edits']) ? r['edits'] : [])
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .filter((e) => typeof e['path'] === 'string' && typeof e['find'] === 'string' && typeof e['replace'] === 'string' && (e['find'] as string).length > 0)
      .map((e) => ({ path: (e['path'] as string).startsWith('/') ? (e['path'] as string) : `/${e['path']}`, find: e['find'] as string, replace: e['replace'] as string }));
    if (!data && !edits.length) continue;
    proposals.push({ title: typeof r['title'] === 'string' && r['title'] ? r['title'] : `Propuesta ${proposals.length + 1}`, explanation: typeof r['explanation'] === 'string' ? r['explanation'] : '', data, edits });
  }
  if (!proposals.length) return { ok: false, reason: 'La respuesta no trae ninguna propuesta que se pueda aplicar.' };
  return { ok: true, value: { summary: typeof obj['summary'] === 'string' ? obj['summary'] : '', proposals } };
}

/** Aplica los cambios de una propuesta a una copia de los archivos. Falla si un «find» no está o está más de una vez. */
export function applyEdits(files: ReadonlyMap<string, string>, edits: AiEdit[]): { ok: true; changed: Map<string, string> } | { ok: false; reason: string } {
  const changed = new Map<string, string>();
  for (const e of edits) {
    const current = changed.get(e.path) ?? files.get(e.path);
    if (current === undefined) return { ok: false, reason: `No existe ${e.path}.` };
    const first = current.indexOf(e.find);
    if (first < 0) return { ok: false, reason: `En ${e.path} no está el texto a cambiar.` };
    if (current.indexOf(e.find, first + 1) >= 0) return { ok: false, reason: `En ${e.path} el texto a cambiar aparece más de una vez.` };
    changed.set(e.path, current.slice(0, first) + e.replace + current.slice(first + e.find.length));
  }
  return { ok: true, changed };
}

/** Diferencias línea a línea para enseñar (simple: común al principio y al final; el medio, quitado y añadido). */
export function lineDiff(before: string, after: string): { sign: ' ' | '-' | '+'; text: string }[] {
  const a = before.split('\n');
  const b = after.split('\n');
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length - 1;
  let endB = b.length - 1;
  while (endA >= start && endB >= start && a[endA] === b[endB]) { endA--; endB--; }
  const ctx = 2;
  const out: { sign: ' ' | '-' | '+'; text: string }[] = [];
  for (let i = Math.max(0, start - ctx); i < start; i++) out.push({ sign: ' ', text: a[i] });
  for (let i = start; i <= endA; i++) out.push({ sign: '-', text: a[i] });
  for (let i = start; i <= endB; i++) out.push({ sign: '+', text: b[i] });
  for (let i = endA + 1; i <= Math.min(a.length - 1, endA + ctx); i++) out.push({ sign: ' ', text: a[i] });
  return out;
}

/** Texto de la línea del Registro de una petición. */
export function usageLine(p: { provider: AiProvider; model: string; input: number; output: number; ms: number; note?: string }): string {
  return `${PROVIDER_LABEL[p.provider]} · ${p.model} · ${formatTokens(p.input)} entrada · ${formatTokens(p.output)} salida · ${Math.max(1, Math.round(p.ms / 1000))} s${p.note ? ` · ${p.note}` : ''}`;
}

/**
 * La orden que se lanza, para enseñarla tal cual («Ver la orden exacta»). Igual que `describeCommand` de
 * desktop/src/ai-cli.cjs (una prueba unitaria comprueba que coinciden).
 */
export function describeCliCommand(provider: AiProvider, model: string): string {
  const args = provider === 'claude'
    ? ['-p', '--output-format', 'stream-json', '--verbose', '--include-partial-messages', '--model', model, '--tools', '', '--safe-mode', '--strict-mcp-config', '--no-session-persistence']
    : ['--output-format', 'json', '--model', model, '--available-tools', '--disable-builtin-mcps', '--no-custom-instructions', '--no-ask-user', '--no-auto-update'];
  const quote = (a: string): string => (a === '' ? '""' : /[\s"]/.test(a) ? JSON.stringify(a) : a);
  return [provider, ...args].map(quote).join(' ') + ' < mensaje.txt';
}
