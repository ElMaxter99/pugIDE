import { collectMixins, documentSymbols, formatPug, hoverInfoAt } from '../../core/utils/pug-editor.util';
import type { DiagnosticFix, PugVariable } from '../../core/models/index';
import type { Diagnostic } from '../../core/utils/diagnostics.util';

/** Lo que los proveedores de lenguaje necesitan del editor, sin depender de Angular. */
export interface PugLanguageDeps {
  /** Modelo de Monaco que está en el editor (el completado solo actúa sobre él). */
  activeModel: () => unknown;
  /** Archivos del proyecto con lo que se está escribiendo. */
  files: () => Map<string, string>;
  /** Variables detectadas por el parser. */
  variables: () => PugVariable[];
  sortAttributes: () => boolean;
  /** Problemas de la última compilación (los arreglos rápidos salen de los que traen `fix`). */
  diagnostics: () => Diagnostic[];
  applyFix: (fix: DiagnosticFix) => void;
}

const APPLY_FIX_COMMAND = 'pugide.applyFix';

/**
 * Registra en Monaco los servicios de Pug: completado de variables y mixins (`+`), hover de mixins e
 * includes, "Ir a símbolo" (Ctrl+Shift+O) y formateo de documento (Shift+Alt+F). Devuelve lo que hay que liberar.
 */
export function registerPugLanguage(monaco: any, deps: PugLanguageDeps): { dispose(): void }[] {
  // Variables detectadas y mixins del proyecto.
  const completion = monaco.languages.registerCompletionItemProvider('pug', {
    triggerCharacters: ['+'],
    provideCompletionItems: (model: any, position: any) => {
      if (model !== deps.activeModel()) return { suggestions: [] };
      const word = model.getWordUntilPosition(position);
      const before: string = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
      const afterPlus = /\+[\w-]*$/.test(before);
      const wordRange = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, position.column);
      const plusRange = new monaco.Range(
        position.lineNumber, word.startColumn - (before.endsWith('+') ? 1 : 0), position.lineNumber, position.column,
      );
      const kind = monaco.languages.CompletionItemKind;
      const suggestions: any[] = [];

      const seen = new Set<string>();
      for (const m of collectMixins(deps.files())) {
        if (seen.has(m.name)) continue;
        seen.add(m.name);
        const params = m.args ? m.args.split(',').map((a) => a.trim()).filter(Boolean) : [];
        const snippet = params.length
          ? `${m.name}(${params.map((p, i) => '${' + (i + 1) + ':' + p.replace(/[}$\\]/g, '') + '}').join(', ')})`
          : m.name;
        suggestions.push({
          label: '+' + m.name,
          filterText: '+' + m.name,
          kind: kind.Function,
          detail: `mixin ${m.name}(${m.args}) - ${m.path}`,
          insertText: '+' + snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: plusRange,
          sortText: '0' + m.name,
        });
      }
      if (afterPlus) return { suggestions };

      for (const v of deps.variables()) {
        suggestions.push({
          label: v.path,
          kind: kind.Variable,
          detail: `${v.type} (detected variable)`,
          insertText: v.path,
          range: wordRange,
          sortText: '1' + v.path,
        });
      }
      return { suggestions };
    },
  });

  // Hover de mixins e includes, y outline con los mixins y bloques del archivo.
  const hover = monaco.languages.registerHoverProvider('pug', {
    provideHover: (model: any, position: any) => {
      const info = hoverInfoAt(deps.files(), model.uri.path, model.getLineContent(position.lineNumber), position.column);
      if (!info) return null;
      return {
        range: new monaco.Range(position.lineNumber, info.range[0], position.lineNumber, info.range[1]),
        contents: [{ value: info.markdown }],
      };
    },
  });
  const symbols = monaco.languages.registerDocumentSymbolProvider('pug', {
    provideDocumentSymbols: (model: any) =>
      documentSymbols(model.getValue()).map((sym) => {
        const range = new monaco.Range(sym.line, 1, sym.line, model.getLineMaxColumn(sym.line));
        return {
          name: sym.name,
          detail: sym.kind === 'mixin' ? 'mixin' : 'block',
          kind: sym.kind === 'mixin' ? monaco.languages.SymbolKind.Function : monaco.languages.SymbolKind.Namespace,
          tags: [],
          range,
          selectionRange: range,
        };
      }),
  });

  // Formateo de documento; ver formatPug para sus límites.
  const formatting = monaco.languages.registerDocumentFormattingEditProvider('pug', {
    provideDocumentFormattingEdits: (model: any, options: any) => {
      const text = model.getValue();
      const unit = options?.insertSpaces === false ? '\t' : ' '.repeat(options?.tabSize ?? 2);
      const formatted = formatPug(text, unit, { sortAttributes: deps.sortAttributes() });
      if (formatted === text) return [];
      return [{ range: model.getFullModelRange(), text: formatted }];
    },
  });

  // Arreglos rápidos (bombilla / Ctrl+.) para los problemas que PugIDE sabe resolver.
  const command = monaco.editor.registerCommand(APPLY_FIX_COMMAND, (_accessor: unknown, fix: DiagnosticFix) => deps.applyFix(fix));
  const quickFix = monaco.languages.registerCodeActionProvider('pug', {
    provideCodeActions: (model: any, range: any) => {
      const actions = deps.diagnostics()
        .filter((d) => d.fix && d.path === model.uri.path && d.line >= range.startLineNumber && d.line <= range.endLineNumber)
        .map((d) => ({
          title: d.fix!.label,
          kind: 'quickfix',
          isPreferred: true,
          command: { id: APPLY_FIX_COMMAND, title: d.fix!.label, arguments: [d.fix] },
        }));
      return { actions, dispose: () => undefined };
    },
  }, { providedCodeActionKinds: ['quickfix'] });

  return [completion, hover, symbols, formatting, command, quickFix];
}
