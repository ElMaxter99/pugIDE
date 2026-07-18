declare module 'pug-lexer' {
  interface Options {
    filename?: string;
    plugins?: unknown[];
  }
  function lex(src: string, options?: Options): unknown[];
  export default lex;
}

declare module 'pug-parser' {
  interface Options {
    filename?: string;
    plugins?: unknown[];
    tokenize?: boolean;
  }
  function parse(tokens: unknown[], options?: Options): unknown;
  export default parse;
}

declare module 'pug-walk' {
  function walk(
    node: unknown,
    handlers: {
      before?: (node: unknown, parent: unknown) => void;
      after?: (node: unknown, parent: unknown) => void;
      replace?: (node: unknown) => void;
    }
  ): void;
  export default walk;
}

declare module 'pug' {
  interface Options {
    filename?: string;
    doctype?: string;
    pretty?: boolean;
    self?: boolean;
    plugins?: unknown[];
    globals?: string[];
    filters?: Record<string, (text: string, options?: Record<string, unknown>) => string>;
  }
  function compile(src: string, options?: Options): (locals?: Record<string, unknown>) => string;
  function compileClient(src: string, options?: Options): string;
  export { compile, compileClient };
}

declare module 'monaco-editor' {
  const monaco: any;
  export default monaco;
}
