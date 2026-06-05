import { useState } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props { preventivo: Preventivo; label?: string }
const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

export function ExportZipButton({ preventivo, label = '📦 Exportar ZIP' }: Props) {
  const [state, setState] = useState<'idle'|'loading'|'done'>('idle')
  async function handleExport() {
    setState('loading')
    try {
      const zip = new JSZip()
      const f = zip.folder('fotos')!
      const plano = preventivo.cuadrante.fotoPlano
      if (plano?.blobId) { const e = await getPhotoBlob(plano.blobId); if (e) f.file(plano.fileName, e.blob) }
      for (const p of preventivo.puntos) {
        for (const k of FOTO_KEYS) {
          const foto = p[k]; if (!foto?.blobId) continue
          const e = await getPhotoBlob(foto.blobId); if (e) f.file(foto.fileName, e.blob)
        }
      }
      zip.file('telecom_v1.json', JSON.stringify({ version:1, app:'TelecomCatalog', exportedAt:new Date().toISOString(),
        levantamiento:{ id:preventivo.id, createdAt:preventivo.createdAt, updatedAt:preventivo.updatedAt,
          cuadrante:{ ...preventivo.cuadrante, fotoPlano: plano ? {fileName:plano.fileName,capturedAt:plano.capturedAt} : null },
          puntos: preventivo.puntos.map(p=>({ id:p.id, nombre:p.nombre, descripcion:p.descripcion, direccion:p.direccion, correccion:p.correccion,
            fotos:{ levantamiento: p.fotoLevantamiento?{fileName:p.fotoLevantamiento.fileName,capturedAt:p.fotoLevantamiento.capturedAt}:null,
                    antes: p.fotoAntes?{fileName:p.fotoAntes.fileName,capturedAt:p.fotoAntes.capturedAt}:null,
                    despues: p.fotoDespues?{fileName:p.fotoDespues.fileName,capturedAt:p.fotoDespues.capturedAt}:null } })) }
      }, null, 2))
      const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `telecom_${(preventivo.cuadrante.cuadrante||'x').replace(/[^a-z0-9-]/gi,'_')}_${(preventivo.cuadrante.comuna||'x').replace(/[^a-z0-9-]/gi,'_')}_${new Date().toISOString().slice(0,10)}.zip`
      a.click(); URL.revokeObjectURL(a.href)
      setState('done'); setTimeout(()=>setState('idle'),3000)
    } catch(err) { console.error(err); setState('idle') }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleExport} disabled={state==='loading'}
        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${state==='done'?'bg-green-700 text-white':'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
        {state==='loading'?'⏳ Generando ZIP…':state==='done'?'✅ ZIP listo':label}
      </button>
      {state==='done'&&<p className="text-[10px] text-slate-400">⚠ En WhatsApp: enviar como <strong>Documento</strong></p>}
    </div>
  )
}
