// End-to-end harness: runs the real Orchestrator/Parser/Compiler services in Node
// (real pug + parser bundles, real Angular signals) without a browser.
import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.self = globalThis;
for (const f of ['parser-browser.js', 'pug-browser.js']) {
  vm.runInThisContext(readFileSync(path.join(root, 'src/assets', f), 'utf8'));
}

export async function makeApp(files, openPath) {
  const { OrchestratorService } = await import('./.build/services.mjs');
  const S = await import('./.build/services.mjs');
  const { createEnvironmentInjector, Injector: Inj } = await import('@angular/core');
  const root = Inj.create({ providers: [] });
  const names = ['EditorState','ParserState','PreviewState','DataState','TerminalState','PersistenceService','AssetState','AssetStorageService','PreferencesState','ProjectState','PugParserService','PugCompilerService','ScssCompilerService','OrchestratorService'];
  const env = createEnvironmentInjector(names.map((n) => ({ provide: S[n], useFactory: () => (n === 'PreferencesState' ? new S[n](env.get(S.PersistenceService)) : new S[n]()) })), root);
  const app = {};
  runInInjectionContext(env, () => { for (const n of names) app[n] = env.get(S[n]); });
  app.orch = app.OrchestratorService;
  const map = new Map(Object.entries(files));
  app.EditorState.files.set(map);
  app.ProjectState.setProject('t', map);
  const name = openPath.split('/').pop();
  app.EditorState.openFile(openPath, name, 'pug', map.get(openPath));
  return app;
}
