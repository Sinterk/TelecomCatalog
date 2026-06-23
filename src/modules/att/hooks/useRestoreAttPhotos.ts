import { useEffect } from 'react'
import { useAttStore } from '../store'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { AttFotoKey } from '../types'

const NAMED_KEYS: AttFotoKey[] = ['cabecera', 'tendidoExterior', 'tendidoInterior', 'medicion']

export function useRestoreAttPhotos() {
  const { records, setFoto, setFotoExtraPreview } = useAttStore()

  useEffect(() => {
    let cancelled = false

    async function restore() {
      for (const record of Object.values(records)) {
        for (const key of NAMED_KEYS) {
          const foto = record.fotos[key]
          if (!foto || foto.previewUrl || !foto.blobId) continue
          const entry = await getPhotoBlob(foto.blobId)
          if (!cancelled && entry) {
            setFoto(record.id, key, { ...foto, previewUrl: URL.createObjectURL(entry.blob) })
          }
        }
        for (let i = 0; i < record.fotosExtra.length; i++) {
          const foto = record.fotosExtra[i]
          if (foto.previewUrl || !foto.blobId) continue
          const entry = await getPhotoBlob(foto.blobId)
          if (!cancelled && entry) {
            setFotoExtraPreview(record.id, i, URL.createObjectURL(entry.blob))
          }
        }
      }
    }

    restore().catch(console.error)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
