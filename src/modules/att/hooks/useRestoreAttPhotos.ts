import { useEffect } from 'react'
import { useAttStore } from '../store'
import { getPhotoBlob } from '@/core/offline/photoStore'

export function useRestoreAttPhotos() {
  const { records, setFotoAereaPreview, setFotoPreview } = useAttStore()

  useEffect(() => {
    let cancelled = false

    async function restore() {
      for (const record of Object.values(records)) {
        if (record.fotoAerea?.blobId && !record.fotoAerea.previewUrl) {
          const entry = await getPhotoBlob(record.fotoAerea.blobId)
          if (!cancelled && entry) {
            setFotoAereaPreview(record.id, URL.createObjectURL(entry.blob))
          }
        }

        for (let i = 0; i < record.fotos.length; i++) {
          const foto = record.fotos[i]
          if (foto.previewUrl || !foto.blobId) continue
          const entry = await getPhotoBlob(foto.blobId)
          if (!cancelled && entry) {
            setFotoPreview(record.id, i, URL.createObjectURL(entry.blob))
          }
        }
      }
    }

    restore().catch(console.error)
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
