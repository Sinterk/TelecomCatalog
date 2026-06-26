import { useCallback } from 'react'
import { nanoid } from '@/core/utils/nanoid'
import { useAttStore } from '../store'
import { savePhotoBlob, deletePhotoBlob } from '@/core/offline/photoStore'
import { compressImage } from '@/core/utils/compressImage'
import type { FotoCategoria } from '../types'

export function useAtt(recordId: string) {
  const store = useAttStore()
  const record = store.records[recordId]

  const processPhoto = useCallback(
    async (file: File, cat: FotoCategoria) => {
      if (!record) return
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      const blobId = nanoid()
      const idx = (record.fotos[cat] ?? []).length
      const fileName = `${cat}_${idx}_${recordId.slice(0, 6)}.jpeg`
      await savePhotoBlob({ id: blobId, blob: compressed, fileName })
      store.addFoto(recordId, cat, { previewUrl, fileName, blobId, capturedAt: new Date().toISOString(), annotated: false })
    },
    [record, recordId, store],
  )

  const processFotoAerea = useCallback(
    async (file: File) => {
      if (!record) return
      const compressed = await compressImage(file)
      const previewUrl = URL.createObjectURL(compressed)
      const blobId = nanoid()
      const fileName = `aerea_${recordId.slice(0, 6)}.jpeg`
      if (record.fotoAerea?.blobId) await deletePhotoBlob(record.fotoAerea.blobId).catch(() => {})
      await savePhotoBlob({ id: blobId, blob: compressed, fileName })
      store.setFotoAerea(recordId, { previewUrl, fileName, blobId, capturedAt: new Date().toISOString(), annotated: false })
    },
    [record, recordId, store],
  )

  return { record, processPhoto, processFotoAerea }
}
