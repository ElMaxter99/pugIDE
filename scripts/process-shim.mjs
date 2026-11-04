// `process` mínimo para los bundles de Pug (el compilador lee `process.versions.node`, `process.env`, `process.cwd()`…).
// esbuild lo inyecta como variable local del bundle (`inject`) en lugar de colgarlo de `globalThis`: un `process`
// global con `versions.node` hace que Monaco se crea en Node/Electron y deje de pegar con Ctrl+V.
export const process = {
  browser: true,
  env: {},
  version: '',
  versions: { node: '0.0.0' },
  platform: 'browser',
  nextTick: (fn) => setTimeout(fn, 0),
  cwd: () => '/',
  argv: [],
  stdout: { write() {} },
  stderr: { write() {} },
};
