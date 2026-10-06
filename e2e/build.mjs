import { build } from 'esbuild';
await build({
  entryPoints: ['e2e/entry.ts'], outfile: 'e2e/.build/services.mjs', bundle: true, format: 'esm', platform: 'node',
  external: ['@angular/*', 'rxjs'], tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } },
  logLevel: 'error',
});
