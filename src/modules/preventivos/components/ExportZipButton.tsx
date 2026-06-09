import { useState } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props { preventivo: Preventivo; label?: string }
const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

const hasShareApi = typeof navigator !== 'undefined' && 'share' in navigator

export function ExportZipButton({ preventivo, label }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleExport() {
    setState('loading')
    try {
      // ── Construir ZIP ────────────────────────────────────────────────────────
      const zip = new JSZip()
      const f = zip.folder('fotos')!
      const plano = preventivo.cuadrante.fotoPlano
      if (plano?.blobId) {
        const e = await getPhotoBlob(plano.blobId)
        if (e) f.file(plano.fileName, e.blob)
      }
      for (const p of preventivo.puntos) {
        for (const k of FOTO_KEYS) {
          const foto = p[k]
          if (!foto?.blobId) continue
          const e = await getPhotoBlob(foto.blobId)
          if (e) f.file(foto.fileName, e.blob)
        }
      }
      zip.file('telecom_v1.json', JSON.stringify({
        version: 1, app: 'TelecomCatalog', exportedAt: new Date().toISOString(),
        levantamiento: {
          id: preventivo.id, createdAt: preventivo.createdAt, updatedAt: preventivo.updatedAt,
          cuadrante: {
            ...preventivo.cuadrante,
            fotoPlano: plano ? { fileName: plano.fileName, capturedAt: plano.capturedAt } : null,
          },
          puntos: preventivo.puntos.map((p) => ({
            id: p.id, nombre: p.nombre, descripcion: p.descripcion,
            direccion: p.direccion, correccion: p.correccion,
            fotos: {
              levantamiento: p.fotoLevantamiento ? { fileName: p.fotoLevantamiento.fileName, capturedAt: p.fotoLevantamiento.capturedAt } : null,
              antes: p.fotoAntes ? { fileName: p.fotoAntes.fileName, capturedAt: p.fotoAntes.capturedAt } : null,
              despues: p.fotoDespues ? { fileName: p.fotoDespues.fileName, capturedAt: p.fotoDespues.capturedAt } : null,
            },
          })),
        },
      }, null, 2))

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const slug = (s?: string) => (s || 'x').replace(/[^a-z0-9-]/gi, '_')
      const fileName = `telecom_${slug(preventivo.cuadrante.cuadrante)}_${slug(preventivo.cuadrante.comuna)}_${new Date().toISOString().slice(0, 10)}.zip`

      // ── Web Share API: abre la hoja nativa del SO directamente ───────────────
      // Se intenta siempre que la API exista; si el navegador no soporta archivos
      // lanza un error que no es AbortError y caemos al fallback de descarga.
      if (hasShareApi) {
        const file = new File([blob], fileName, { type: 'application/zip' })
        try {
          await navigator.share({
            files: [file],
            title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
            text: `Levantamiento ${[preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna].filter(Boolean).join(' — ')}`,
          })
          // El usuario compartió (o cerró la hoja — ambos casos son "ok")
          setState('done')
          setTimeout(() => setState('idle'), 2500)
          return
        } catch (err) {
          // AbortError = el usuario cerró la hoja sin compartir → back to idle
          if ((err as Error).name === 'AbortError') { setState('idle'); return }
          // Cualquier otro error (ej. NotSupportedError en desktop) → descarga
        }
      }

      // ── Fallback: descarga directa (escritorio, Firefox, etc.) ───────────────
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
      setState('done')
      setTimeout(() => setState('idle'), 3000)

    } catch (err) {
      console.error('Error al exportar ZIP:', err)
      setState('idle')
    }
  }

  const cfg = {
    idle:    { text: label ?? (hasShareApi ? '📤 Compartir ZIP' : '📦 Exportar ZIP'), cls: 'bg-emerald-700 hover:bg-emerald-600 text-white' },
    loading: { text: '⏳ Preparando…',  cls: 'bg-slate-600 text-slate-300 cursor-wait' },
    done:    { text: '✅ Listo',         cls: 'bg-green-700 text-white' },
  }
  const { text, cls } = cfg[state]

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleExport} disabled={state === 'loading'}
        className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${cls}`}>
        {text}
      </button>
      {state === 'done' && !hasShareApi && (
        <p className="text-[10px] text-slate-400">⚠ En WhatsApp: enviar como <strong>Documento</strong></p>
      )}
    </div>
  )
}
