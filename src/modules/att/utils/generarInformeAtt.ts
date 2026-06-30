import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  SimpleField,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { ATT_LOGO_B64 } from './logoBase64'
import { TIPO_PROYECTO_LABELS } from '../types'
import type { AttRecord } from '../types'

const FONT = 'Calibri'
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function fechaLarga(d = new Date()) {
  return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Unidades ────────────────────────────────────────────────────────────────
const IN   = 914400   // 1 inch en EMU
const TWIP = 1440     // twips por pulgada

// ─── Layout page ─────────────────────────────────────────────────────────────
const PAGE_W   = Math.round(8.5  * TWIP)   // 12240 twips
const MARGIN   = Math.round(1.25 * TWIP)   // 1800 twips
const PAGE_COL = PAGE_W - 2 * MARGIN       // 8640 twips columna útil

// ─── Helpers imagen ───────────────────────────────────────────────────────────
function b64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64.trim())
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf
}

async function urlToBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  return res.arrayBuffer()
}

function getImageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

function scaleToBox(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(1, maxW / w, maxH / h)
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

// ─── Estilos comunes ──────────────────────────────────────────────────────────
const NoBorder = {
  top:    { style: BorderStyle.NIL,    size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NIL,    size: 0, color: 'auto' },
  left:   { style: BorderStyle.NIL,    size: 0, color: 'auto' },
  right:  { style: BorderStyle.NIL,    size: 0, color: 'auto' },
}

const ThinBorder = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'auto' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'auto' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'auto' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'auto' },
}

function blueShading() {
  return { type: ShadingType.CLEAR, color: 'FFFFFF', fill: '0070C0' }
}

function boldRun(text: string) {
  return new TextRun({ text, bold: true, size: 20, font: FONT })
}

function labelRun(text: string) {
  return new TextRun({ text, size: 20, font: FONT })
}

function sectionHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: '4F81BD', size: 26, font: FONT })],
    spacing: { before: 200, after: 0 },
  })
}

// ─── Cabecera del documento (2 filas) ────────────────────────────────────────
const HDR_COLS = [1400, 5040, 2200] // twips, suma 8640

function makeHeader(record: AttRecord, fecha: string): Header {
  const ott = record.ott || ''
  const iniciativaContratista = [record.iniciativa, record.contratista].filter(Boolean).join(' - ')

  return new Header({
    children: [
      new Table({
        width: { size: PAGE_COL, type: WidthType.DXA },
        columnWidths: HDR_COLS,
        rows: [
          // ── Fila 1 ──
          new TableRow({
            children: [
              // Logo (e) entel — texto placeholder)
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[0], type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'e) entel', bold: true, color: '006BB6', size: 20, font: FONT })],
                  spacing: { before: 40, after: 40 },
                })],
              }),
              // Título
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[1], type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'INFORME POSTERIOR OTT', bold: true, size: 24, font: FONT })],
                    spacing: { before: 40, after: 0 },
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: ott, bold: true, size: 24, font: FONT })],
                    spacing: { before: 0, after: 40 },
                  }),
                ],
              }),
              // Fecha
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[2], type: WidthType.DXA },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'FECHA INFORME', bold: true, size: 16, font: FONT })],
                    spacing: { before: 40, after: 20 },
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: fecha, size: 18, font: FONT })],
                    spacing: { before: 0, after: 40 },
                  }),
                ],
              }),
            ],
          }),
          // ── Fila 2 ──
          new TableRow({
            children: [
              // OTT
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[0], type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: ott, size: 18, font: FONT })],
                  spacing: { before: 40, after: 40 },
                })],
              }),
              // Iniciativa - Contratista
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[1], type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: iniciativaContratista, size: 18, font: FONT })],
                  spacing: { before: 40, after: 40 },
                })],
              }),
              // Página
              new TableCell({
                borders: ThinBorder,
                verticalAlign: VerticalAlign.CENTER,
                width: { size: HDR_COLS[2], type: WidthType.DXA },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'Página ', size: 18, font: FONT }),
                    new SimpleField('PAGE'),
                    new TextRun({ text: ' de ', size: 18, font: FONT }),
                    new SimpleField('NUMPAGES'),
                  ],
                  spacing: { before: 40, after: 40 },
                })],
              }),
            ],
          }),
        ],
      }),
    ],
  })
}

// ─── Logo en cuerpo (primera página, antes de secciones) ─────────────────────
function makeLogoBlock(): Paragraph {
  const logoData = b64ToUint8(ATT_LOGO_B64)
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [
      new ImageRun({
        data: logoData,
        transformation: {
          width:  Math.round(1.5 * 96),              // px a 96 DPI
          height: Math.round(1.5 * (92 / 315) * 96),
        },
        type: 'jpg',
      }),
    ],
    spacing: { before: 0, after: 120 },
  })
}

// ─── Sección 1: Tipo de proyecto ──────────────────────────────────────────────
const TIPO_GRID: [keyof typeof TIPO_PROYECTO_LABELS, keyof typeof TIPO_PROYECTO_LABELS][] = [
  ['acceso_fijo',       'backhaul'],
  ['conectividad_movil','acceso_b2b'],
  ['proyectos_acceso',  'modernizacion'],
  ['vulnerabilidad',    'adaptacion'],
]

function tipoLabelCell(tipo: keyof typeof TIPO_PROYECTO_LABELS) {
  return new TableCell({
    width: { size: Math.round(0.38 * PAGE_COL), type: WidthType.DXA },
    shading: blueShading(),
    borders: ThinBorder,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: TIPO_PROYECTO_LABELS[tipo], bold: true, color: 'FFFFFF', font: FONT, size: 18 })],
      spacing: { before: 40, after: 40 },
    })],
  })
}

function tipoCheckCell(selected: boolean) {
  return new TableCell({
    width: { size: Math.round(0.12 * PAGE_COL), type: WidthType.DXA },
    borders: ThinBorder,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: selected ? 'X' : '', bold: true, size: 22, font: FONT })],
      spacing: { before: 40, after: 40 },
    })],
  })
}

function makeTipoTable(selected: string) {
  return new Table({
    width: { size: PAGE_COL, type: WidthType.DXA },
    rows: TIPO_GRID.map(([left, right]) =>
      new TableRow({
        children: [
          tipoLabelCell(left),
          tipoCheckCell(selected === left),
          tipoLabelCell(right),
          tipoCheckCell(selected === right),
        ],
      })
    ),
  })
}

// ─── Sección 2: Datos del proyecto ────────────────────────────────────────────
function datoPara(label: string, value: string) {
  return new Paragraph({
    children: [labelRun(label), boldRun(value || ' ')],
    spacing: { before: 40, after: 40 },
  })
}

function coordsPara(label: string, lat: string, lng: string) {
  return new Paragraph({
    children: [
      labelRun(label),
      boldRun(' Latitud: '), labelRun(`${lat || ''}  S`),
      labelRun('               '),
      boldRun('Longitud: '), labelRun(`${lng || ''}  W`),
    ],
    spacing: { before: 40, after: 40 },
  })
}

function makeDatosSection(r: AttRecord) {
  return [
    datoPara('Nombre del proyecto: ', r.nombreProyecto),
    datoPara('Iniciativa del proyecto: ', r.iniciativa),
    datoPara('ID de Proyecto: ', r.ott),
    datoPara('Ingeniero Proyecto: ', r.ingenieroProyecto),
    datoPara('Jefe de Proyecto: ', r.jefeProyecto),
    datoPara('Comuna: ', r.comuna),
    datoPara('Región: ', r.region),
    datoPara('Contratista: ', r.contratista),
    coordsPara('Coordenadas de inicio:  ', r.coordsInicio.lat, r.coordsInicio.lng),
    coordsPara('Coordenadas de término: ', r.coordsTermino.lat, r.coordsTermino.lng),
  ]
}

// ─── Sección 3: Descripción general ──────────────────────────────────────────
function para(text: string, opts: { bold?: boolean; indent?: boolean } = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: FONT, bold: opts.bold })],
    spacing: { before: 40, after: 40 },
    indent: opts.indent ? { left: 360 } : undefined,
  })
}

function makeDescripcionSection(r: AttRecord) {
  const items: Paragraph[] = []

  // Tendidos (formato redactado, uno por párrafo)
  for (const t of r.tramos) {
    if (!t.tipoCable && !t.metraje && !t.desde && !t.hasta) continue
    const sentence =
      `Se realiza tendido de ${t.metraje || '___'}m de cable ${t.tipoCable || '___'} ` +
      `desde ${t.desde || '___'} hasta ${t.hasta || '___'};`
    items.push(para(sentence))
  }

  if (r.instalaCMIC)          items.push(para('Se instala CMIC en cliente;'))
  if (r.instalaMufas)         items.push(para('Se instala mufa proyectada;'))
  if (r.tieneReparacionDucto) items.push(para('Se realiza calicata y reparación de ducto;'))

  if (r.tieneIngresoRed) {
    items.push(para('Con ingreso a red;'))
    const { nodo, rack, odf, fo } = r.ingresoRed
    if (nodo) items.push(para(`NODO    ${nodo}`, { indent: true }))
    if (rack) items.push(para(`RACK    ${rack}`, { indent: true }))
    if (odf)  items.push(para(`ODF     ${odf}`,  { indent: true }))
    if (fo)   items.push(para(`FO      ${fo}`,   { indent: true }))
  }

  for (const h of r.hitos) {
    const text = [h.fecha, h.descripcion].filter(Boolean).join(' — ')
    if (text) items.push(para(`• ${text}`, { indent: true }))
  }

  if (items.length === 0) {
    items.push(para(' '))
  }

  return items
}

// ─── Sección 4: Infraestructura ───────────────────────────────────────────────
const INFRA_COL = [
  Math.round(0.55 * PAGE_COL),
  Math.round(0.15 * PAGE_COL),
  Math.round(0.15 * PAGE_COL),
  Math.round(0.15 * PAGE_COL),
]

function infraHeaderCell(text: string) {
  return new TableCell({
    shading: blueShading(),
    borders: ThinBorder,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18, font: FONT })],
    })],
  })
}

function infraDataCell(text: string, center = false) {
  return new TableCell({
    borders: ThinBorder,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20, font: FONT })],
    })],
  })
}

function makeInfraTable(r: AttRecord) {
  const { postesElectricos: pe, postesOtraTeleco: pt, ductosOtraTeleco: dt, fibraOtraCompania: fo, postesEntel: pE } = r.infraestructura
  return new Table({
    width: { size: PAGE_COL, type: WidthType.DXA },
    columnWidths: INFRA_COL,
    rows: [
      new TableRow({ children: [infraHeaderCell('Infraestructura'), infraHeaderCell('Sí / No'), infraHeaderCell('Cantidad'), infraHeaderCell('Compañía')] }),
      new TableRow({ children: [infraDataCell('¿Utiliza postes eléctricos?'), infraDataCell(pe.usa ? 'SI' : 'NO', true), infraDataCell(pe.usa ? pe.cantidad : '', true), infraDataCell(pe.usa ? pe.compania : '')] }),
      new TableRow({ children: [infraDataCell('¿Utiliza postes de otra compañía de teleco?'), infraDataCell(pt.usa ? 'SI' : 'NO', true), infraDataCell(pt.usa ? pt.cantidad : '', true), infraDataCell(pt.usa ? pt.compania : '')] }),
      new TableRow({ children: [infraDataCell('¿Utiliza ductos de otra compañía de teleco?'), infraDataCell(dt.usa ? 'SI' : 'NO', true), infraDataCell(dt.usa ? dt.cantidad : '', true), infraDataCell(dt.usa ? dt.compania : '')] }),
      new TableRow({ children: [infraDataCell('¿Utiliza fibra óptica de otra compañía?'), infraDataCell(fo.usa ? 'SI' : 'NO', true), infraDataCell('', true), infraDataCell('')] }),
      new TableRow({ children: [infraDataCell('¿Se proyectan postes/ductos de Entel?'), infraDataCell(pE.usa ? 'SI' : 'NO', true), infraDataCell('', true), infraDataCell('')] }),
    ],
  })
}

// ─── Sección 5: Registro fotográfico ─────────────────────────────────────────
const CAT_KEY_TO_LABEL: Record<string, string> = {
  tendidoFO:       'TENDIDO FO',
  cmic:            'CMIC',
  medicionTraza:   'MEDICIÓN TRAZA',
  reparacionDucto: 'REPARACIÓN DE DUCTO',
  mufaProyectada:  'MUFA PROYECTADA',
  ingresoRed:      'INGRESO A RED',
}

function fotoLabel(f: AttRecord['fotos'][number]): string {
  if (f.categoria === 'otro') return (f.otroLabel?.trim() || 'OTRO').toUpperCase()
  return CAT_KEY_TO_LABEL[f.categoria] ?? f.categoria.toUpperCase()
}

const PHOTO_MAX_W_PX = Math.round(2.8 * 96)
const PHOTO_MAX_H_PX = Math.round(3.2 * 96)

interface PhotoData { buffer: ArrayBuffer; wPx: number; hPx: number }

async function fetchPhoto(url: string): Promise<PhotoData | null> {
  try {
    const [buf, dims] = await Promise.all([urlToBuffer(url), getImageSize(url)])
    const s = scaleToBox(dims.w, dims.h, PHOTO_MAX_W_PX, PHOTO_MAX_H_PX)
    return { buffer: buf, wPx: s.w, hPx: s.h }
  } catch {
    return null
  }
}

function photoCell(photo: PhotoData | null, label: string) {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: label, bold: true, size: 18 })],
      spacing: { before: 40, after: 60 },
    }),
  ]
  if (photo) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: photo.buffer, transformation: { width: photo.wPx, height: photo.hPx }, type: 'jpg' })],
      spacing: { before: 0, after: 40 },
    }))
  }
  return new TableCell({
    borders: ThinBorder,
    verticalAlign: VerticalAlign.TOP,
    width: { size: Math.round(0.5 * PAGE_COL), type: WidthType.DXA },
    children,
  })
}

async function makeFotosSection(r: AttRecord) {
  const elements: (Paragraph | Table)[] = []
  if (r.fotos.length === 0) return elements

  const photos = await Promise.all(
    r.fotos.map((f) => f.previewUrl ? fetchPhoto(f.previewUrl) : Promise.resolve(null))
  )

  for (let i = 0; i < r.fotos.length; i += 2) {
    const labelL = fotoLabel(r.fotos[i])
    const right  = r.fotos[i + 1]
    const labelR = right ? fotoLabel(right) : ''
    elements.push(new Table({
      width: { size: PAGE_COL, type: WidthType.DXA },
      rows: [new TableRow({ children: [
        photoCell(photos[i] ?? null, labelL),
        photoCell(photos[i + 1] ?? null, labelR),
      ]})],
    }))
    elements.push(new Paragraph({ spacing: { before: 60, after: 0 } }))
  }

  return elements
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function generarInformeAtt(record: AttRecord): Promise<Blob> {
  const fecha = fechaLarga()
  const fotosElements = await makeFotosSection(record)

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 20 } },
      },
    },
    sections: [{
      properties: {
        page: {
          size:   { width: PAGE_W, height: Math.round(11 * TWIP) },
          margin: {
            top:    Math.round(0.49 * TWIP),
            right:  MARGIN,
            bottom: Math.round(0.30 * TWIP),
            left:   MARGIN,
            header: Math.round(0.50 * TWIP),
            footer: Math.round(0.50 * TWIP),
          },
        },
      },
      headers: { default: makeHeader(record, fecha) },
      children: [
        // Sección 1
        sectionHeading('1. TIPO DE PROYECTO'),
        makeTipoTable(record.tipoProyecto),
        new Paragraph({ spacing: { before: 80, after: 0 } }),

        // Sección 2
        sectionHeading('2. DATOS DEL PROYECTO'),
        ...makeDatosSection(record),
        new Paragraph({ spacing: { before: 80, after: 0 } }),

        // Sección 3
        sectionHeading('3. DESCRIPCIÓN GENERAL DEL PROYECTO'),
        ...makeDescripcionSection(record),
        new Paragraph({ spacing: { before: 80, after: 0 } }),

        // Sección 4
        sectionHeading('4. INFRAESTRUCTURA PARA UTILIZAR'),
        makeInfraTable(record),
        new Paragraph({ spacing: { before: 80, after: 0 } }),

        // Sección 5
        sectionHeading('5. DETALLE DE SINGULARIDADES Y REGISTROS FOTOGRÁFICOS.'),
        ...fotosElements,
      ],
    }],
  })

  return Packer.toBlob(doc)
}
