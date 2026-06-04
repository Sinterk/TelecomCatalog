import { useEffect } from 'react'
import { usePreventivoStore } from '../store'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { FotoKey } from '../types'

const PROXY_BASE = import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001'
const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

/**
 * Al montar, recorre todos los puntos del store y restaura los previewUrl:
 * 1. Si tiene driveFileId → usa la URL del proxy (funciona en cualquier dispositivo)
 * 2. Si tiene queueId → restaura desde blob en IndexedDB (dispositivo local)
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
            if (!entry || entry.previewUrl) continue

            // Opción 1: ya subida a Drive → URL del proxy (cross-device)
            if (entry.driveFileId) {
              setFoto(preventivo.id, punto.id, key, {
                ...entry,
                previewUrl: `${PROXY_BASE}/api/drive/file/${entry.driveFileId}`,
              })
              continue
            }

            // Opción 2: pendiente de subir → blob local en IndexedDB
            if (!entry.queueId) continue
            const blobEntry = await getPhotoBlob(entry.queueId)
            if (cancelled || !blobEntry) continue

            setFoto(preventivo.id, punto.id, key, {
              ...entry,
              previewUrl: URL.createObjectURL(blobEntry.blob),
            })
          }
        }
      }
    }

    restore().catch(console.error)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
