/**
 * Injects a `data-pugide-line="N"` attribute into every opening tag, where N
 * is the 1-based line number of that tag in the given HTML string. This is
 * the line of the *served HTML*, not the original .pug source — mapping back
 * to the .pug source would require instrumenting the Pug compiler itself.
 */
export function annotateHtmlLines(html: string): string {
  const tagOpenRe = /<([a-zA-Z][a-zA-Z0-9-]*)([\s>])/g;
  let result = '';
  let lastIndex = 0;
  let line = 1;
  let match: RegExpExecArray | null;

  while ((match = tagOpenRe.exec(html)) !== null) {
    const segment = html.slice(lastIndex, match.index);
    line += countNewlines(segment);
    result += segment;
    result += `<${match[1]} data-pugide-line="${line}"${match[2]}`;
    lastIndex = match.index + match[0].length;
  }
  result += html.slice(lastIndex);
  return result;
}

function countNewlines(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === '\n') n++;
  return n;
}

/**
 * Script injected into every compiled preview document. Stays passive until
 * it receives a `pugide-inspector-toggle` postMessage from the parent frame;
 * while active it highlights the hovered element and reports the clicked
 * element's tag/attributes/HTML line back to the parent via postMessage.
 */
export const INSPECTOR_SCRIPT = `(function () {
  var active = false;
  var overlay = null;

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.style.cssText = 'position:absolute;pointer-events:none;background:rgba(99,102,241,0.25);border:1px solid #6366f1;z-index:2147483647;display:none;box-sizing:border-box;';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.source === 'pugide-inspector-toggle') {
      active = !!e.data.active;
      document.documentElement.style.cursor = active ? 'crosshair' : '';
      if (!active && overlay) overlay.style.display = 'none';
    }
  });

  document.addEventListener('mouseover', function (e) {
    if (!active) return;
    var el = e.target;
    if (!(el instanceof Element)) return;
    var r = el.getBoundingClientRect();
    var ov = ensureOverlay();
    ov.style.display = 'block';
    ov.style.left = (r.left + window.scrollX) + 'px';
    ov.style.top = (r.top + window.scrollY) + 'px';
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
  }, true);

  document.addEventListener('click', function (e) {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (!(el instanceof Element)) return;
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name !== 'data-pugide-line') attrs[a.name] = a.value;
    }
    var line = el.getAttribute('data-pugide-line');
    parent.postMessage({
      source: 'pugide-inspector',
      tagName: el.tagName.toLowerCase(),
      attrs: attrs,
      htmlLine: line ? parseInt(line, 10) : undefined
    }, '*');
  }, true);
})();`;
