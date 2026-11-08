// Empaqueta `sass` (dart-sass compilado a JS) en `node_modules/.pugide/sass-csp.js`, sin ninguna llamada a `new Function`.
// Va dentro de `node_modules` a propósito: es código generado de terceros y así el compilador no avisa de sus rarezas.
//
//   node scripts/bundle-sass.mjs          genera el fichero si falta o no coincide con la versión instalada de sass
//   node scripts/bundle-sass.mjs --check  solo comprueba (código de salida 1 si falta o está desfasado)
//
// Por qué: dart-sass crea con `new self.Function("parámetros", "cuerpo")` unas pocas funciones auxiliares (el `typeof`, el
// `throw`, la clase `Exception`…). La CSP de la app no admite `'unsafe-eval'` (objetivo de seguridad de la 0.6.0), así que
// el navegador bloqueaba esas llamadas, `compileString` fallaba y la app caía en silencio al subconjunto `scss-lite`: el
// SCSS con `@mixin`, `@use` o funciones salía sin estilos. Cada una de esas llamadas lleva literales como argumentos, así
// que se reescribe a la función literal equivalente (`(function(parámetros){cuerpo})`) al empaquetar. Es mecánico y
// correcto por construcción; si una versión futura de sass cambia la forma de esas llamadas, este script **falla** en vez
// de dejar pasar una llamada sin reescribir. `tsconfig.json` redirige `import('sass')` a este fichero (`paths`).
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sassDir = resolve(root, 'node_modules/sass');
const OUT_DIR = resolve(root, 'node_modules/.pugide');
const OUT = resolve(OUT_DIR, 'sass-csp.js');
const OUT_TYPES = resolve(OUT_DIR, 'sass-csp.d.ts');
const check = process.argv.includes('--check');

if (!existsSync(resolve(sassDir, 'package.json'))) {
  console.error('Falta node_modules/sass (npm ci).');
  process.exit(1);
}

const version = JSON.parse(readFileSync(resolve(sassDir, 'package.json'), 'utf8')).version;
const dart = readFileSync(resolve(sassDir, 'sass.dart.js'), 'utf8');
const fingerprint = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).update(dart).digest('hex').slice(0, 16);
const HEADER = `// GENERADO por scripts/bundle-sass.mjs (sass ${version}, fuentes ${fingerprint}): no editar ni versionar.\n`;

if (existsSync(OUT) && existsSync(OUT_TYPES) && readFileSync(OUT, 'utf8').startsWith(HEADER)) {
  if (!check) console.log(`sass-csp.js al día (sass ${version}).`);
  process.exit(0);
}
if (check) {
  console.error(`node_modules/.pugide/sass-csp.js falta o no corresponde a sass ${version}: ejecuta "npm run bundle:sass".`);
  process.exit(1);
}

const STRING = String.raw`("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;
const CALL = new RegExp(String.raw`new self\.Function\(\s*${STRING}\s*,\s*${STRING}\s*\)`, 'g');
// Los argumentos son literales de cadena del propio sass: se evalúan solo como literales (el patrón no admite otra cosa).
const literal = (src) => (0, eval)(src);

/** `new self.Function("a", "return a")` → `(function(a){\nreturn a\n})`. Falla si queda alguna llamada sin reescribir. */
export function rewriteFunctionCalls(source) {
  const total = (source.match(/new self\.Function\(/g) ?? []).length;
  let rewritten = 0;
  const out = source.replace(CALL, (_m, params, body) => {
    rewritten++;
    return `(function(${literal(params)}){\n${literal(body)}\n})`;
  });
  if (rewritten !== total) {
    throw new Error(`sass cambió la forma de new self.Function(...): ${total - rewritten} de ${total} llamadas no se pueden reescribir. Revisa scripts/bundle-sass.mjs.`);
  }
  // Nada que la CSP bloquee debe quedar en el código empaquetado.
  const left = out.match(/(?<![\w$.])eval\(|new\s+(?:self\.|globalThis\.|window\.)?Function\(|(?<![\w$])Function\(\s*["'`]/g);
  if (left) throw new Error(`Quedan usos de eval o Function sin reescribir en sass: ${[...new Set(left)].join(', ')}`);
  return { out, rewritten };
}

let count = 0;
const result = await build({
  entryPoints: [resolve(sassDir, 'sass.default.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
  logLevel: 'error',
  legalComments: 'none',
  plugins: [{
    name: 'sass-sin-eval',
    setup(b) {
      b.onLoad({ filter: /sass\.dart\.js$/ }, (args) => {
        const { out, rewritten } = rewriteFunctionCalls(readFileSync(args.path, 'utf8'));
        count = rewritten;
        return { contents: out, loader: 'js' };
      });
    },
  }],
});

let code = result.outputFiles[0].text;
const left = code.match(/(?<![\w$.])eval\(|new\s+(?:self\.|globalThis\.|window\.)?Function\(/g);
if (left) throw new Error(`El paquete final aún contiene ${[...new Set(left)].join(', ')}`);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, HEADER + code);
// Tipos: los de sass, por ruta explícita (`sass` está redirigido a este módulo en tsconfig.json, así que no se puede importar por nombre).
writeFileSync(OUT_TYPES, "export * from '../sass/types/index';\n");
console.log(`node_modules/.pugide/sass-csp.js generado (sass ${version}, ${count} llamadas a Function reescritas, ${(code.length / 1e6).toFixed(1)} MB).`);
