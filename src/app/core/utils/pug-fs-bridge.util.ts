/**
 * Wires the pug-browser.js bundle's `fs` shim (see `src/assets/fs-shim.cjs`,
 * which already delegates to `globalThis.__pugFs` for exactly this purpose)
 * to the app's in-memory virtual file map. Once wired, Pug's own `pug-load`
 * resolves `include`/`extends` by reading through this bridge instead of a
 * real filesystem — giving native, correct `extends`/`block` semantics
 * instead of a hand-rolled text splice.
 */
export function wireVirtualFs(files: Map<string, string>): void {
  (globalThis as { __pugFs?: unknown }).__pugFs = {
    readFileSync(path: string): string {
      const content = files.get(path);
      if (content === undefined) {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`) as Error & { code: string };
        err.code = 'ENOENT';
        throw err;
      }
      return content;
    },
    existsSync(path: string): boolean {
      return files.has(path);
    },
  };
}
