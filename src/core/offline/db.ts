import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface PhotoBlobEntry {
  id: string       // blobId (nanoid)
  blob: Blob
  fileName: string
}

interface TelecomDB extends DBSchema {
  photoBlobs: {
    key: string
    value: PhotoBlobEntry
  }
}

let _db: IDBPDatabase<TelecomDB> | null = null

export async function getDB(): Promise<IDBPDatabase<TelecomDB>> {
  if (_db) return _db
  _db = await openDB<TelecomDB>('telecom-catalog', 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('photoBlobs')) {
        db.createObjectStore('photoBlobs', { keyPath: 'id' })
      }
    },
  })
  return _db
}
