import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface QueueItem {
  id: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  retries: number
  maxRetries: number
  createdAt: number
  moduleId: string
  driveFolderId: string
  fileName: string
  fileBlob: Blob
  mimeType: string
  metadata: Record<string, string>
}

export interface PhotoBlobEntry {
  /** queueId del item de la cola — clave de acceso */
  id: string
  blob: Blob
  fileName: string
  preventivoId: string
  puntoId: string
  fotoKey: string
}

interface TelecomDB extends DBSchema {
  uploadQueue: {
    key: string
    value: QueueItem
    indexes: { byStatus: string; byModule: string }
  }
  drafts: {
    key: string
    value: { id: string; moduleId: string; data: unknown; savedAt: number }
  }
  /** Blobs de fotos persistidos para descarga posterior en modo oficina */
  photoBlobs: {
    key: string
    value: PhotoBlobEntry
    indexes: { byPreventivo: string }
  }
}

let _db: IDBPDatabase<TelecomDB> | null = null

export async function getDB(): Promise<IDBPDatabase<TelecomDB>> {
  if (_db) return _db
  _db = await openDB<TelecomDB>('telecom-catalog', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const queue = db.createObjectStore('uploadQueue', { keyPath: 'id' })
        queue.createIndex('byStatus', 'status')
        queue.createIndex('byModule', 'moduleId')
        db.createObjectStore('drafts', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        const photos = db.createObjectStore('photoBlobs', { keyPath: 'id' })
        photos.createIndex('byPreventivo', 'preventivoId')
      }
    },
  })
  return _db
}
