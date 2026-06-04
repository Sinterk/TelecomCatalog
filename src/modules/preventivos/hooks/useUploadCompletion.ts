import { useEffect } from 'react'
import { usePreventivoStore } from '../store'
import { pushPreventivo } from '@/core/sync/preventivoSync'
import type { FotoKey } from '../types'

interface PhotoUploadedDetail {
  queueId: string
  driveFileId: string
  metadata: Record<string, string>
}

/**
 * Escucha el evento 'photo-uploaded' que emite el drainer tras cada subida exitosa.
 * Guarda el driveFileId en el store y sincroniza el preventivo actualizado con el servidor.
 */
export function useUploadCompletion() {
  useEffect(() => {
    function handler(e: Event) {
      const { driveFileId, metadata } = (e as CustomEvent<PhotoUploadedDetail>).detail
      const { preventivoId, puntoId, fotoKey } = metadata
      if (!preventivoId || !puntoId || !fotoKey) return

      const { records, setFoto } = usePreventivoStore.getState()
      const record = records[preventivoId]
      if (!record) return

      const punto = record.puntos.find((p) => p.id === puntoId)
      const entry = punto?.[fotoKey as FotoKey]
      if (!entry) return

      setFoto(preventivoId, puntoId, fotoKey as FotoKey, { ...entry, driveFileId })

      // Construir el record actualizado manualmente para no depender del re-render
      const updatedRecord = {
        ...record,
        puntos: record.puntos.map((p) => {
          if (p.id !== puntoId) return p
          const fk = fotoKey as FotoKey
          const e = p[fk]
          return e ? { ...p, [fk]: { ...e, driveFileId } } : p
        }),
      }
      pushPreventivo(updatedRecord).catch(() => {})
    }

    window.addEventListener('photo-uploaded', handler)
    return () => window.removeEventListener('photo-uploaded', handler)
  }, [])
}
