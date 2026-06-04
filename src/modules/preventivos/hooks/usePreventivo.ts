import { useCallback } from 'react'
import { usePreventivoStore } from '../store'
import { getAnnotator } from '@/core/annotation/annotator'
import { enqueue } from '@/core/offline/uploadQueue'
import { savePhotoBlob } from '@/core/offline/photoStore'
import { pushPreventivo, createPreventivo } from '@/core/sync/preventivoSync'
import type { FotoKey } from '../types'

export function usePreventivo(preventivoId: string) {
  const store = usePreventivoStore()
  const record = store.records[preventivoId]

  const processAndQueuePhoto = useCallback(
    async (file: File, puntoId: string, key: FotoKey) => {
      if (!record) return

      // Anotar imagen (fase 1: extrae EXIF; fase 2: overlay GPS)
      const annotator = await getAnnotator()
      const { blob, metadata } = await annotator.process(file)

      const previewUrl = URL.createObjectURL(blob)

      // Nombre de archivo: NombrePunto_levantamiento|antes|despues.jpeg
      const punto = record.puntos.find(p => p.id === puntoId)
      const nombrePunto = punto?.nombre?.trim() || `punto-${puntoId.slice(0, 6)}`
      const suffix = key === 'fotoLevantamiento' ? 'levantamiento'
                   : key === 'fotoAntes'         ? 'antes'
                   : 'despues'
      const fileName = `${nombrePunto}_${suffix}.jpeg`
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ._-]/g, '-')

      // Encolar para subida — el proxy resuelve la carpeta Drive automáticamente
      const queueId = await enqueue({
        moduleId: 'preventivos',
        driveFolderId: preventivoId, // el proxy usa preventivoId para resolver la ruta
        fileName,
        fileBlob: blob,
        mimeType: 'image/jpeg',
        maxRetries: 5,
        metadata: {
          preventivoId,
          puntoId,
          fotoKey: key,
          capturedAt: metadata.capturedAt,
          annotated: String(metadata.annotated),
          ...(metadata.gps
            ? { lat: String(metadata.gps.lat), lng: String(metadata.gps.lng) }
            : {}),
        },
      })

      // Persistir blob en IndexedDB para descarga local y restauración de preview
      await savePhotoBlob({ id: queueId, blob, fileName, preventivoId, puntoId, fotoKey: key })

      store.setFoto(preventivoId, puntoId, key, {
        previewUrl,
        fileName,
        queueId,
        capturedAt: metadata.capturedAt,
        annotated: metadata.annotated,
      })
    },
    [record, preventivoId, store],
  )

  const syncToServer = useCallback(
    async (isNew = false) => {
      if (!record) return
      try {
        if (isNew) await createPreventivo(record)
        else       await pushPreventivo(record)
      } catch {
        // offline — se sincronizará más tarde
      }
    },
    [record],
  )

  return { record, processAndQueuePhoto, syncToServer }
}
