import { useState } from 'react'
import JSZip from 'jszip'
import { getPhotoBlobsByPreventivo } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../../types'

interface Props {
  preventivo: Preventivo
}

/** Sanitiza el nombre del punto para usarlo como nombre de archivo */
function safeName(str: string): string {
  return str.trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g, '_').slice(0, 40) || 'Punto'
}

const FOTO_SUFFIX: Record<FotoKey, string> = {
  fotoLevantamiento: 'levantamiento',
  fotoAntes: 'antes',
  fotoDespues: 'despues',
}

export function DownloadButton({ preventivo }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const zip = new JSZip()
      const { cuadrante, puntos } = preventivo

      // Construir metadata JSON
      const metadataPuntos = puntos.map((p) => {
        const fileBase = safeName(p.nombre || p.descripcion)
        return {
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion,
          direccion: p.direccion,
          correccion: p.correccion ?? '',
          fotos: {
            levantamiento: p.fotoLevantamiento ? `${fileBase}_levantamiento.jpeg` : null,
            antes:         p.fotoAntes         ? `${fileBase}_antes.jpeg`         : null,
            despues:       p.fotoDespues        ? `${fileBase}_despues.jpeg`       : null,
          },
        }
      })

      const metadata = {
        exportadoEn: new Date().toISOString(),
        cuadrante,
        puntos: metadataPuntos,
      }

      zip.file('metadata.json', JSON.stringify(metadata, null, 2))

      // Cargar blobs desde IndexedDB
      const allBlobs = await getPhotoBlobsByPreventivo(preventivo.id)
      const blobMap = new Map(allBlobs.map((b) => [`${b.puntoId}:${b.fotoKey}`, b.blob]))

      for (const punto of puntos) {
        const nombre = safeName(punto.nombre || punto.descripcion)

        const pairs: [FotoKey, string][] = [
          ['fotoLevantamiento', 'levantamiento'],
          ['fotoAntes', 'antes'],
          ['fotoDespues', 'despues'],
        ]

        for (const [key, suffix] of pairs) {
          const entry = punto[key]
          if (!entry) continue

          let blob: Blob | undefined = blobMap.get(`${punto.id}:${key}`)

          // Fallback: intentar cargar desde previewUrl (object URL en memoria)
          if (!blob && entry.previewUrl) {
            try {
              const res = await fetch(entry.previewUrl)
              blob = await res.blob()
            } catch { /* object URL expiró */ }
          }

          if (blob) {
            zip.file(`${nombre}_${suffix}.jpeg`, blob)
          }
        }
      }

      // Generar y descargar
      const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${cuadrante.cuadrante || 'cuadrante'}_${cuadrante.comuna || ''}_${cuadrante.fecha || ''}.zip`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
    >
      {loading ? '⏳ Preparando…' : '⬇ Descargar ZIP'}
    </button>
  )
}
