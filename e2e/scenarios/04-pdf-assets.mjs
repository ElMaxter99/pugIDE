import { check, run, html, errs, sleep } from '../lib.mjs';
// Vista PDF y assets
// 19. PDF preview: page size read from the template's @page rule
{
  const { detectPageSize } = await import('../.build/services.mjs');
  const pt = detectPageSize('<style>@page { size: 841.9pt 595.3pt; margin: 0; }</style>');
  check('19 @page in pt -> A4 landscape px', pt.source === 'css' && pt.width === 1123 && pt.height === 794, JSON.stringify(pt));
  const kw = detectPageSize('<style>@page{size:A4 landscape}</style>');
  check('19 @page keyword A4 landscape', kw.width === 1123 && kw.height === 794 && kw.label.startsWith('A4'), JSON.stringify(kw));
  const mm = detectPageSize('<style>@page { margin:0; size: 210mm 297mm }</style>');
  check('19 @page in mm portrait', mm.width === 794 && mm.height === 1123, JSON.stringify(mm));
  const none = detectPageSize('<p>x</p>', 'portrait');
  check('19 no @page -> default A4 portrait', none.source === 'default' && none.width === 794 && none.height === 1123, JSON.stringify(none));
}
// 20. assets: missing refs are reported, uploads land at the requested path, previews use blob: URLs
{
  const a = await run({
    '/index.pug': "html\n  head\n    style.\n      @font-face { font-family: X; src: url('/fonts/x/Light.woff2') format('woff2'); }\n  body\n    img(src='/images/pdf/header.png')\n    img(src='logo.jpeg?v=1')\n    img(src='https://example.com/a.png')\n    a(href='/about') about\n",
  }, '/index.pug');
  check('20 missing refs listed (local images/fonts only)', JSON.stringify(a.AssetState.missing()) === JSON.stringify(['/fonts/x/Light.woff2', '/images/pdf/header.png', '/logo.jpeg']), JSON.stringify(a.AssetState.missing()));
  const bytes = new Uint8Array([137, 80, 78, 71]);
  await a.orch.addAssets([new File([bytes], 'header.png'), new File([bytes], 'Light.woff2'), new File([bytes], 'other.png'), new File([bytes], 'notes.txt')]);
  check('20 matched by name to the requested paths', a.AssetState.has('/images/pdf/header.png') && a.AssetState.has('/fonts/x/Light.woff2') && a.AssetState.has('/assets/other.png') && !a.AssetState.paths().some((p) => p.endsWith('.txt')), a.AssetState.paths().join(','));
  check('20 html uses blob: urls, one still missing', html(a).includes('src="blob:') && html(a).includes("url(blob:") || html(a).includes("url('blob:"), html(a).slice(0, 400));
  check('20 remote + page links untouched', html(a).includes('https://example.com/a.png') && html(a).includes('href="/about"'), html(a));
  check('20 only logo still missing', JSON.stringify(a.AssetState.missing()) === '["/logo.jpeg"]', JSON.stringify(a.AssetState.missing()));
  await a.orch.addAssets([new File([bytes], 'whatever.jpeg')], '/logo.jpeg');
  check('20 explicit target path satisfies it', a.AssetState.missing().length === 0, JSON.stringify(a.AssetState.missing()));
  a.orch.deleteFile('/images/pdf/header.png');
  await sleep(500);
  check('20 deleting an asset makes it missing again', a.AssetState.missing().includes('/images/pdf/header.png'), JSON.stringify(a.AssetState.missing()));
}
// 21. PDF orientation: rotating swaps the sheet sides and the label
{
  const { detectPageSize, rotatePageSize } = await import('../.build/services.mjs');
  const land = detectPageSize('<style>@page { size: 841.9pt 595.3pt }</style>');
  const port = rotatePageSize(land);
  check('21 rotate swaps sides + mm label', port.width === 794 && port.height === 1123 && port.label.includes('210×297') && port.source === 'manual', JSON.stringify(port));
  const d = rotatePageSize(detectPageSize('<p>x</p>'));
  check('21 default A4 horizontal rotates to vertical', d.width === 794 && d.label.includes('vertical'), JSON.stringify(d));
}
