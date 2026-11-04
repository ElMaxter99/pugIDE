// pugide-runtime source-hash: c364d4284f3adf75
"use strict";
(() => {
  // src/app/core/utils/diagnostics.util.ts
  var HEADER_RE = /^(\/[^\n]*?):(\d+)(?::(\d+))?(?:\n|$)/;
  function splitPugMessage(raw) {
    const text = (raw ?? "").replace(/\r\n/g, "\n");
    const m = HEADER_RE.exec(text);
    if (!m) return { message: text.trim() };
    const rest = text.slice(m[0].length);
    const cut = rest.indexOf("\n\n");
    const message = (cut >= 0 ? rest.slice(cut + 2) : rest).trim();
    return {
      path: m[1],
      line: Number(m[2]),
      column: m[3] ? Number(m[3]) : void 0,
      message: message || text.trim()
    };
  }
  var AVAILABLE_FILTERS = [":cdata", ":markdown", ":markdown-it", ":marked"];
  function explainUnknownFilter(message) {
    const m = /unknown filter "(:?[\w-]+)"/.exec(message);
    if (!m) return message;
    return `${message}

El filtro ${m[1]} no est\xE1 disponible en PugIDE (corre en el navegador, sin paquetes de Node). Disponibles: ${AVAILABLE_FILTERS.join(", ")}.`;
  }
  var MIXIN_DEF_RE = /^[ \t]*mixin[ \t]+([\w-]+)/gm;
  function collectMixinDefinitions(files) {
    const out = /* @__PURE__ */ new Map();
    for (const [path, content] of files) {
      if (!/\.(pug|jade)$/i.test(path)) continue;
      for (const m of content.matchAll(MIXIN_DEF_RE)) {
        const list = out.get(m[1]) ?? [];
        if (!list.includes(path)) list.push(path);
        out.set(m[1], list);
      }
    }
    return out;
  }
  var baseName = (path) => path.split("/").pop() ?? path;
  function explainRuntimeError(message, files) {
    const mixin = /pug_mixins(?:\.([\w$]+)|\["([^"]+)"\]) is not a function/.exec(message);
    if (mixin) {
      const name = mixin[1] ?? mixin[2];
      const defs = files ? collectMixinDefinitions(files) : /* @__PURE__ */ new Map();
      const where = defs.get(name);
      if (where?.length) {
        const list = where.map((p) => `\xAB${baseName(p)}\xBB`).join(", ");
        return `Se llama a +${name}, pero el archivo que lo define (${list}) no llega a incluirse. A\xF1ade \`include ${baseName(where[0])}\` antes de usarlo (la ruta es relativa al archivo que lo incluye).`;
      }
      const known = [...defs.keys()];
      const near = known.find((k) => k.toLowerCase() === name.toLowerCase());
      if (near) return `Se llama a +${name}, pero el mixin se llama \xAB${near}\xBB: Pug distingue may\xFAsculas y min\xFAsculas.`;
      const have = known.length ? ` Mixins definidos en el proyecto: ${known.map((k) => "+" + k).join(", ")}.` : " El proyecto no define ning\xFAn mixin.";
      return `Se llama a +${name}, pero ning\xFAn archivo define \`mixin ${name}(...)\`.${have} Def\xEDnelo (por ejemplo en mixins.pug) y a\xF1ade el \`include\`.`;
    }
    const undef = /^(\w+) is not defined$/m.exec(message);
    if (undef) {
      return `La variable \xAB${undef[1]}\xBB no existe: a\xF1\xE1dela en el editor de datos o decl\xE1rala con \`- var ${undef[1]} = ...\` antes de usarla.`;
    }
    return void 0;
  }

  // src/app/core/utils/helpers.util.ts
  var HELPERS_RE = /^\/helpers(?:\.js|\/.+\.js)$/i;
  function isHelperPath(path) {
    return HELPERS_RE.test(path);
  }
  function helperPaths(files) {
    return [...files].filter(isHelperPath).sort();
  }
  var memo = null;
  function loadHelpers(files) {
    const paths = helperPaths(files.keys());
    if (!paths.length) return { helpers: {}, errors: [] };
    const key = paths.map((p) => `${p}\0${files.get(p) ?? ""}`).join("");
    if (memo?.key === key) return memo.value;
    const helpers = {};
    const errors = [];
    for (const path of paths) {
      const module = { exports: {} };
      try {
        new Function("module", "exports", files.get(path) ?? "")(module, module.exports);
      } catch (err) {
        errors.push({ path, message: describeHelperError(err), line: errorLine(err) });
        continue;
      }
      const out = module.exports;
      if (out !== null && typeof out === "object") Object.assign(helpers, out);
      else errors.push({ path, message: "Exporta un objeto: module.exports = { nombre: funci\xF3n }", line: 1 });
    }
    const value = { helpers, errors };
    memo = { key, value };
    return value;
  }
  function describeHelperError(err) {
    const e = err;
    return `${e.name ?? "Error"}: ${e.message ?? String(err)}`;
  }
  function errorLine(err) {
    const m = /<anonymous>:(\d+):\d+/.exec(err.stack ?? "");
    return m ? Math.max(1, Number(m[1]) - 2) : 1;
  }

  // src/app/core/utils/i18n.util.ts
  var TRANSLATIONS_KEY = "translations";
  var TRANSLATE_FNS = /* @__PURE__ */ new Set(["t", "$t", "__", "_t", "translate", "trans", "gettext", "instant"]);
  var isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  function createTranslator(data) {
    const root = data[TRANSLATIONS_KEY];
    const lookup = (key) => {
      if (!isObj(root)) return key;
      const flat = root[key];
      if (typeof flat === "string" && flat) return flat;
      let cur = root;
      for (const p of key.split(".")) {
        if (isObj(cur) && p in cur) cur = cur[p];
        else return key;
      }
      return typeof cur === "string" && cur ? cur : key;
    };
    return (key, params) => {
      const out = lookup(String(key ?? ""));
      if (!isObj(params)) return out;
      return out.replace(/\{\{?\s*([\w$]+)\s*\}?\}/g, (m, name) => name in params ? String(params[name]) : m);
    };
  }

  // src/app/core/utils/markdown.util.ts
  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function safeUrl(raw) {
    const url = raw.trim().replace(/&amp;/g, "&");
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1]?.toLowerCase();
    if (!scheme) return escapeHtml(url);
    if (["http", "https", "mailto", "tel"].includes(scheme)) return escapeHtml(url);
    if (scheme === "data" && /^data:image\//i.test(url)) return escapeHtml(url);
    return "#";
  }
  function renderInline(src) {
    const codes = [];
    let out = escapeHtml(src).replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _t, code) => {
      codes.push(`<code>${code.trim()}</code>`);
      return `\uE000${codes.length - 1}\uE000`;
    });
    out = out.replace(
      /!\[([^\]]*)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      (_m, alt, url, title) => `<img src="${safeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ""}>`
    ).replace(
      /\[([^\]]+)\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;([^&]*)&quot;)?\s*\)/g,
      (_m, text, url, title) => `<a href="${safeUrl(url)}"${title ? ` title="${title}"` : ""}>${text}</a>`
    ).replace(/&lt;((?:https?:\/\/|mailto:)[^\s&]+)&gt;/g, (_m, url) => `<a href="${safeUrl(url)}">${url}</a>`).replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>").replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, "$1<em>$2</em>").replace(/(^|[^\w_])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>").replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>").replace(/ {2,}\n/g, "<br>\n");
    return out.replace(/\uE000(\d+)\uE000/g, (_m, i) => codes[Number(i)]);
  }
  var FENCE = /^\s*(```+|~~~+)\s*([\w+-]*)\s*$/;
  var HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
  var HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
  var LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var QUOTE = /^\s{0,3}>\s?(.*)$/;
  var isBlank = (l) => l.trim() === "";
  function startsBlock(line) {
    return FENCE.test(line) || HEADING.test(line) || HR.test(line) || QUOTE.test(line) || LIST_ITEM.test(line);
  }
  function renderMarkdown(source) {
    const lines = source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
    return renderBlocks(dedent(lines));
  }
  function dedent(lines) {
    const indents = lines.filter((l) => !isBlank(l)).map((l) => /^ */.exec(l)[0].length);
    const min = indents.length ? Math.min(...indents) : 0;
    return lines.map((l) => l.slice(Math.min(min, /^ */.exec(l)[0].length)));
  }
  function renderBlocks(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (isBlank(line)) {
        i++;
        continue;
      }
      const fence = FENCE.exec(line);
      if (fence) {
        const body = [];
        i++;
        while (i < lines.length && !new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[i])) body.push(lines[i++]);
        i++;
        const cls = fence[2] ? ` class="language-${escapeHtml(fence[2])}"` : "";
        out.push(`<pre><code${cls}>${escapeHtml(body.join("\n"))}</code></pre>`);
        continue;
      }
      const heading = HEADING.exec(line);
      if (heading) {
        out.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
        i++;
        continue;
      }
      if (HR.test(line)) {
        out.push("<hr>");
        i++;
        continue;
      }
      if (QUOTE.test(line)) {
        const quote = [];
        while (i < lines.length && (QUOTE.test(lines[i]) || !isBlank(lines[i]) && quote.length && !startsBlock(lines[i]))) {
          quote.push(QUOTE.exec(lines[i])?.[1] ?? lines[i]);
          i++;
        }
        out.push(`<blockquote>${renderBlocks(quote)}</blockquote>`);
        continue;
      }
      const item = LIST_ITEM.exec(line);
      if (item) {
        const { html, next } = renderList(lines, i);
        out.push(html);
        i = next;
        continue;
      }
      const para = [line];
      i++;
      while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i])) para.push(lines[i++]);
      out.push(`<p>${renderInline(para.join("\n"))}</p>`);
    }
    return out.join("\n");
  }
  function renderList(lines, start) {
    const first = LIST_ITEM.exec(lines[start]);
    const baseIndent = first[1].length;
    const ordered = /\d/.test(first[2]);
    const items = [];
    let i = start;
    while (i < lines.length) {
      const m = LIST_ITEM.exec(lines[i]);
      if (m && m[1].length === baseIndent && /\d/.test(m[2]) === ordered) {
        items.push([m[3]]);
        i++;
      } else if (m && m[1].length > baseIndent && items.length) {
        items[items.length - 1].push(lines[i].slice(baseIndent + 2));
        i++;
      } else if (isBlank(lines[i]) && i + 1 < lines.length && (LIST_ITEM.test(lines[i + 1]) && LIST_ITEM.exec(lines[i + 1])[1].length >= baseIndent)) {
        i++;
      } else if (!isBlank(lines[i]) && items.length && /^\s+\S/.test(lines[i]) && !startsBlock(lines[i])) {
        items[items.length - 1].push(lines[i].trim());
        i++;
      } else {
        break;
      }
    }
    const tag = ordered ? "ol" : "ul";
    const startAttr = ordered && Number.parseInt(first[2], 10) > 1 ? ` start="${Number.parseInt(first[2], 10)}"` : "";
    const body = items.map((item) => {
      const html = renderBlocks(item);
      const tight = /^<p>((?:(?!<\/p>)[\s\S])*)<\/p>(\n<(?:ul|ol)[\s\S]*)?$/.exec(html);
      return `<li>${tight ? tight[1] + (tight[2] ?? "") : html}</li>`;
    }).join("\n");
    return { html: `<${tag}${startAttr}>
${body}
</${tag}>`, next: i };
  }

  // src/app/core/utils/pug-vfs.util.ts
  function dirname(path) {
    const i = path.lastIndexOf("/");
    return i <= 0 ? "/" : path.slice(0, i);
  }
  function normalize(path) {
    const out = [];
    for (const part of path.split("/")) {
      if (part === "" || part === ".") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    return "/" + out.join("/");
  }
  function resolveVirtualPath(target, from, files) {
    const base = target.startsWith("/") ? target : normalize(dirname(from ?? "/") + "/" + target);
    const candidates = [base, base + ".pug", base + "/index.pug"];
    for (const c of candidates) {
      if (files.has(c)) return c;
    }
    return null;
  }
  var DIRECTIVE_RE = /^(\s*)(include|extends)(\s+)(['"]?)([^'"\s]+)\4(\s*)$/;
  function normalizeIncludes(code, from, files) {
    if (!code.includes("include") && !code.includes("extends")) return code;
    return code.split("\n").map((line) => {
      const m = line.match(DIRECTIVE_RE);
      if (!m || /\.[A-Za-z0-9]+$/.test(m[5])) return line;
      const found = resolveVirtualPath(m[5], from, files);
      if (!found || !found.endsWith(".pug")) return line;
      return `${m[1]}${m[2]}${m[3]}${m[5]}.pug${m[6]}`;
    }).join("\n");
  }
  function createPugFilePlugin(files) {
    return {
      resolve(filename, source) {
        const found = resolveVirtualPath(filename, source, files);
        if (!found) {
          throw new Error(`Cannot find "${filename}"${source ? ` (included from ${source})` : ""}`);
        }
        return found;
      },
      read(filename) {
        const content = files.get(filename);
        if (content === void 0) throw new Error(`Cannot read "${filename}"`);
        return normalizeIncludes(content, filename, files);
      }
    };
  }

  // src/app/core/render/render-core.ts
  function renderPug(bundle, req) {
    const errors = [];
    const files = req.files ? new Map(req.files) : void 0;
    let html = "";
    try {
      const opts = {
        pretty: true,
        doctype: "html",
        self: false,
        // Los filtros que Pug resuelve con paquetes de Node no existen en el navegador.
        filters: {
          cdata: (text) => `<![CDATA[${text}]]>`,
          // Nombres con los que se suele usar Markdown en Pug; todos usan el mismo subconjunto (ver markdown.util).
          markdown: renderMarkdown,
          "markdown-it": renderMarkdown,
          marked: renderMarkdown
        }
      };
      if (req.entryPath) {
        opts["filename"] = req.entryPath;
        opts["basedir"] = "/";
      }
      if (files) opts["plugins"] = [createPugFilePlugin(files)];
      const source = files && req.entryPath ? normalizeIncludes(req.code, req.entryPath, files) : req.code;
      const compiledFn = bundle.compile(source, opts);
      const loaded = files ? loadHelpers(files) : { helpers: {}, errors: [] };
      for (const e of loaded.errors) {
        errors.push({ message: e.message, source: "javascript", path: e.path, line: e.line, severity: "error" });
      }
      const locals = { ...req.data, ...loaded.helpers };
      const translate = createTranslator(req.data);
      const identity = (...args) => args[0] ?? "";
      for (const name of req.functionStubs) {
        const parts = name.split(".");
        const last = parts.pop();
        const fn = TRANSLATE_FNS.has(last) ? translate : identity;
        let holder = locals;
        for (const part of parts) {
          const cur = holder[part];
          holder[part] = { ...cur !== null && typeof cur === "object" ? cur : {} };
          holder = holder[part];
        }
        if (typeof holder[last] !== "function") holder[last] = fn;
      }
      html = compiledFn(locals);
    } catch (err) {
      const error = err;
      const split = splitPugMessage(error.message ?? "Compilation error");
      const known = (p) => p && files?.has(p) ? p : void 0;
      const fromPug = split.path !== void 0 && split.line !== void 0;
      errors.push({
        message: explainUnknownFilter(split.message),
        source: "pug",
        path: fromPug ? known(split.path) : known(error.filename),
        line: fromPug ? split.line : error.line,
        column: fromPug ? split.column : error.column,
        hint: explainRuntimeError(split.message, files),
        severity: "error"
      });
    }
    return { html, errors };
  }

  // src/app/core/render/sandbox-entry.ts
  self.onmessage = (e) => {
    const d = e.data;
    if (!d || d.source !== "pugide-render-req" || typeof d.id !== "number" || !d.req) return;
    const bundle = self.pugBundle;
    const res = bundle ? renderPug(bundle, d.req) : { html: "", errors: [{ message: "Pug compiler not loaded", source: "pug", severity: "error" }] };
    self.postMessage({ source: "pugide-render-res", id: d.id, res });
  };
  self.postMessage({ source: "pugide-render-ready" });
})();
