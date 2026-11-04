// pugide-runtime source-hash: a4612f30fef7f158
"use strict";
(() => {
  // src/app/core/utils/page-rules.util.ts
  var PX_PER_UNIT = { px: 1, pt: 96 / 72, pc: 16, in: 96, mm: 96 / 25.4, cm: 96 / 2.54, q: 96 / 101.6 };
  function stripComments(css) {
    let out = "";
    let quote = "";
    for (let i = 0; i < css.length; i++) {
      const c = css[i];
      if (quote) {
        out += c;
        if (c === "\\") out += css[++i] ?? "";
        else if (c === quote) quote = "";
      } else if (c === '"' || c === "'") {
        quote = c;
        out += c;
      } else if (c === "/" && css[i + 1] === "*") {
        const end = css.indexOf("*/", i + 2);
        i = end === -1 ? css.length : end + 1;
      } else out += c;
    }
    return out;
  }
  function blankStrings(css) {
    return stripComments(css).replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  }
  var USES_STRING = /(?:^|[^\w-])(?:string-set\s*:|string\s*\()/i;
  var USES_ELEMENT = /(?:^|[^\w-])(?:element|running)\s*\(/i;
  function findUnsupportedPagedFeatures(css) {
    const text = blankStrings(css);
    const out = [];
    if (USES_STRING.test(text)) out.push("string");
    if (USES_ELEMENT.test(text)) out.push("element");
    return out;
  }

  // src/app/core/utils/paginate.util.ts
  var MARK = "data-pg-orig";
  var SPACER = "data-pg-spacer";
  var HTML_MARK = "data-pg-html";
  var EPS = 0.5;
  var MAX_REPEATED_HEADER = 0.25;
  var FORCED = /* @__PURE__ */ new Set(["page", "always", "left", "right", "recto", "verso"]);
  var ATOMIC_TAGS = /* @__PURE__ */ new Set(["IMG", "SVG", "FIGURE", "CANVAS", "VIDEO", "PRE", "BLOCKQUOTE"]);
  function pageGeometry(pageHeight, margin) {
    return {
      pageHeight,
      marginTop: margin?.top ?? 0,
      marginRight: margin?.right ?? 0,
      marginBottom: margin?.bottom ?? 0,
      marginLeft: margin?.left ?? 0
    };
  }
  var hasVerticalMargins = (g) => g.marginTop + g.marginBottom > 0;
  var contentHeight = (g) => g.pageHeight - g.marginTop - g.marginBottom;
  var pageOf = (g, y) => Math.max(0, Math.floor(y / g.pageHeight));
  var pageTop = (g, k) => k * g.pageHeight + g.marginTop;
  var pageBottom = (g, k) => (k + 1) * g.pageHeight - g.marginBottom;
  function nextPageStart(g, y) {
    const k = pageOf(g, y);
    if (Math.abs(y - pageTop(g, k)) < EPS) return null;
    const next = y < pageTop(g, k) ? pageTop(g, k) : pageTop(g, k + 1);
    return next - y < EPS ? null : next;
  }
  function pushTarget(g, y, height) {
    if (g.pageHeight <= 0 || height <= 0) return null;
    const k = pageOf(g, y);
    if (y < pageTop(g, k) - EPS) return pageTop(g, k);
    if (height < contentHeight(g) && y + height > pageBottom(g, k) + EPS) return pageTop(g, k + 1);
    return null;
  }
  function resetPagination(doc) {
    doc.querySelectorAll(`[${MARK}]`).forEach((el) => {
      const orig = el.getAttribute(MARK) ?? "";
      if (orig) el.style.setProperty("margin-top", orig);
      else el.style.removeProperty("margin-top");
      el.removeAttribute(MARK);
    });
    const parents = /* @__PURE__ */ new Set();
    doc.querySelectorAll(`[${SPACER}]`).forEach((sp) => {
      if (sp.parentNode) parents.add(sp.parentNode);
      sp.remove();
    });
    parents.forEach((p) => p.normalize());
    const root = doc.documentElement;
    if (root.hasAttribute(HTML_MARK)) {
      const orig = JSON.parse(root.getAttribute(HTML_MARK) || "{}");
      for (const prop of ["padding", "box-sizing"]) {
        if (orig[prop]) root.style.setProperty(prop, orig[prop]);
        else root.style.removeProperty(prop);
      }
      root.removeAttribute(HTML_MARK);
    }
  }
  function applyRootPadding(doc, g) {
    const root = doc.documentElement;
    if (g.marginTop + g.marginRight + g.marginBottom + g.marginLeft <= 0) return;
    root.setAttribute(HTML_MARK, JSON.stringify({
      padding: root.style.getPropertyValue("padding"),
      "box-sizing": root.style.getPropertyValue("box-sizing")
    }));
    root.style.setProperty("box-sizing", "border-box");
    root.style.setProperty("padding", `${g.marginTop}px ${g.marginRight}px ${g.marginBottom}px ${g.marginLeft}px`, "important");
  }
  function documentContentHeight(doc, g) {
    const body = doc.body;
    const win = doc.defaultView;
    if (!body) return 0;
    if (!win || g.marginTop + g.marginBottom <= 0) return Math.max(body.scrollHeight, body.offsetHeight);
    const bottom = body.getBoundingClientRect().bottom + win.scrollY + (parseFloat(win.getComputedStyle(body).marginBottom) || 0);
    return bottom + g.marginBottom;
  }
  function isFirstContent(el, body) {
    for (let n = el; n && n !== body; n = n.parentElement) {
      if (n.previousElementSibling) return false;
    }
    return true;
  }
  function isLeafTextBlock(el, win, cs) {
    if (!["block", "list-item", "flow-root"].includes(cs.display)) return false;
    if (!(el.textContent ?? "").trim()) return false;
    return Array.from(el.children).every((c) => c.tagName === "BR" || win.getComputedStyle(c).display.startsWith("inline"));
  }
  function collectText(el) {
    const doc = el.ownerDocument;
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.parentElement?.closest("script,style,[data-pg-spacer]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const runs = [];
    let total = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.length) continue;
      runs.push({ node: n, start: total });
      total += n.data.length;
    }
    return { runs, total };
  }
  function charRect(doc, runs, total, index) {
    const win = doc.defaultView;
    const range = doc.createRange();
    for (let i = index; i < total && i < index + 64; i++) {
      let r = runs.length - 1;
      while (r > 0 && runs[r].start > i) r--;
      const { node, start } = runs[r];
      const off = i - start;
      range.setStart(node, off);
      range.setEnd(node, Math.min(off + 1, node.data.length));
      const rect = Array.from(range.getClientRects()).find((x) => x.height > 0);
      if (rect) return { top: rect.top + win.scrollY, bottom: rect.bottom + win.scrollY, idx: i };
    }
    return null;
  }
  function insertSpacer(doc, runs, index, height) {
    let r = runs.length - 1;
    while (r > 0 && runs[r].start > index) r--;
    const { node, start } = runs[r];
    const off = index - start;
    const spacer = doc.createElement("span");
    spacer.setAttribute(SPACER, "");
    spacer.style.cssText = `display:block;height:${height}px;margin:0;padding:0;border:0;`;
    const target = off > 0 ? node.splitText(off) : node;
    target.parentNode?.insertBefore(spacer, target);
  }
  function linesToKeep(total, fit, orphans, widows) {
    if (total <= 0) return 0;
    if (fit >= total) return total;
    const o = Math.max(1, Math.floor(orphans));
    const w = Math.max(1, Math.floor(widows));
    if (fit < o) return 0;
    return total - fit < w ? Math.min(fit, Math.max(total - w, o)) : fit;
  }
  function measureLines(doc, el, lineHeight) {
    const win = doc.defaultView;
    const range = doc.createRange();
    const rects = [];
    for (const run of collectText(el).runs) {
      range.selectNodeContents(run.node);
      for (const r of Array.from(range.getClientRects())) if (r.height > 0) rects.push(r);
    }
    el.querySelectorAll("br").forEach((br) => {
      const r = br.getBoundingClientRect();
      if (r.height > 0 && !br.closest(`[${SPACER}]`)) rects.push(r);
    });
    rects.sort((a, b) => a.top + a.height / 2 - (b.top + b.height / 2));
    const step = lineHeight > 0 ? lineHeight : Math.min(...rects.map((r) => r.height));
    const lines = [];
    for (const r of rects) {
      const center = r.top + r.height / 2;
      const cur = lines[lines.length - 1];
      if (cur && center - cur.first <= step * 0.5) {
        cur.top = Math.min(cur.top, r.top);
        cur.bottom = Math.max(cur.bottom, r.bottom);
      } else lines.push({ top: r.top, bottom: r.bottom, center, first: center });
    }
    return lines.map((l) => {
      const center = l.center + win.scrollY;
      return lineHeight > 0 ? { top: center - lineHeight / 2, bottom: center + lineHeight / 2, center } : { top: l.top + win.scrollY, bottom: l.bottom + win.scrollY, center };
    });
  }
  function lineStartIndex(doc, runs, total, lines, line) {
    const threshold = (lines[line - 1].center + lines[line].center) / 2;
    let lo = 0;
    let hi = total - 1;
    while (lo < hi) {
      const mid = lo + hi >> 1;
      const rect = charRect(doc, runs, total, mid);
      if (rect && (rect.top + rect.bottom) / 2 > threshold) hi = mid;
      else lo = mid + 1;
    }
    return charRect(doc, runs, total, lo)?.idx ?? null;
  }
  function splitTextBlock(doc, el, g, push) {
    const win = doc.defaultView;
    const cs = win.getComputedStyle(el);
    const orphans = parseInt(cs.getPropertyValue("orphans"), 10) || 2;
    const widows = parseInt(cs.getPropertyValue("widows"), 10) || 2;
    const lineHeight = parseFloat(cs.lineHeight) || 0;
    const top = () => el.getBoundingClientRect().top + win.scrollY;
    let page = pageOf(g, top());
    let done = 0;
    for (let guard = 0; guard < 80; guard++) {
      const limit = pageBottom(g, page) + EPS;
      if (el.getBoundingClientRect().bottom + win.scrollY <= limit) return;
      const lines = measureLines(doc, el, lineHeight);
      const rest = lines.length - done;
      if (rest <= 0) return;
      let fit = 0;
      while (done + fit < lines.length && lines[done + fit].bottom <= limit) fit++;
      if (fit >= rest) return;
      const atTop = done === 0 ? top() <= pageTop(g, page) + 1.5 : lines[done].top <= pageTop(g, page) + 1.5;
      let keep = linesToKeep(rest, fit, orphans, widows);
      if (keep === 0) {
        if (done === 0 && !atTop) {
          push(el, pageTop(g, page + 1));
          page++;
          continue;
        }
        keep = Math.max(fit, 1);
      }
      if (keep >= rest) return;
      const { runs, total } = collectText(el);
      const idx = total ? lineStartIndex(doc, runs, total, lines, done + keep) : null;
      const height = pageTop(g, page + 1) - lines[done + keep].top;
      if (idx === null || height <= 0.01) return;
      insertSpacer(doc, runs, idx, height);
      done += keep;
      page++;
    }
  }
  function pushTableRow(doc, row, height) {
    const spacer = doc.createElement("tr");
    spacer.setAttribute(SPACER, "");
    const cell = doc.createElement("td");
    cell.colSpan = 1e3;
    cell.style.cssText = `height:${height}px;padding:0;border:0;background:none;`;
    spacer.appendChild(cell);
    row.parentNode?.insertBefore(spacer, row);
  }
  function repeatingHeader(win, row, g) {
    const parent = row.parentElement;
    if (!parent || parent.tagName === "THEAD" || parent.tagName === "TFOOT") return null;
    const table = row.closest("table");
    const head = table?.tHead;
    if (!table || !head || head.contains(row) || win.getComputedStyle(head).display !== "table-header-group") return null;
    const rows = Array.from(head.rows);
    if (!rows.length || head.getBoundingClientRect().height > contentHeight(g) * MAX_REPEATED_HEADER) return null;
    return { table, rows };
  }
  function inlineComputedStyle(win, src, dst) {
    const target = dst.style;
    if (target) {
      const cs = win.getComputedStyle(src);
      for (let i = 0; i < cs.length; i++) {
        const name = cs[i];
        target.setProperty(name, cs.getPropertyValue(name), cs.getPropertyPriority(name));
      }
    }
    for (let i = 0; i < src.children.length && i < dst.children.length; i++) inlineComputedStyle(win, src.children[i], dst.children[i]);
  }
  function insertHeaderCopy(win, row, header) {
    for (const h of header) {
      const copy = h.cloneNode(true);
      inlineComputedStyle(win, h, copy);
      copy.setAttribute(SPACER, "");
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      row.parentNode?.insertBefore(copy, row);
    }
  }
  function paginateDocument(doc, geometry2) {
    const g = typeof geometry2 === "number" ? pageGeometry(geometry2) : geometry2;
    const win = doc.defaultView;
    const body = doc.body;
    if (!win || !body || g.pageHeight <= 0) return;
    resetPagination(doc);
    applyRootPadding(doc, g);
    const gap = hasVerticalMargins(g);
    const forcedAfter = /* @__PURE__ */ new Set();
    const top = (el) => el.getBoundingClientRect().top + win.scrollY;
    const pushTo = (el, target) => {
      const cs = win.getComputedStyle(el);
      if (!el.hasAttribute(MARK)) el.setAttribute(MARK, el.style.getPropertyValue("margin-top"));
      let margin = (parseFloat(cs.marginTop) || 0) + (target - top(el));
      for (let i = 0; i < 4; i++) {
        el.style.setProperty("margin-top", `${Math.max(0, margin)}px`, "important");
        const diff = target - top(el);
        if (Math.abs(diff) < EPS) break;
        margin += diff;
      }
    };
    for (const el of Array.from(body.querySelectorAll("*"))) {
      if (el.hasAttribute(SPACER) || el.closest(`[${SPACER}]`)) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === "none" || cs.position === "absolute" || cs.position === "fixed") continue;
      if (cs.display === "table-row") {
        const header = repeatingHeader(win, el, g);
        let pushed = false;
        if (gap || header) {
          const r = el.getBoundingClientRect();
          const target = pushTarget(g, r.top + win.scrollY, r.height);
          if (target !== null) {
            pushTableRow(doc, el, target - (r.top + win.scrollY));
            pushed = true;
          }
        }
        if (header) {
          const y2 = el.getBoundingClientRect().top + win.scrollY;
          const k = pageOf(g, y2);
          const tableTop = header.table.getBoundingClientRect().top + win.scrollY;
          const startsPage = k > pageOf(g, tableTop) && Math.abs(y2 - pageTop(g, k)) < 1.5;
          if (pushed || startsPage) {
            insertHeaderCopy(win, el, header.rows);
            const r = el.getBoundingClientRect();
            const target = pushTarget(g, r.top + win.scrollY, r.height);
            if (target !== null) pushTableRow(doc, el, target - (r.top + win.scrollY));
          }
        }
        continue;
      }
      if (cs.display.startsWith("table") || cs.display === "inline") continue;
      if (FORCED.has(cs.breakAfter) || FORCED.has(cs.getPropertyValue("page-break-after"))) {
        const next = el.nextElementSibling;
        if (next) forcedAfter.add(next);
      }
      const forced = FORCED.has(cs.breakBefore) || FORCED.has(cs.getPropertyValue("page-break-before")) || forcedAfter.has(el);
      if (forced) {
        if (isFirstContent(el, body)) continue;
        const target = nextPageStart(g, top(el));
        if (target !== null) pushTo(el, target);
        continue;
      }
      const rect = el.getBoundingClientRect();
      const y = rect.top + win.scrollY;
      const avoid = cs.breakInside === "avoid" || cs.getPropertyValue("page-break-inside") === "avoid";
      if (avoid || ATOMIC_TAGS.has(el.tagName.toUpperCase())) {
        if (avoid || gap) {
          const target = pushTarget(g, y, rect.height);
          if (target !== null) pushTo(el, target);
        }
        continue;
      }
      const crosses = rect.bottom + win.scrollY > pageBottom(g, pageOf(g, y)) + EPS;
      if ((gap || crosses && !el.closest("td,th")) && isLeafTextBlock(el, win, cs)) {
        if (gap) {
          const target = pushTarget(g, y, 0.01);
          if (target !== null) pushTo(el, target);
        }
        splitTextBlock(doc, el, g, pushTo);
      }
    }
  }
  function isOrphanHeading(y, height, pageHeight, slack = 40, marginBottom = 0) {
    if (pageHeight <= 0 || height <= 0) return false;
    const bottom = y + height;
    const page = Math.floor((bottom - 0.5) / pageHeight);
    if (page !== Math.floor(y / pageHeight)) return false;
    const left = (page + 1) * pageHeight - marginBottom - bottom;
    return left < slack && left > -EPS;
  }
  var CUT_TAGS = /* @__PURE__ */ new Set(["IMG", "SVG", "FIGURE", "PRE", "BLOCKQUOTE", "CANVAS", "VIDEO"]);
  function selectorFor(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) return `${tag}#${el.id}`;
    const cls = Array.from(el.classList).find((c) => /^[A-Za-z_][\w-]*$/.test(c));
    return cls ? `${tag}.${cls}` : tag;
  }
  function findUnsupportedIssues(doc) {
    const css = Array.from(doc.querySelectorAll("style")).map((s) => s.textContent ?? "").join("\n");
    const inline = Array.from(doc.querySelectorAll('[style*="string"],[style*="running"],[style*="element"]')).map((e) => e.getAttribute("style") ?? "").join(";");
    return findUnsupportedPagedFeatures(`${css}
${inline}`).map((f) => ({ kind: "unsupported", page: 0, element: f === "string" ? "string()" : "element()", text: "" }));
  }
  function findPageBreakIssues(doc, geometry2) {
    const g = typeof geometry2 === "number" ? pageGeometry(geometry2) : geometry2;
    const win = doc.defaultView;
    const body = doc.body;
    if (!win || !body || g.pageHeight <= 0) return [];
    const issues2 = [...findUnsupportedIssues(doc)];
    for (const el of Array.from(body.querySelectorAll("*"))) {
      const tag = el.tagName.toUpperCase();
      const isHeading = /^H[1-6]$/.test(tag);
      if (!isHeading && !CUT_TAGS.has(tag)) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === "none" || cs.position === "fixed" || cs.position === "absolute") continue;
      const rect = el.getBoundingClientRect();
      const y = rect.top + win.scrollY;
      const text = (el.textContent ?? el.getAttribute("alt") ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const page = pageOf(g, y) + 1;
      if (isHeading) {
        if (isOrphanHeading(y, rect.height, g.pageHeight, 40, g.marginBottom)) issues2.push({ kind: "orphan-heading", page, element: tag.toLowerCase(), text, selector: selectorFor(el) });
      } else if (pushTarget(g, y, rect.height) !== null) {
        issues2.push({ kind: "cut", page, element: tag.toLowerCase(), text, selector: selectorFor(el) });
      }
    }
    return issues2;
  }

  // src/app/core/render/preview-entry.ts
  var pdf = false;
  var geometry = null;
  var paginatedHeight = -1;
  var issues = [];
  var post = (message) => window.parent.postMessage(message, "*");
  function measure() {
    if (!document.body || !geometry) return;
    post({ source: "pugide-layout-result", contentHeight: documentContentHeight(document, geometry), issues });
  }
  function reflow() {
    if (!document.body || !geometry) return;
    resetPagination(document);
    if (pdf) {
      paginateDocument(document, geometry);
      issues = findPageBreakIssues(document, geometry);
    } else {
      issues = [];
    }
    paginatedHeight = document.body.scrollHeight;
    measure();
  }
  function print(css) {
    let injected = null;
    if (css) {
      injected = document.createElement("style");
      injected.textContent = css;
      document.head.appendChild(injected);
    }
    resetPagination(document);
    window.addEventListener("afterprint", () => {
      injected?.remove();
      reflow();
    }, { once: true });
    window.focus();
    window.print();
  }
  var localUrls = /* @__PURE__ */ new Map();
  var stats = window.__pugideStats ?? (window.__pugideStats = { assetMessages: 0, docs: 0 });
  var retired = [];
  var observer = null;
  function setAssets(files) {
    stats.assetMessages++;
    const wanted = /* @__PURE__ */ new Set();
    for (const f of Array.isArray(files) ? files : []) {
      const url = f?.url;
      const blob = f?.blob;
      if (typeof url !== "string" || !url.startsWith("blob:") || !(blob instanceof Blob)) continue;
      wanted.add(url);
      if (!localUrls.has(url)) localUrls.set(url, URL.createObjectURL(blob));
    }
    for (const [url, local] of [...localUrls]) {
      if (!wanted.has(url)) {
        retired.push(local);
        localUrls.delete(url);
      }
    }
  }
  function mapUrls(html) {
    let out = html;
    for (const [from, to] of localUrls) if (out.includes(from)) out = out.split(from).join(to);
    return out;
  }
  function onMessage(e) {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (!d) return;
    if (d.source === "pugide-layout" && d.geometry) {
      pdf = !!d.pdf;
      geometry = d.geometry;
      reflow();
    } else if (d.source === "pugide-print") {
      print(typeof d.css === "string" ? d.css : null);
    } else if (d.source === "pugide-assets") {
      setAssets(d.files);
    } else if (d.source === "pugide-doc" && typeof d.html === "string") {
      writeDocument(d.html);
    }
  }
  function observeBody() {
    if (!document.body) return;
    observer ?? (observer = new ResizeObserver(() => {
      if (document.body.scrollHeight !== paginatedHeight) reflow();
      else measure();
    }));
    observer.disconnect();
    observer.observe(document.body);
    void document.fonts?.ready.then(() => reflow());
  }
  function writeDocument(html) {
    try {
      stats.docs++;
      const out = mapUrls(html);
      document.open();
      document.write(out);
      document.close();
      window.addEventListener("message", onMessage);
      for (const u of retired) URL.revokeObjectURL(u);
      retired = [];
      paginatedHeight = -1;
      issues = [];
      observeBody();
      post({ source: "pugide-runtime-ready", hasDoc: true });
    } catch {
      post({ source: "pugide-doc-error" });
    }
  }
  window.addEventListener("message", onMessage);
  observeBody();
  post({ source: "pugide-runtime-ready", hasDoc: false });
})();
