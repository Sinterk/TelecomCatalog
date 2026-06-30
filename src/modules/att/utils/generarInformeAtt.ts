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
import type { AttRecord, FotoCategoria } from '../types'

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
  return new TextRun({ text, bold: true, size: 20 })
}

function labelRun(text: string) {
  return new TextRun({ text, size: 20 })
}

function sectionHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: '4F81BD', size: 26 })],
    spacing: { before: 200, after: 0 },
  })
}

// ─── Cabecera del documento ───────────────────────────────────────────────────
// Logo va en el cuerpo como imagen en tabla; en el header solo texto para evitar
// problemas de rels en docx cuando la imagen está anidada en Header > Table.
function makeHeader(ott: string, fecha: string): Header {
  return new Header({
    children: [
      new Table({
        width: { size: PAGE_COL, type: WidthType.DXA },
        borders: NoBorder,
        columnWidths: [
          Math.round(0.23 * PAGE_COL),
          Math.round(0.62 * PAGE_COL),
          Math.round(0.15 * PAGE_COL),
        ],
        rows: [
          new TableRow({
            children: [
              // Columna logo (texto placeholder)
              new TableCell({
                borders: NoBorder,
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'ENTEL', bold: true, color: '0070C0', size: 22 })],
                  spacing: { before: 0, after: 0 },
                })],
              }),
              // Columna título
              new TableCell({
                borders: NoBorder,
                verticalAlign: VerticalAlign.CENTER,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: 'INFORME OTT ', bold: true, size: 24 }),
                    new TextRun({ text: ott, bold: true, size: 24 }),
                  ],
                  spacing: { before: 0, after: 0 },
                })],
              }),
              // Columna fecha / página
              new TableCell({
                borders: NoBorder,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: fecha, size: 18 })],
                    spacing: { before: 0, after: 0 },
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: 'Página ', size: 18 }),
                      new SimpleField('PAGE'),
                      new TextRun({ text: ' de ', size: 18 }),
                      new SimpleField('NUMPAGES'),
                    ],
                    spacing: { before: 0, after: 0 },
                  }),
                ],
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
          width:  Math.round(1.5 * IN),
          height: Math.round(1.5 * (92 / 315) * IN),
        },
        type: 'jpeg',
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
      children: [new TextRun({ text: TIPO_PROYECTO_LABELS[tipo], bold: true, color: 'FFFFFF', font: 'Arial Black', size: 18 })],
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
      children: [new TextRun({ text: selected ? 'X' : '', bold: true, size: 22 })],
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
function listPara(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 20 })],
    spacing: { before: 40, after: 40 },
    indent: { left: 360 },
  })
}

function makeDescripcionSection(r: AttRecord) {
  const items: Paragraph[] = []

  for (const t of r.tramos) {
    const parts = [t.tipoCable, t.metraje ? `${t.metraje}m` : '', t.desde, t.hasta]
      .filter(Boolean).join(' — ')
    if (parts) items.push(new Paragraph({ children: [new TextRun({ text: parts, size: 20 })], spacing: { before: 40, after: 40 } }))
  }

  if (r.descripcionCabecera) {
    items.push(new Paragraph({ children: [new TextRun({ text: r.descripcionCabecera, size: 20 })], spacing: { before: 40, after: 40 } }))
  }

  if (r.instalaCMIC)          items.push(new Paragraph({ children: [new TextRun({ text: 'Se instala CMIC en cliente', size: 20 })], spacing: { before: 40, after: 40 } }))
  if (r.instalaMufas)         items.push(new Paragraph({ children: [new TextRun({ text: 'Se instala mufa proyectada', size: 20 })], spacing: { before: 40, after: 40 } }))
  if (r.tieneReparacionDucto) items.push(new Paragraph({ children: [new TextRun({ text: 'Se realiza calicata y reparación de ducto', size: 20 })], spacing: { before: 40, after: 40 } }))

  if (r.tieneIngresoRed) {
    items.push(new Paragraph({ children: [new TextRun({ text: 'Con ingreso a red', size: 20 })], spacing: { before: 40, after: 40 } }))
    const { nodo, rack, odf, fo } = r.ingresoRed
    if (nodo) items.push(new Paragraph({ children: [new TextRun({ text: `NODO    ${nodo}`, size: 20 })], spacing: { before: 20, after: 20 } }))
    if (rack) items.push(new Paragraph({ children: [new TextRun({ text: `RACK    ${rack}`, size: 20 })], spacing: { before: 20, after: 20 } }))
    if (odf)  items.push(new Paragraph({ children: [new TextRun({ text: `ODF     ${odf}`, size: 20 })], spacing: { before: 20, after: 20 } }))
    if (fo)   items.push(new Paragraph({ children: [new TextRun({ text: `FO      ${fo}`, size: 20 })], spacing: { before: 20, after: 20 } }))
  }

  for (const h of r.hitos) {
    const text = [h.fecha, h.descripcion].filter(Boolean).join(' ')
    if (text) items.push(listPara(text))
  }

  if (items.length === 0) {
    items.push(new Paragraph({ children: [new TextRun({ text: ' ', size: 20 })], spacing: { before: 40, after: 40 } }))
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
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
    })],
  })
}

function infraDataCell(text: string, center = false) {
  return new TableCell({
    borders: ThinBorder,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20 })],
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
const CAT_LABELS: Record<FotoCategoria, string> = {
  tendidoFO:       'TENDIDO FO',
  cmic:            'CMIC',
  medicionTraza:   'MEDICIÓN TRAZA',
  reparacionDucto: 'REPARACIÓN DE DUCTO',
  mufaProyectada:  'MUFA PROYECTADA',
  ingresoRed:      'INGRESO A RED',
}

const PHOTO_MAX_W_PX = Math.round(2.8 * 96)
const PHOTO_MAX_H_PX = Math.round(3.2 * 96)

interface PhotoData { buffer: ArrayBuffer; wEmu: number; hEmu: number }

async function fetchPhoto(url: string): Promise<PhotoData | null> {
  try {
    const [buf, dims] = await Promise.all([urlToBuffer(url), getImageSize(url)])
    const s = scaleToBox(dims.w, dims.h, PHOTO_MAX_W_PX, PHOTO_MAX_H_PX)
    return { buffer: buf, wEmu: Math.round(s.w * 9525), hEmu: Math.round(s.h * 9525) }
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
      children: [new ImageRun({ data: photo.buffer, transformation: { width: photo.wEmu, height: photo.hEmu }, type: 'jpeg' })],
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
  const activeCats: FotoCategoria[] = ['tendidoFO']
  if (r.instalaCMIC)          activeCats.push('cmic')
  activeCats.push('medicionTraza')
  if (r.tieneReparacionDucto) activeCats.push('reparacionDucto')
  if (r.instalaMufas)         activeCats.push('mufaProyectada')
  if (r.tieneIngresoRed)      activeCats.push('ingresoRed')

  for (const cat of activeCats) {
    const fotos = r.fotos[cat] ?? []
    if (fotos.length === 0) continue
    const photos = await Promise.all(fotos.map((f) => f.previewUrl ? fetchPhoto(f.previewUrl) : Promise.resolve(null)))
    for (let i = 0; i < photos.length; i += 2) {
      elements.push(new Table({
        width: { size: PAGE_COL, type: WidthType.DXA },
        rows: [new TableRow({ children: [
          photoCell(photos[i] ?? null, CAT_LABELS[cat]),
          photoCell(photos[i + 1] ?? null, photos[i + 1] ? CAT_LABELS[cat] : ''),
        ]})],
      }))
      elements.push(new Paragraph({ spacing: { before: 60, after: 0 } }))
    }
  }

  return elements
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function generarInformeAtt(record: AttRecord): Promise<Blob> {
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const fotosElements = await makeFotosSection(record)

  const doc = new Document({
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
      headers: { default: makeHeader(record.ott, fecha) },
      children: [
        makeLogoBlock(),

        // Sección 1
        new Paragraph({ children: [new TextRun({ text: '1. TIPO DE PROYECTO', size: 20 })], spacing: { before: 0, after: 80 } }),
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
