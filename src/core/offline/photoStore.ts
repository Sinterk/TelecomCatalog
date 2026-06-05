import { getDB, type PhotoBlobEntry } from './db'

export async function savePhotoBlob(entry: PhotoBlobEntry): Promise<void> {
  const db = await getDB()
  await db.put('photoBlobs', entry)
}

export async function getPhotoBlob(id: string): Promise<PhotoBlobEntry | undefined> {
  const db = await getDB()
  return db.get('photoBlobs', id)
}

export async function deletePhotoBlob(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('photoBlobs', id)
}

export async function getAllPhotoBlobs(): Promise<PhotoBlobEntry[]> {
  const db = await getDB()
  return db.getAll('photoBlobs')
}
