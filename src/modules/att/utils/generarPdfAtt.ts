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

// Comprime una imagen a JPEG hasta que quepa en maxBytes (datos binarios aprox.)
async function compressToTarget(url: string, maxBytes: number): Promise<string> {
  if (!url) return ''
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth, h = img.naturalHeight
      const MAX = 1024
      if (w > MAX || h > MAX) { const s = MAX / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s) }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      // Búsqueda binaria: longitud base64 × 0.75 ≈ bytes reales
      let lo = 0.05, hi = 0.92, best = canvas.toDataURL('image/jpeg', 0.1)
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2
        const candidate = canvas.toDataURL('image/jpeg', mid)
        if (candidate.length * 0.75 <= maxBytes) { best = candidate; lo = mid }
        else hi = mid
      }
      resolve(best)
    }
    img.onerror = () => resolve('')
    img.src = url
  })
}

// Par de fotos lado a lado
function photoRowHtml(
  f1: FotoEntry, img1: string,
  f2?: FotoEntry, img2?: string,
): string {
  const box = (f: FotoEntry, src: string) => `
    <div class="pbox">
      <div class="plabel">${esc(fotoLabel(f))}</div>
      ${src ? `<img class="pimg" src="${src}" alt="${esc(fotoLabel(f))}" />` : '<div class="pempty"></div>'}
    </div>`
  return `<div class="prow">${box(f1, img1)}${f2 ? box(f2, img2 ?? '') : '<div class="pbox"></div>'}</div>`
}

export async function generarPdfAtt(record: AttRecord): Promise<void> {
  const fecha    = fechaDesdeISO(record.fecha)
  const ott      = record.ott || ''
  const titulo   = record.tituloInforme?.trim() || `Informe posterior OTT ${ott}`
  const cs       = record.codigoServicio ?? ''
  const csNombre = [cs, record.nombreServicio].filter(Boolean).join(' ')
  const idProyecto = [ott, cs].filter(Boolean).join(' - ')

  // Recopilar todas las URLs con foto
  const allUrls = [
    record.fotoAerea?.previewUrl,
    ...record.fotos.map(f => f.previewUrl),
  ].filter(Boolean) as string[]

  // Presupuesto: 550 KB total, ~60 KB para estructura/texto
  const TOTAL  = 550 * 1024
  const OVERHEAD = 65 * 1024
  const perPhoto = allUrls.length > 0 ? Math.floor((TOTAL - OVERHEAD) / allUrls.length) : TOTAL - OVERHEAD

  // Comprimir en paralelo
  const compressed = new Map<string, string>()
  await Promise.all(allUrls.map(async url => {
    const c = await compressToTarget(url, perPhoto)
    if (c) compressed.set(url, c)
  }))

  const ci = (url?: string) => (url ? compressed.get(url) ?? '' : '')

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

  // ── Fotos (4 por página, pares de 2) ──
  let fotosHtml = ''
  let photosOnPage = 0
  for (let i = 0; i < record.fotos.length; ) {
    if (photosOnPage > 0 && photosOnPage >= 4) { fotosHtml += '<div class="pb"></div>'; photosOnPage = 0 }
    const f1 = record.fotos[i]
    const f2 = record.fotos[i + 1]
    fotosHtml += photoRowHtml(f1, ci(f1.previewUrl), f2, f2 ? ci(f2.previewUrl) : undefined)
    const added = f2 ? 2 : 1
    photosOnPage += added
    i += added
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
/* Encabezado */
.hdr{width:100%;border-collapse:collapse;margin-bottom:9pt;border:2px double #000}
.hdr td{border:1px solid #000;padding:4pt 5pt;vertical-align:middle}
.hdr .logo{width:15%;text-align:center}.hdr .logo img{max-width:100%;max-height:34pt;object-fit:contain}
.hdr .ttl{text-align:center;font-family:Verdana,sans-serif;font-size:14pt;font-weight:bold}
.hdr .dlbl{text-align:center;font-size:10pt;font-weight:bold}
.hdr .dval{text-align:center;font-size:9pt}
.hdr .ottc{text-align:center;font-family:Cambria,serif;font-size:9pt}
.hdr .csc{text-align:center;font-size:9pt}
.hdr .pgc{text-align:center;font-size:9pt;font-weight:bold}
/* Secciones */
.sh{font-family:Calibri,sans-serif;font-size:11pt;font-weight:bold;color:#4F81BD;margin:8pt 0 4pt}
/* Tipo proyecto */
.tt{width:100%;border-collapse:collapse;margin-bottom:7pt}
.tt td{border:1px solid #000;padding:3pt 5pt;font-size:8.5pt}
.tlbl{background:#0070C0;color:#fff;width:38%;font-family:"Arial Black",Arial,sans-serif;font-weight:bold;text-align:center}
.tsel{background:#004e8c}
.tck{width:12%;text-align:center;font-weight:bold}
/* Datos */
.datos p{font-family:Cambria,serif;font-size:10pt;margin:2pt 0}
.val{font-weight:bold}
/* Descripción */
.dp{font-family:Cambria,serif;font-size:10pt;margin:2pt 0}
.dp.ind{margin-left:18pt}
.dp.hito{font-family:Aptos,Calibri,sans-serif}
/* Infra */
.it{width:100%;border-collapse:collapse;margin-bottom:7pt}
.it th{background:#0070C0;color:#fff;font-family:"Arial Black",Arial,sans-serif;font-size:11pt;font-weight:bold;border:1px solid #000;padding:5pt 7pt;text-align:center}
.it td{border:1px solid #000;padding:4pt 7pt;font-family:Arial,sans-serif;font-size:10pt}
.it td.c{text-align:center}
/* Fotos */
.prow{display:flex;gap:8pt;margin-bottom:6pt;break-inside:avoid}
.pbox{flex:1;border:1px solid #000;display:flex;flex-direction:column}
.plabel{border-bottom:1px solid #000;padding:3pt 5pt;font-size:9pt;font-weight:bold;text-align:center;min-height:22pt}
.pimg{width:100%;object-fit:contain;max-height:150pt}
.pempty{flex:1;min-height:120pt}
/* Salto de página */
.pb{page-break-after:always}
/* Botón imprimir */
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
  ${irow('¿Utiliza postes eléctricos?',              pe.usa,  pe.usa?pe.cantidad:'', pe.usa?pe.compania:'')}
  ${irow('¿Utiliza postes de otra compañía de teleco?', pt.usa, pt.usa?pt.cantidad:'', pt.usa?pt.compania:'')}
  ${irow('¿Utiliza ductos de otra compañía de teleco?', dt.usa, dt.usa?dt.cantidad:'', dt.usa?dt.compania:'')}
  ${irow('¿Utiliza fibra óptica de otra compañía?', fo2.usa)}
  ${irow('¿Se proyectan postes/ductos de Entel?',   pE.usa)}
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
