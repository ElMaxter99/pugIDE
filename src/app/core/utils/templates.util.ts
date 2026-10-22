/** Plantillas de inicio: proyectos reales multiarchivo (con estilos, mixins, datos y traducciones). */
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  files: Record<string, string>;
  data: Record<string, unknown>;
}

const INVOICE_PUG = `doctype html
- const money = (n) => n.toFixed(2).replace('.', ',') + ' €'
html(lang="es")
  head
    meta(charset="UTF-8")
    title #{t('INVOICE.TITLE')} #{invoice.number}
    link(rel="stylesheet" href="/styles/invoice.css")
  body
    header.top
      div
        h1= t('INVOICE.TITLE')
        p.muted \\#{invoice.number} · #{invoice.date}
      div.company
        strong= company.name
        p #{company.address}
        p #{company.taxId}
    section.parties
      div
        h2= t('INVOICE.BILL_TO')
        p
          strong= client.name
        p= client.address
    table.lines
      thead
        tr
          th= t('INVOICE.DESCRIPTION')
          th.num= t('INVOICE.QTY')
          th.num= t('INVOICE.PRICE')
          th.num= t('INVOICE.AMOUNT')
      tbody
        each item in items
          include /components/line.pug
    - const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
    - const tax = subtotal * invoice.taxRate
    section.totals
      p
        span= t('INVOICE.SUBTOTAL')
        span= money(subtotal)
      p
        span #{t('INVOICE.TAX')} (#{Math.round(invoice.taxRate * 100)}%)
        span= money(tax)
      p.grand
        span= t('INVOICE.TOTAL')
        span= money(subtotal + tax)
    if invoice.notes
      p.notes= invoice.notes
`;

const INVOICE_LINE_PUG = `tr
  td= item.description
  td.num= item.qty
  td.num= money(item.price)
  td.num= money(item.qty * item.price)
`;

const INVOICE_CSS = `@page { size: A4; margin: 18mm; }
* { box-sizing: border-box; }
body { font-family: Helvetica, Arial, sans-serif; color: #1f2933; font-size: 12px; }
.top { display: flex; justify-content: space-between; border-bottom: 2px solid #1f2933; padding-bottom: 12px; }
h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; }
h2 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin: 24px 0 6px; }
.muted { color: #6b7280; margin: 0; }
.company { text-align: right; }
.company p, .parties p { margin: 2px 0; }
.lines { width: 100%; border-collapse: collapse; margin-top: 24px; }
.lines th { text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 8px 6px; }
.lines td { padding: 8px 6px; border-bottom: 1px solid #e5e7eb; break-inside: avoid; }
.num { text-align: right; white-space: nowrap; }
.totals { width: 45%; margin: 20px 0 0 auto; break-inside: avoid; }
.totals p { display: flex; justify-content: space-between; margin: 4px 0; }
.totals .grand { font-size: 16px; font-weight: 700; border-top: 2px solid #1f2933; padding-top: 8px; }
.notes { margin-top: 32px; color: #6b7280; font-style: italic; }
`;

const INVOICE_DATA = {
  company: { name: 'Estudio Pug S.L.', address: 'Calle Mayor 12, 28013 Madrid', taxId: 'B12345678' },
  client: { name: 'Cliente de Ejemplo S.A.', address: 'Avenida del Puerto 45, 46023 Valencia' },
  invoice: { number: 'F-2026-0042', date: '2026-10-22', taxRate: 0.21, notes: 'Pago a 30 días mediante transferencia.' },
  items: [
    { description: 'Diseño de plantilla de correo', qty: 1, price: 450 },
    { description: 'Maquetación de informe PDF', qty: 3, price: 120 },
    { description: 'Soporte mensual', qty: 2, price: 60 },
  ],
  translations: {
    INVOICE: { TITLE: 'Factura', BILL_TO: 'Facturar a', DESCRIPTION: 'Descripción', QTY: 'Cant.', PRICE: 'Precio', AMOUNT: 'Importe', SUBTOTAL: 'Subtotal', TAX: 'IVA', TOTAL: 'Total' },
  },
};

const EMAIL_PUG = `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    meta(name="viewport" content="width=device-width, initial-scale=1.0")
    title= subject
    link(rel="stylesheet" href="/styles/email.css")
  include /mixins.pug
  body
    table.wrapper(role="presentation" width="100%" cellpadding="0" cellspacing="0")
      tr
        td(align="center")
          table.card(role="presentation" width="600" cellpadding="0" cellspacing="0")
            tr
              td.brand= brand.name
            tr
              td.content
                h1 #{t('EMAIL.GREETING')}, #{user.firstName}
                p= t('EMAIL.INTRO')
                +button(cta.label, cta.url)
                p.small= t('EMAIL.FALLBACK')
                p.small
                  a(href=cta.url)= cta.url
            tr
              td.footer
                p #{brand.name} · #{brand.address}
                p
                  a(href=unsubscribeUrl)= t('EMAIL.UNSUBSCRIBE')
`;

const EMAIL_MIXINS = `//- Botón compatible con clientes de correo: tabla con enlace
mixin button(label, url)
  table(role="presentation" cellpadding="0" cellspacing="0")
    tr
      td.button
        a(href=url)= label
`;

const EMAIL_CSS = `body { margin: 0; background: #f3f4f6; font-family: Helvetica, Arial, sans-serif; color: #1f2933; }
.wrapper { padding: 24px 0; }
.card { background: #ffffff; border-radius: 8px; overflow: hidden; max-width: 600px; }
.brand { background: #4f46e5; color: #ffffff; font-size: 20px; font-weight: 700; padding: 20px 32px; }
.content { padding: 32px; font-size: 15px; line-height: 1.6; }
.content h1 { margin: 0 0 16px; font-size: 22px; }
.button { background: #4f46e5; border-radius: 6px; }
.button a { display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 700; }
.small { font-size: 12px; color: #6b7280; word-break: break-all; }
.footer { background: #f9fafb; padding: 20px 32px; font-size: 12px; color: #6b7280; text-align: center; }
.footer p { margin: 4px 0; }
`;

const EMAIL_DATA = {
  subject: 'Confirma tu cuenta',
  brand: { name: 'Pug Studio', address: 'Calle Mayor 12, Madrid' },
  user: { firstName: 'Lucía' },
  cta: { label: 'Confirmar cuenta', url: 'https://ejemplo.com/confirmar?token=abc123' },
  unsubscribeUrl: 'https://ejemplo.com/baja',
  translations: {
    EMAIL: {
      GREETING: 'Hola',
      INTRO: 'Gracias por registrarte. Confirma tu dirección de correo para activar tu cuenta.',
      FALLBACK: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      UNSUBSCRIBE: 'Darme de baja',
    },
  },
};

const REPORT_PUG = `doctype html
html(lang="es")
  head
    meta(charset="UTF-8")
    title= report.title
    link(rel="stylesheet" href="/styles/report.css")
  include /mixins.pug
  body
    section.cover
      h1= report.title
      p.subtitle= report.subtitle
      p.meta #{report.author} · #{report.date}
    each section, index in sections
      section.chapter
        h2 #{index + 1}. #{section.title}
        p= section.text
        if section.metrics
          +metrics(section.metrics)
    section.chapter
      h2= t('REPORT.CONCLUSION')
      p= report.conclusion
`;

const REPORT_MIXINS = `//- Tabla de métricas que no se parte entre páginas
mixin metrics(rows)
  table.metrics
    thead
      tr
        th= t('REPORT.METRIC')
        th.num= t('REPORT.VALUE')
    tbody
      each row in rows
        tr
          td= row.name
          td.num= row.value
`;

const REPORT_CSS = `@page { size: A4; margin: 20mm 18mm; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1f2933; font-size: 12pt; line-height: 1.5; }
.cover { min-height: 240mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover h1 { font-size: 34pt; margin: 0; }
.subtitle { font-size: 16pt; color: #4b5563; margin: 8px 0 32px; }
.meta { color: #6b7280; }
.chapter { break-before: page; }
.chapter h2 { font-size: 18pt; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
.metrics { width: 100%; border-collapse: collapse; margin-top: 16px; break-inside: avoid; }
.metrics th, .metrics td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
.metrics .num { text-align: right; }
`;

const REPORT_DATA = {
  report: {
    title: 'Informe trimestral',
    subtitle: 'Resultados del tercer trimestre',
    author: 'Equipo de análisis',
    date: '2026-10-22',
    conclusion: 'El trimestre cierra por encima del objetivo. Recomendamos mantener la inversión en retención.',
  },
  sections: [
    { title: 'Resumen ejecutivo', text: 'Las ventas crecieron un 12 % respecto al trimestre anterior, impulsadas por el canal online.', metrics: [{ name: 'Ingresos', value: '1,24 M€' }, { name: 'Clientes nuevos', value: '3.480' }] },
    { title: 'Operaciones', text: 'El tiempo medio de entrega bajó a 2,1 días tras la reorganización de almacenes.', metrics: [{ name: 'Entrega media', value: '2,1 días' }, { name: 'Incidencias', value: '0,8 %' }] },
  ],
  translations: { REPORT: { CONCLUSION: 'Conclusiones', METRIC: 'Métrica', VALUE: 'Valor' } },
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'invoice',
    name: 'Factura',
    description: 'Factura A4 con líneas, totales con IVA y traducciones.',
    files: { '/main.pug': INVOICE_PUG, '/components/line.pug': INVOICE_LINE_PUG, '/styles/invoice.css': INVOICE_CSS },
    data: INVOICE_DATA,
  },
  {
    id: 'email',
    name: 'Correo electrónico',
    description: 'Correo transaccional basado en tablas, con botón como mixin.',
    files: { '/main.pug': EMAIL_PUG, '/mixins.pug': EMAIL_MIXINS, '/styles/email.css': EMAIL_CSS },
    data: EMAIL_DATA,
  },
  {
    id: 'report',
    name: 'Informe',
    description: 'Informe A4 con portada, capítulos con salto de página y tablas de métricas.',
    files: { '/main.pug': REPORT_PUG, '/mixins.pug': REPORT_MIXINS, '/styles/report.css': REPORT_CSS },
    data: REPORT_DATA,
  },
];
