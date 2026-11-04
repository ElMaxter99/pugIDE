// Proyecto de ejemplo con el que se fotografía la app: una plantilla multi-archivo realista («Informe trimestral»).
// Datos ficticios; nada de lorem ipsum.

export const MAIN_PUG = `include mixins
doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= titulo
    link(rel="stylesheet", href="/styles/informe.scss")
  body
    include partials/cabecera
    main
      section.resumen
        h2= t('INFORME.RESUMEN')
        p= resumen
      section.kpis
        each kpi in kpis
          +tarjeta(kpi.nombre, kpi.valor, kpi.variacion)
      section.ventas
        h2= t('INFORME.VENTAS')
        table
          thead
            tr
              th= t('TABLA.REGION')
              th= t('TABLA.INGRESOS')
              th= t('TABLA.VARIACION')
          tbody
            each fila in ventas
              tr
                td= fila.region
                td.num= fila.ingresos
                td.num= fila.variacion
      img.logo(src="/images/logo.svg", alt="Logotipo de Norte Analytics")
    footer
      p= t('INFORME.PIE')
`;

/** Variante para el modo PDF: reglas @page con cabecera y pie, y contenido suficiente para varias hojas. */
export const MAIN_PUG_PDF = MAIN_PUG
  .replace('    link(rel="stylesheet", href="/styles/informe.scss")\n', `    link(rel="stylesheet", href="/styles/informe.scss")
    style.
      @page { size: A4; margin: 22mm 15mm;
        @top-center { content: "Informe trimestral"; font-size: 9pt }
        @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 9pt }
      }
      @page :first { @top-center { content: none } }
      .grafico { height: 330px; margin: 16px 0; background: #f3f1fa; border-radius: 8px; break-inside: avoid }
`)
  .replace('      img.logo(', `      section.notas
        h2 Notas metodológicas
        p Las cifras de ingresos se expresan en euros sin IVA y proceden del cierre contable del 30 de septiembre. La variación compara con el segundo trimestre de 2026.
        p La región Este incluye por primera vez los contratos de la delegación de Valencia, lo que explica parte de la caída frente al trimestre anterior.
        .grafico
        p Los clientes activos son los que tienen al menos una factura emitida en los últimos noventa días.
        p Las bajas se calculan sobre el total de clientes activos al inicio del trimestre.
      img.logo(`);

export const MIXINS_PUG = `mixin tarjeta(nombre, valor, variacion)
  article.tarjeta
    h3= nombre
    p.valor= valor
    p.variacion(class=variacion.startsWith('-') ? 'baja' : 'sube')= variacion
`;

export const CABECERA_PUG = `header.cabecera
  h1= titulo
  p.periodo= periodo
`;

export const INFORME_SCSS = `$tinta: #1f2430;
$acento: #5b3fd0;
$suave: #f3f1fa;

body {
  margin: 0;
  font: 14px/1.55 'Segoe UI', sans-serif;
  color: $tinta;
}

.cabecera {
  padding: 32px 40px;
  background: $acento;
  color: #fff;
  h1 { margin: 0 0 4px; font-size: 28px; }
  .periodo { margin: 0; opacity: 0.85; }
}

main { padding: 24px 40px; }

.kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.tarjeta {
  padding: 16px;
  background: $suave;
  border-radius: 8px;
  .valor { font-size: 26px; font-weight: 600; margin: 4px 0; }
  .sube { color: #1b6a20; }
  .baja { color: #ba1a1a; }
}

table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }
.num { text-align: right; }
`;

export const ES_JSON = `{
  "INFORME": {
    "RESUMEN": "Resumen ejecutivo",
    "VENTAS": "Ventas por región",
    "PIE": "Norte Analytics · Documento interno"
  },
  "TABLA": {
    "REGION": "Región",
    "INGRESOS": "Ingresos",
    "VARIACION": "Variación"
  }
}
`;

export const EN_JSON = `{
  "INFORME": {
    "RESUMEN": "Executive summary",
    "VENTAS": "Sales by region",
    "PIE": "Norte Analytics · Internal document"
  },
  "TABLA": {
    "REGION": "Region",
    "INGRESOS": "Revenue",
    "VARIACION": "Change"
  }
}
`;

export const FILES = {
  '/main.pug': MAIN_PUG,
  '/mixins.pug': MIXINS_PUG,
  '/partials/cabecera.pug': CABECERA_PUG,
  '/styles/informe.scss': INFORME_SCSS,
  '/locales/es/translations.json': ES_JSON,
  '/locales/en/translations.json': EN_JSON,
};

export const DATA = {
  titulo: 'Informe trimestral',
  periodo: 'T3 2026 · julio a septiembre',
  resumen: 'Los ingresos crecieron un 8,2 % respecto al trimestre anterior, impulsados por la región Norte y la renovación de contratos anuales.',
  kpis: [
    { nombre: 'Ingresos', valor: '1,24 M€', variacion: '+8,2 %' },
    { nombre: 'Clientes activos', valor: '3.482', variacion: '+3,1 %' },
    { nombre: 'Bajas', valor: '1,9 %', variacion: '-0,4 %' },
  ],
  ventas: [
    { region: 'Norte', ingresos: '412.300 €', variacion: '+11,4 %' },
    { region: 'Centro', ingresos: '368.900 €', variacion: '+6,0 %' },
    { region: 'Sur', ingresos: '297.450 €', variacion: '+7,9 %' },
    { region: 'Este', ingresos: '161.350 €', variacion: '-1,2 %' },
  ],
};

export const SESSION = {
  projectName: 'Informe trimestral',
  files: FILES,
  openTabPaths: ['/main.pug'],
  activeTabPath: '/main.pug',
  datasets: {
    version: 1,
    activeId: 'ds-1',
    locale: 'es',
    translationLocale: 'es',
    datasets: [
      { id: 'ds-1', name: 'Por defecto', data: DATA, kind: 'default' },
      { id: 'ds-2', name: 'Vacío', data: { titulo: '', periodo: '', resumen: '', kpis: [], ventas: [] }, kind: 'empty' },
    ],
  },
};

/** Un error de compilación típico: se llama a un mixin que no existe. */
export const FILES_ERROR = {
  ...FILES,
  '/main.pug': MAIN_PUG.replace('+tarjeta(kpi.nombre, kpi.valor, kpi.variacion)', '+tarjeta(kpi.nombre, kpi.valor, kpi.variacion)\n      +resumenPie(resumen)'),
};

export const PREFS = { theme: 'dark', previewDevice: 'Desktop' };
