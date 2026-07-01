import { ATT_LOGO_B64 } from './logoBase64'
import { TIPO_PROYECTO_LABELS } from '../types'
import type { AttRecord, FotoEntry } from '../types'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fechaDesdeISO(iso?: string): string {
  if (!iso) { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')} ${MESES[d.getMonth()]} ${d.getFullYear()}` }
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2,'0')} ${MESES[m - 1]} ${y}`
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const CAT_LABELS: Record<string, string> = {
  tendidoFO:       'TENDIDO FO',
  cmic:            'CMIC',
  medicionTraza:   'MEDICIÓN TRAZA',
  reparacionDucto: 'REPARACIÓN DE DUCTO',
  mufaProyectada:  'MUFA PROYECTADA',
  ingresoRed:      'INGRESO A RED',
}

function fotoLabel(f: FotoEntry): string {
  if (f.categoria === 'otro') return (f.otroLabel?.trim() || 'OTRO').toUpperCase()
  return CAT_LABELS[f.categoria] ?? f.categoria.toUpperCase()
}

function isLand(f: FotoEntry): boolean {
  return f.categoria === 'medicionTraza'
}

// Controla el tamaño de salida del canvas (Chrome PDF no puede inflar píxeles que no existen)
// px a 96 DPI para impresión a ~150 DPI → factor ~1.56x respecto a pulgadas
// Columna portrait: ~2.8" × 150 DPI ≈ 420 px. Landscape: ~5.7" × 150 DPI ≈ 855 px.
const PORT_W = 420,  PORT_H = 560
const LAND_W = 855,  LAND_H = 555
const AERO_W = 700,  AERO_H = 470
const JPEG_Q = 0.68  // calidad moderada; el tamaño lo controlan las dimensiones

async function compressImg(url: string, maxW: number, maxH: number): Promise<string> {
  if (!url) return ''
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
      const s = Math.min(1, maxW / w, maxH / h)
      w = Math.round(w * s); h = Math.round(h * s)
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', JPEG_Q))
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

export async function generarPdfAtt(record: AttRecord): Promise<void> {
  const fecha    = fechaDesdeISO(record.fecha)
  const ott      = record.ott || ''
  const titulo   = record.tituloInforme?.trim() || `Informe posterior OTT ${ott}`
  const cs       = record.codigoServicio ?? ''
  const csNombre = [cs, record.nombreServicio].filter(Boolean).join(' ')
  const idProyecto = [ott, cs].filter(Boolean).join(' - ')

  // ── Comprimir fotos con dimensiones correctas según tipo ──
  const compMap = new Map<string, string>()
  await Promise.all([
    record.fotoAerea?.previewUrl
      ? compressImg(record.fotoAerea.previewUrl, AERO_W, AERO_H)
          .then(c => { if (c) compMap.set(record.fotoAerea!.previewUrl, c) })
      : Promise.resolve(),
    ...record.fotos.map(f => {
      const url = f.previewUrl
      if (!url) return Promise.resolve()
      const [mW, mH] = isLand(f) ? [LAND_W, LAND_H] : [PORT_W, PORT_H]
      return compressImg(url, mW, mH).then(c => { if (c) compMap.set(url, c) })
    }),
  ])

  const ci = (url?: string) => url ? (compMap.get(url) ?? '') : ''

  // ── Tipo de proyecto ──
  const TIPO_GRID: [string, string][] = [
    ['acceso_fijo','backhaul'],['conectividad_movil','acceso_b2b'],
    ['proyectos_acceso','modernizacion'],['vulnerabilidad','adaptacion'],
  ]
  const tipoHtml = TIPO_GRID.map(([l, r]) => {
    const sL = record.tipoProyecto === l, sR = record.tipoProyecto === r
    const lbl = (k: string) => esc(TIPO_PROYECTO_LABELS[k as keyof typeof TIPO_PROYECTO_LABELS] || k)
    return `<tr>
      <td class="tlbl${sL?' tsel':''}">${lbl(l)}</td><td class="tck">${sL?'X':''}</td>
      <td class="tlbl${sR?' tsel':''}">${lbl(r)}</td><td class="tck">${sR?'X':''}</td>
    </tr>`
  }).join('')

  // ── Descripción ──
  const validTramos = record.tramos.filter(t => t.tipoCable||t.metraje||t.desde||t.hasta)
  let descHtml = validTramos.map((t, ti) => {
    const end = ti === validTramos.length - 1 ? '.' : ';'
    return `<p class="dp">Se realiza tendido de ${esc(t.metraje||'___')}m de cable ${esc(t.tipoCable||'___')} desde ${esc(t.desde||'___')} hasta ${esc(t.hasta||'___')}${end}</p>`
  }).join('')
  if (record.instalaCMIC)          descHtml += `<p class="dp">Se instala CMIC en cliente;</p>`
  if (record.instalaMufas)         descHtml += `<p class="dp">Se instala mufa proyectada;</p>`
  if (record.tieneReparacionDucto) descHtml += `<p class="dp">Se realiza calicata y reparación de ducto;</p>`
  if (record.tieneIngresoRed) {
    descHtml += `<p class="dp">Con ingreso a red;</p>`
    const { nodo, rack, odf, fo } = record.ingresoRed
    if (nodo) descHtml += `<p class="dp ind">NODO    ${esc(nodo)}</p>`
    if (rack) descHtml += `<p class="dp ind">RACK    ${esc(rack)}</p>`
    if (odf)  descHtml += `<p class="dp ind">ODF     ${esc(odf)}</p>`
    if (fo)   descHtml += `<p class="dp ind">FO      ${esc(fo)}</p>`
  }
  for (const h of record.hitos) {
    const text = [h.fecha, h.descripcion].filter(Boolean).join(' — ')
    if (text) descHtml += `<p class="dp ind hito">• ${esc(text)}</p>`
  }
  if (!descHtml) descHtml = '<p class="dp">&nbsp;</p>'

  // ── Infraestructura ──
  const { postesElectricos:pe, postesOtraTeleco:pt, ductosOtraTeleco:dt,
          fibraOtraCompania:fo2, postesEntel:pE } = record.infraestructura
  const irow = (label: string, usa: boolean, cant = '', comp = '') =>
    `<tr><td>${esc(label)}</td><td class="c">${usa?'SI':'NO'}</td><td class="c">${esc(cant)}</td><td>${esc(comp)}</td></tr>`

  // ── Sección 5: Fotos ──
  // Landscape = 2 slots (fila completa), portrait = 1 slot (media fila).
  // Página: máx. 4 slots = 2 filas portrait, o 1 landscape + 1 fila portrait.
  let fotosHtml = ''
  let slots = 0
  let i = 0
  while (i < record.fotos.length) {
    const f = record.fotos[i]
    const land = isLand(f)
    const need = land ? 2 : 1

    if (slots > 0 && slots + need > 4) {
      fotosHtml += '<div class="pb"></div>'
      slots = 0
    } else if (slots > 0) {
      fotosHtml += '<div style="height:5pt"></div>'
    }

    if (land) {
      // Foto horizontal — fila completa
      const src = ci(f.previewUrl)
      fotosHtml += `
<div class="lrow">
  <div class="plabel">${esc(fotoLabel(f))}</div>
  ${src ? `<img class="limg" src="${src}" alt="${esc(fotoLabel(f))}" />` : '<div style="height:170pt"></div>'}
</div>`
      slots += 2
      i++
    } else if (i + 1 < record.fotos.length && !isLand(record.fotos[i + 1])) {
      // Par de fotos portrait
      const f2 = record.fotos[i + 1]
      const s1 = ci(f.previewUrl), s2 = ci(f2.previewUrl)
      fotosHtml += `
<div class="prow">
  <div class="pbox">
    <div class="plabel">${esc(fotoLabel(f))}</div>
    ${s1 ? `<img class="pimg" src="${s1}" alt="${esc(fotoLabel(f))}" />` : '<div class="pempty"></div>'}
  </div>
  <div class="pbox">
    <div class="plabel">${esc(fotoLabel(f2))}</div>
    ${s2 ? `<img class="pimg" src="${s2}" alt="${esc(fotoLabel(f2))}" />` : '<div class="pempty"></div>'}
  </div>
</div>`
      slots += 2
      i += 2
    } else {
      // Foto portrait sola
      const s1 = ci(f.previewUrl)
      fotosHtml += `
<div class="prow">
  <div class="pbox">
    <div class="plabel">${esc(fotoLabel(f))}</div>
    ${s1 ? `<img class="pimg" src="${s1}" alt="${esc(fotoLabel(f))}" />` : '<div class="pempty"></div>'}
  </div>
  <div class="pbox"></div>
</div>`
      slots += 1
      i++
    }
  }

  // ── Foto aérea ──
  const aereoSrc = ci(record.fotoAerea?.previewUrl)
  const aereoHtml = aereoSrc ? `
<h2 class="sh">FOTO AÉREA</h2>
<div style="text-align:center;margin-bottom:10pt">
  <img src="${aereoSrc}" style="max-width:90%;max-height:260pt;object-fit:contain" />
</div>` : ''

  const logoSrc = `data:image/jpeg;base64,${ATT_LOGO_B64}`

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
<style>
@page{size:letter;margin:1.25in 1.25in 0.75in 1.25in}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Calibri,Arial,sans-serif;font-size:10pt;color:#000}
.hdr{width:100%;border-collapse:collapse;margin-bottom:9pt;border:2px double #000}
.hdr td{border:1px solid #000;padding:4pt 5pt;vertical-align:middle}
.hdr .logo{width:15%;text-align:center}.hdr .logo img{max-width:100%;max-height:34pt;object-fit:contain}
.hdr .ttl{text-align:center;font-family:Verdana,sans-serif;font-size:14pt;font-weight:bold}
.hdr .dlbl{text-align:center;font-size:10pt;font-weight:bold}
.hdr .dval{text-align:center;font-size:9pt}
.hdr .ottc{text-align:center;font-family:Cambria,serif;font-size:9pt}
.hdr .csc{text-align:center;font-size:9pt}
.hdr .pgc{text-align:center;font-size:9pt;font-weight:bold}
.sh{font-family:Calibri,sans-serif;font-size:11pt;font-weight:bold;color:#4F81BD;margin:8pt 0 4pt}
.tt{width:100%;border-collapse:collapse;margin-bottom:7pt}
.tt td{border:1px solid #000;padding:3pt 5pt;font-size:8.5pt}
.tlbl{background:#0070C0;color:#fff;width:38%;font-family:"Arial Black",Arial,sans-serif;font-weight:bold;text-align:center}
.tsel{background:#004e8c}.tck{width:12%;text-align:center;font-weight:bold}
.datos p{font-family:Cambria,serif;font-size:10pt;margin:2pt 0}.val{font-weight:bold}
.dp{font-family:Cambria,serif;font-size:10pt;margin:2pt 0}
.dp.ind{margin-left:18pt}.dp.hito{font-family:Aptos,Calibri,sans-serif}
.it{width:100%;border-collapse:collapse;margin-bottom:7pt}
.it th{background:#0070C0;color:#fff;font-family:"Arial Black",Arial,sans-serif;font-size:11pt;font-weight:bold;border:1px solid #000;padding:5pt 7pt;text-align:center}
.it td{border:1px solid #000;padding:4pt 7pt;font-family:Arial,sans-serif;font-size:10pt}
.it td.c{text-align:center}
/* Portrait: par lado a lado */
.prow{display:flex;gap:8pt;break-inside:avoid}
.pbox{flex:1;border:1px solid #000;display:flex;flex-direction:column;min-height:170pt}
.plabel{border-bottom:1px solid #000;padding:3pt 5pt;font-size:9pt;font-weight:bold;text-align:center;min-height:20pt}
.pimg{width:100%;object-fit:contain;max-height:190pt;flex:1}
.pempty{flex:1;min-height:150pt}
/* Landscape: fila completa */
.lrow{border:1px solid #000;break-inside:avoid;margin-bottom:0}
.limg{width:100%;object-fit:contain;max-height:200pt;display:block}
/* Salto de página */
.pb{page-break-after:always}
.pbtn{position:fixed;top:10px;right:10px;padding:8px 16px;background:#0070C0;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11pt;z-index:9999}
@media print{.pbtn{display:none}}
</style></head><body>

<button class="pbtn" onclick="window.print()">🖨 Guardar PDF</button>

<table class="hdr">
  <tr>
    <td class="logo"><img src="${logoSrc}" alt="Entel" /></td>
    <td class="ttl">${esc(titulo)}</td>
    <td style="width:22%"><div class="dlbl">FECHA INFORME</div><div class="dval">${esc(fecha)}</div></td>
  </tr>
  <tr>
    <td class="ottc">${esc(ott)}</td>
    <td class="csc">${esc(csNombre)}</td>
    <td class="pgc">Página 1 de 1</td>
  </tr>
</table>

<h2 class="sh">1. TIPO DE PROYECTO</h2><br>
<table class="tt">${tipoHtml}</table>

<h2 class="sh">2. DATOS DEL PROYECTO</h2><br>
<div class="datos">
  <p>Nombre del proyecto: <span class="val">${esc(record.nombreProyecto)}</span></p>
  <p>Iniciativa del proyecto: <span class="val">${esc(record.iniciativa)}</span></p>
  <p>ID de Proyecto: <span class="val">${esc(idProyecto)}</span></p>
  <p>Ingeniero Proyecto: <span class="val">${esc(record.ingenieroProyecto)}</span></p>
  <p>Jefe de Proyecto: <span class="val">${esc(record.jefeProyecto)}</span></p>
  <p>Comuna: <span class="val">${esc(record.comuna)}</span></p>
  <p>Región: <span class="val">${esc(record.region)}</span></p>
  <p>Contratista: <span class="val">${esc(record.contratista)}</span></p>
  <p>Coordenadas inicio: Latitud <span class="val">${esc(record.coordsInicio.lat)} S</span> &emsp; Longitud <span class="val">${esc(record.coordsInicio.lng)} W</span></p>
  <p>Coordenadas término: Latitud <span class="val">${esc(record.coordsTermino.lat)} S</span> &emsp; Longitud <span class="val">${esc(record.coordsTermino.lng)} W</span></p>
</div>

<h2 class="sh">3. DESCRIPCIÓN GENERAL DEL PROYECTO</h2>
${descHtml}

<div class="pb"></div>

${aereoHtml}
<h2 class="sh">4. INFRAESTRUCTURA PARA UTILIZAR</h2><br>
<table class="it">
  <tr><th style="width:55%">Infraestructura</th><th style="width:15%">Sí / No</th><th style="width:15%">Cantidad</th><th style="width:15%">Compañía</th></tr>
  ${irow('¿Utiliza postes eléctricos?',                   pe.usa,  pe.usa?pe.cantidad:'', pe.usa?pe.compania:'')}
  ${irow('¿Utiliza postes de otra compañía de teleco?',   pt.usa,  pt.usa?pt.cantidad:'', pt.usa?pt.compania:'')}
  ${irow('¿Utiliza ductos de otra compañía de teleco?',   dt.usa,  dt.usa?dt.cantidad:'', dt.usa?dt.compania:'')}
  ${irow('¿Utiliza fibra óptica de otra compañía?',       fo2.usa)}
  ${irow('¿Se proyectan postes/ductos de Entel?',         pE.usa)}
</table>

<div class="pb"></div>

<h2 class="sh">5. DETALLE DE SINGULARIDADES Y REGISTROS FOTOGRÁFICOS.</h2>
${fotosHtml}

</body></html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('El navegador bloqueó la ventana emergente.\nPermite las ventanas emergentes para este sitio e intenta de nuevo.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
