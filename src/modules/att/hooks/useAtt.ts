import { useCallback } from 'react'
import { nanoid } from '@/core/utils/nanoid'
import { useAttStore } from '../store'
import { savePhotoBlob, deletePhotoBlob } from '@/core/offline/photoStore'
import { compressImage } from '@/core/utils/compressImage'
import type { AttFotoKey } from '../types'

export function useAtt(recordId: string) {
  const store = useAttStore()
  const record = store.records[recordId]

  const processNamedPhoto = useCallback(
    async (file: File, key: AttFotoKey) => {
      if (!record) return
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      const blobId = nanoid()
      const fileName = `${key}_${recordId.slice(0, 6)}.jpeg`

      const prev = record.fotos[key]
      if (prev?.blobId) await deletePhotoBlob(prev.blobId).catch(() => {})

      await savePhotoBlob({ id: blobId, blob: compressed, fileName })
      store.setFoto(recordId, key, { previewUrl, fileName, blobId, capturedAt: new Date().toISOString(), annotated: false })
    },
    [record, recordId, store],
  )

  const processExtraPhoto = useCallback(
    async (file: File) => {
      if (!record) return
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      const blobId = nanoid()
      const index = record.fotosExtra.length
      const fileName = `extra_${index}_${recordId.slice(0, 6)}.jpeg`

      await savePhotoBlob({ id: blobId, blob: compressed, fileName })
      store.addFotoExtra(recordId, { previewUrl, fileName, blobId, capturedAt: new Date().toISOString(), annotated: false })
    },
    [record, recordId, store],
  )

  return { record, processNamedPhoto, processExtraPhoto }
}
