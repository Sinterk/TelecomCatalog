import type { Preventivo, Punto } from '../types'
import { TEMPLATE_ENTEL_B64 } from './templateEntelB64'

// ── Hallazgo → ítem 1-22 ─────────────────────────────────────────────────────

const HALLAZGO_PWA: Record<number, string> = {
  1:  'Altura de cable Cruce de calles "4,5 mts"',
  2:  'Atenuación fuera de norma sin afectar servicio',
  3:  'CTO sin potencia y sin clientes',
  4:  'Mufa en el suelo',
  5:  'Cámara sin tapa',
  6:  'Cámara Abierta / Sin soldar',
  7:  'Mufa o cable colgando en cruce de calle',
  8:  'Mufa en mal estado',
  9:  'Gestión ante quien corresponda por el Estado Postes/ postación dañada',
  10: 'Baja distancia a Red BT/AT',
  11: 'Bajada Lateral sin fleje',
  12: 'CTO con tapa abierta o sin tapa',
  13: 'Falla en estructura o sellos de cámara',
  14: 'Bandeja de Emergencia / Mufa sin Cúpula',
  15: 'Altura Cable Vano sin riesgo',
  16: 'Vano sobrecargado',
  17: 'Rotulado de Mufas, cables, gabinetes, DC',
  18: 'Rotulado de CTO',
  19: 'Entrada sin sello cable / Mufa',
  20: 'Falta cruceta o Cruceta Dañada',
  21: 'Falta Planimetria',
  22: 'CTO en condición insegura o no autorizada',
}

function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const hallazgoMap = new Map<string, number>(
  Object.entries(HALLAZGO_PWA).map(([num, text]) => [normalize(text), Number(num)])
)

function getItem(hallazgo: string): number | null {
  const t = normalize(hallazgo)
  if (!t) return null
  if (hallazgoMap.has(t)) return hallazgoMap.get(t)!
  for (const [k, v] of hallazgoMap) {
    if (k.includes(t) || t.includes(k)) return v
  }
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function b64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64.trim())
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function urlToBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  return res.arrayBuffer()
}

function slugify(cuadrante: Preventivo['cuadrante']): string {
  const s = cuadrante.semestre || ''
  const c = (cuadrante.comuna || 'comuna').replace(/\s+/g, '_')
  const q = (cuadrante.cuadrante || 'cuadrante').replace(/\s+/g, '_').slice(0, 25)
  return `${s}_${c}_${q}`.replace(/[^\w._-]/g, '') || 'salida'
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generarInformeEntel(preventivo: Preventivo): Promise<void> {
  // Lazy-load ExcelJS browser build to avoid bloating the initial bundle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ExcelJSMod = await import('exceljs') as any
  const Workbook = ExcelJSMod.Workbook ?? ExcelJSMod.default?.Workbook ?? ExcelJSMod.default
  const workbook = new Workbook()

  await workbook.xlsx.load(b64ToBuffer(TEMPLATE_ENTEL_B64))

  const actaWs = workbook.getWorksheet('ACTA')
  const fotosWs = workbook.getWorksheet('Fotos')

  if (actaWs) llenarActa(actaWs, preventivo)
  if (fotosWs) await llenarFotos(workbook, fotosWs, preventivo)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Preventivo_${slugify(preventivo.cuadrante)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── ACTA sheet ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function llenarActa(ws: any, preventivo: Preventivo) {
  const { cuadrante, puntos } = preventivo

  // Fecha: YYYY-MM-DD → separate day / month / year
  if (cuadrante.fecha) {
    const [y, m, d] = cuadrante.fecha.split('-')
    ws.getCell('E7').value = parseInt(d, 10) || null
    ws.getCell('F7').value = parseInt(m, 10) || null
    ws.getCell('H7').value = parseInt(y, 10) || null
  }

  ws.getCell('E9').value  = cuadrante.semana          || null
  ws.getCell('L9').value  = cuadrante.nombreCuadrante || null
  ws.getCell('E11').value = cuadrante.comuna           || null
  ws.getCell('E14').value = cuadrante.direccion        || null
  ws.getCell('E16').value = cuadrante.zona             || null
  ws.getCell('E18').value = cuadrante.responsable      || null

  // Hallazgo counts per item 1-22
  const conteos = new Map<number, { hallazgos: number; solucionados: number }>()
  for (const p of puntos) {
    const item = getItem(p.hallazgo || '')
    if (!item) continue
    const e = conteos.get(item) ?? { hallazgos: 0, solucionados: 0 }
    e.hallazgos++
    if (p.resuelto) e.solucionados++
    conteos.set(item, e)
  }

  for (let item = 1; item <= 22; item++) {
    const row = 23 + item // item 1 → row 24; item 22 → row 45
    const e = conteos.get(item)
    ws.getCell(row, 7).value  = e?.hallazgos    ?? 0
    ws.getCell(row, 9).value  = e?.solucionados ?? 0
    if (e && e.hallazgos > 0) {
      const { hallazgos: n, solucionados: sol } = e
      ws.getCell(row, 16).value = `${sol} de ${n} corregido${n > 1 ? 's' : ''}`
    }
  }
}

// ── Fotos sheet ───────────────────────────────────────────────────────────────

const HDR_COLOR  = 'FFC65911' // ARGB opaque orange
const WHITE_ARGB = 'FFFFFFFF'
const BLACK_ARGB = 'FF000000'
const YELL_ARGB  = 'FFFFFF00'
const GREY_ARGB  = 'FF808080'

const MEDIUM_SIDE = { style: 'medium' as const, color: { argb: BLACK_ARGB } }
const NO_SIDE     = { style: 'thin' as const,   color: { argb: 'FFFFFFFF' } }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function llenarFotos(workbook: any, ws: any, preventivo: Preventivo) {
  // Clear existing images (internal field)
  try { (ws as any)._images = [] } catch {}

  // Unmerge all existing ranges
  try {
    const merges = Object.keys((ws as any)._merges ?? {})
    for (const m of merges) {
      try { ws.unMergeCells(m) } catch {}
    }
  } catch {}

  // Clear all cell values
  ws.eachRow({ includeEmpty: true }, (row: any) => {
    row.eachCell({ includeEmpty: true }, (cell: any) => {
      try { cell.value = null } catch {}
    })
  })

  // Column widths (match Python script)
  ws.getColumn('A').width = 64.9
  ws.getColumn('B').width = 4.7
  ws.getColumn('C').width = 65.3
  ws.getColumn('D').width = 4.3
  ws.getColumn('E').width = 12

  writeAviso(ws)

  for (let idx = 0; idx < preventivo.puntos.length; idx++) {
    const p = preventivo.puntos[idx]
    const base = 1 + idx * 14

    const fotoAnt = p.fotoAntes || p.fotoLevantamiento || null
    const fotoDsp = p.fotoDespues || null

    const desc   = [p.descripcion, p.direccion].filter(Boolean).join(', ')
    const dirSuf = p.direccion ? `, ${p.direccion}` : ''
    const obsAnt = `Observación: ${p.descripcion || p.nombre || ''}${dirSuf}`
    const obsDsp = p.correccion
      ? `Observación: ${[p.direccion, p.correccion].filter(Boolean).join(', ')}`
      : 'Observación:'

    await writeBlock(workbook, ws, base, desc, obsAnt, obsDsp, fotoAnt, fotoDsp, p.nombre)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writeAviso(ws: any) {
  const border = { top: MEDIUM_SIDE, bottom: MEDIUM_SIDE, left: MEDIUM_SIDE, right: MEDIUM_SIDE }

  ws.mergeCells('F2:K2')
  const hdr = ws.getCell('F2')
  hdr.value     = 'IMPORTANTE'
  hdr.font      = { name: 'Calibri', bold: true, size: 11 }
  hdr.alignment = { horizontal: 'center', vertical: 'middle' }
  hdr.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELL_ARGB } }
  hdr.border    = border
  ws.getRow(2).height = 18.6

  ws.mergeCells('F3:K7')
  const txt = ws.getCell('F3')
  txt.value = [
    '• Los 15 ITEMs deben tener fotos del ANTES.',
    '• Todos los hallazgos que son reparados deben tener fotos del ANTES Y EL DESPUÉS.',
    '• Los elementos de red a revisar que NO existen deben dejar en la observación de la foto NO APLICA En cuadrante y se debe dejar la foto en blanco.',
    '• Si existe más de 1 elemento a revisar, deben duplicar el cuadrado de la foto.',
  ].join('\n')
  txt.font      = { name: 'Calibri', size: 10 }
  txt.alignment = { horizontal: 'left', vertical: 'top', wrapText: true }
  txt.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE_ARGB } }
  txt.border    = border
  for (let r = 3; r <= 7; r++) ws.getRow(r).height = 28.0
}

async function writeBlock(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workbook: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws: any,
  base: number,
  desc: string,
  obsAnt: string,
  obsDsp: string,
  fotoAnt: Punto['fotoAntes'] | null,
  fotoDsp: Punto['fotoDespues'] | null,
  nombre: string,
) {
  const centerAlign = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true }
  const leftAlign   = { horizontal: 'left'   as const, vertical: 'top'    as const, wrapText: true }
  const boldWhite   = { name: 'Calibri', bold: true, size: 14, color: { argb: WHITE_ARGB } }
  const boldBlack   = { name: 'Calibri', bold: true, size: 11 }
  const hdrFill     = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: HDR_COLOR } }

  // Row base: "ANTES" / "DESPUÉS"
  for (const [col, txt] of [[1, 'ANTES'], [3, 'DESPUÉS']] as const) {
    const cell = ws.getCell(base, col)
    cell.value = txt; cell.font = boldWhite; cell.alignment = centerAlign; cell.fill = hdrFill
  }
  ws.getRow(base).height = 18.6

  // Row base+1: description
  for (const col of [1, 3]) {
    const cell = ws.getCell(base + 1, col)
    cell.value = desc; cell.font = boldWhite; cell.alignment = centerAlign; cell.fill = hdrFill
  }
  ws.getRow(base + 1).height = 21.45

  // Rows base+2..base+10 (9 rows): image area
  const imgRow = base + 2
  const N_IMG_ROWS = 9
  const ROW_H = Math.max((340 * 0.75) / N_IMG_ROWS, 15)  // ~28.3 pt
  for (let r = imgRow; r < imgRow + N_IMG_ROWS; r++) ws.getRow(r).height = ROW_H
  ws.mergeCells(imgRow, 1, imgRow + N_IMG_ROWS - 1, 1)
  ws.mergeCells(imgRow, 3, imgRow + N_IMG_ROWS - 1, 3)

  // Images (col A = 0-indexed col 0, col C = 0-indexed col 2)
  for (const [foto, col0] of [[fotoAnt, 0], [fotoDsp, 2]] as const) {
    if (!foto?.previewUrl) continue
    try {
      const buf = await urlToBuffer(foto.previewUrl)
      const imgId = workbook.addImage({ buffer: buf, extension: 'jpeg' })
      ws.addImage(imgId, {
        tl: { col: col0,     row: imgRow - 1 }, // ExcelJS uses 0-indexed
        br: { col: col0 + 1, row: imgRow + N_IMG_ROWS - 1 },
        editAs: 'oneCell',
      })
    } catch { /* image unavailable — leave blank */ }
  }

  // Nombre label in col E (helper column, visible in Excel but outside the report frame)
  if (nombre) {
    const lblRow = imgRow + Math.floor(N_IMG_ROWS / 2)
    const lbl = ws.getCell(lblRow, 5)
    lbl.value     = String(nombre).trim()
    lbl.font      = { name: 'Calibri', bold: true, size: 14, color: { argb: GREY_ARGB } }
    lbl.alignment = { horizontal: 'left', vertical: 'middle' }
  }

  // Rows base+11..base+12: observations (merged 2 rows each)
  const rObs = base + 11
  ws.mergeCells(rObs, 1, rObs + 1, 1)
  ws.mergeCells(rObs, 3, rObs + 1, 3)
  const oA = ws.getCell(rObs, 1)
  oA.value = obsAnt; oA.font = boldBlack; oA.alignment = leftAlign
  const oD = ws.getCell(rObs, 3)
  oD.value = obsDsp; oD.font = boldBlack; oD.alignment = leftAlign
  ws.getRow(rObs).height     = 21.45
  ws.getRow(rObs + 1).height = 21.45

  // Row base+13: spacer
  ws.getRow(base + 13).height = 15.0

  // Outer border (medium, black) on rows base..base+12, cols A-C
  // Column B (col 2): no top/bottom border
  for (let r = base; r <= base + 12; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(r, c)
      const isSep = c === 2
      cell.border = {
        top:    isSep ? NO_SIDE : MEDIUM_SIDE,
        bottom: isSep ? NO_SIDE : MEDIUM_SIDE,
        left:   MEDIUM_SIDE,
        right:  MEDIUM_SIDE,
      }
    }
  }
}
