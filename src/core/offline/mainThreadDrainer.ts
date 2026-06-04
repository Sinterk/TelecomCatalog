/**
 * Drena la cola de uploads desde el hilo principal.
 * Funciona en TODOS los browsers (Firefox, Safari, Chrome).
 * El Background Sync del SW es un bonus adicional solo para Chrome.
 */
import { getPending, markUploading, markDone, markError } from './uploadQueue'

const PROXY_BASE = import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001'

let draining = false

export async function drainQueue(): Promise<{ uploaded: number; failed: number }> {
  if (draining || !navigator.onLine) return { uploaded: 0, failed: 0 }
  draining = true

  let uploaded = 0
  let failed = 0

  try {
    const pending = await getPending()

    for (const item of pending) {
      try {
        await markUploading(item.id)

        const form = new FormData()
        form.append('file', item.fileBlob, item.fileName)
        form.append('preventivoId', item.metadata.preventivoId ?? item.driveFolderId)
        form.append('mimeType', item.mimeType)
        form.append('metadata', JSON.stringify(item.metadata))

        const res = await fetch(`${PROXY_BASE}/api/drive/upload`, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        await markDone(item.id)
        uploaded++
      } catch (err) {
        console.warn('[drainer] fallo subiendo', item.fileName, err)
        await markError(item.id)
        failed++
      }
    }
  } finally {
    draining = false
  }

  return { uploaded, failed }
}
