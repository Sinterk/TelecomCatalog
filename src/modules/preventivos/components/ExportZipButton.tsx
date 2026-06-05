import { useState } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props {
  preventivo: Preventivo
  label?: string
}

const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

export function ExportZipButton({ preventivo, label = '📦 Exportar ZIP' }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleExport() {
    setState('loading')
    try {
      const zip = new JSZip()
      const fotosFolder = zip.folder('fotos')!

      // Plano del cuadrante
      const plano = preventivo.cuadrante.fotoPlano
      if (plano?.blobId) {
        const entry = await getPhotoBlob(plano.blobId)
        if (entry) fotosFolder.file(plano.fileName, entry.blob)
      }

      // Fotos de puntos
      for (const punto of preventivo.puntos) {
        for (const key of FOTO_KEYS) {
          const foto = punto[key]
          if (!foto?.blobId) continue
          const entry = await getPhotoBlob(foto.blobId)
          if (entry) fotosFolder.file(foto.fileName, entry.blob)
        }
      }

      // Metadata JSON
      const meta = {
        version: 1,
        app: 'TelecomCatalog',
        exportedAt: new Date().toISOString(),
        levantamiento: {
          id: preventivo.id,
          createdAt: preventivo.createdAt,
          updatedAt: preventivo.updatedAt,
          cuadrante: {
            ...preventivo.cuadrante,
            fotoPlano: plano
              ? { fileName: plano.fileName, capturedAt: plano.capturedAt }
              : null,
          },
          puntos: preventivo.puntos.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            descripcion: p.descripcion,
            direccion: p.direccion,
            correccion: p.correccion,
            fotos: {
              levantamiento: p.fotoLevantamiento
                ? { fileName: p.fotoLevantamiento.fileName, capturedAt: p.fotoLevantamiento.capturedAt }
                : null,
              antes: p.fotoAntes
                ? { fileName: p.fotoAntes.fileName, capturedAt: p.fotoAntes.capturedAt }
                : null,
              despues: p.fotoDespues
                ? { fileName: p.fotoDespues.fileName, capturedAt: p.fotoDespues.capturedAt }
                : null,
            },
          })),
        },
      }

      zip.file('telecom_v1.json', JSON.stringify(meta, null, 2))

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      })

      const cuad = (preventivo.cuadrante.cuadrante || 'sin-id').replace(/[^a-zA-Z0-9-]/g, '_')
      const com = (preventivo.cuadrante.comuna || 'sin-comuna').replace(/[^a-zA-Z0-9-]/g, '_')
      const fecha = new Date().toISOString().slice(0, 10)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `telecom_${cuad}_${com}_${fecha}.zip`
      a.click()
      URL.revokeObjectURL(a.href)

      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch (err) {
      console.error('[export]', err)
      setState('idle')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleExport} disabled={state === 'loading'}
        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60
          ${state === 'done' ? 'bg-green-700 text-white' : 'bg-emerald-700 hover:bg-emerald-600 text-white'}`}>
        {state === 'loading' ? '⏳ Generando ZIP…' : state === 'done' ? '✅ ZIP listo' : label}
      </button>
      {state === 'done' && (
        <p className="text-[10px] text-slate-400">
          ⚠ Enviar por WhatsApp como <strong>Documento</strong>, no como imagen
        </p>
      )}
    </div>
  )
}
