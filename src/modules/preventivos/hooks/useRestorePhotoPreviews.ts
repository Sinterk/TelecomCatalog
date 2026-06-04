import { useEffect } from 'react'
import { usePreventivoStore } from '../store'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { FotoKey } from '../types'

const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

/**
 * Al montar, recorre todos los puntos del store y restaura los previewUrl
 * leyendo los blobs desde IndexedDB (los objectURL expiran al cerrar la pestaña).
 * Se ejecuta una sola vez por sesión de navegador.
 */
export function useRestorePhotoPreviews() {
  const { records, setFoto } = usePreventivoStore()

  useEffect(() => {
    let cancelled = false

    async function restore() {
      for (const preventivo of Object.values(records)) {
        for (const punto of preventivo.puntos) {
          for (const key of FOTO_KEYS) {
            const entry = punto[key]
            // Solo restaurar si tiene queueId pero el previewUrl está vacío
            if (!entry || entry.previewUrl || !entry.queueId) continue

            const blobEntry = await getPhotoBlob(entry.queueId)
            if (cancelled || !blobEntry) continue

            const previewUrl = URL.createObjectURL(blobEntry.blob)
            setFoto(preventivo.id, punto.id, key, { ...entry, previewUrl })
          }
        }
      }
    }

    restore().catch(console.error)
    return () => { cancelled = true }
    // Solo al montar — no re-ejecutar si el store cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
