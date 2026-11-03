import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, renderInline, escapeHtml } from './.build/units.mjs';

test('encabezados, párrafos y reglas', () => {
  assert.equal(renderMarkdown('# Título\n\nUn párrafo\ncon dos líneas.\n\n## Sub ##\n\n---'),
    '<h1>Título</h1>\n<p>Un párrafo\ncon dos líneas.</p>\n<h2>Sub</h2>\n<hr>');
});

test('énfasis, código en línea, enlaces e imágenes', () => {
  assert.equal(renderInline('**fuerte** y *cursiva* y _otra_ y ~~tachado~~'), '<strong>fuerte</strong> y <em>cursiva</em> y <em>otra</em> y <del>tachado</del>');
  assert.equal(renderInline('usa `a *b* c` aquí'), 'usa <code>a *b* c</code> aquí');
  assert.equal(renderInline('[PugIDE](https://example.com "Título")'), '<a href="https://example.com" title="Título">PugIDE</a>');
  assert.equal(renderInline('![logo](img/logo.png)'), '<img src="img/logo.png" alt="logo">');
  assert.equal(renderInline('snake_case_name y 2*3*4'), 'snake_case_name y 2*3*4');
  assert.equal(renderInline('<https://a.com>'), '<a href="https://a.com">https://a.com</a>');
});

test('no deja pasar HTML ni enlaces peligrosos', () => {
  assert.equal(renderMarkdown('<script>alert(1)</script>'), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  assert.equal(renderInline('[x](javascript:alert(1))'), '<a href="#">x</a>');
  assert.equal(renderInline('[x](JaVaScRiPt:alert(1))'), '<a href="#">x</a>');
  assert.equal(renderInline('![x](data:text/html;base64,AAAA)'), '<img src="#" alt="x">');
  assert.match(renderInline('![x](data:image/png;base64,AAAA)'), /src="data:image\/png;base64,AAAA"/);
  assert.equal(escapeHtml('a<b>&"c"'), 'a&lt;b&gt;&amp;&quot;c&quot;');
});

test('bloques de código con y sin lenguaje', () => {
  assert.equal(renderMarkdown('```js\nconst a = "<b>";\n```'), '<pre><code class="language-js">const a = &quot;&lt;b&gt;&quot;;</code></pre>');
  assert.equal(renderMarkdown('~~~\n# no es título\n~~~'), '<pre><code># no es título</code></pre>');
});

test('listas ordenadas, sin ordenar y anidadas', () => {
  assert.equal(renderMarkdown('- uno\n- dos\n- tres'), '<ul>\n<li>uno</li>\n<li>dos</li>\n<li>tres</li>\n</ul>');
  assert.equal(renderMarkdown('3. tres\n4. cuatro'), '<ol start="3">\n<li>tres</li>\n<li>cuatro</li>\n</ol>');
  assert.equal(renderMarkdown('- a\n  - a1\n  - a2\n- b'),
    '<ul>\n<li>a\n<ul>\n<li>a1</li>\n<li>a2</li>\n</ul></li>\n<li>b</li>\n</ul>');
});

test('citas y sangría común', () => {
  assert.equal(renderMarkdown('> cita **fuerte**\n> segunda'), '<blockquote><p>cita <strong>fuerte</strong>\nsegunda</p></blockquote>');
  assert.equal(renderMarkdown('    # Dentro de Pug\n\n    texto'), '<h1>Dentro de Pug</h1>\n<p>texto</p>');
  assert.equal(renderMarkdown(''), '');
});
