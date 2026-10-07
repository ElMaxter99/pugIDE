// Empaqueta los modulos bajo prueba con esbuild (mismo enfoque que e2e/build.mjs).
import { build } from 'esbuild';
await build({
  entryPoints: ['test/unit/entry.ts'], outfile: 'test/unit/.build/units.mjs', bundle: true, format: 'esm', platform: 'node',
  external: ['@angular/*', 'rxjs'], tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } },
  logLevel: 'error',
});
