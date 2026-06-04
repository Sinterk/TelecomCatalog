import { nanoid } from '../utils/nanoid'
import { getDB, type QueueItem } from './db'

export type NewQueueItem = Omit<QueueItem, 'id' | 'status' | 'retries' | 'createdAt'>

export async function enqueue(item: NewQueueItem): Promise<string> {
  const db = await getDB()
  const id = nanoid()
  await db.put('uploadQueue', {
    ...item,
    id,
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
  })
  // Pedir background sync al SW si está disponible
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready
    await (reg as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } })
      .sync.register('upload-queue')
      .catch(() => { /* Sync no soportado, se procesará al volver online */ })
  }
  return id
}

export async function getPending(): Promise<QueueItem[]> {
  const db = await getDB()
  return db.getAllFromIndex('uploadQueue', 'byStatus', 'pending')
}

export async function markUploading(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('uploadQueue', id)
  if (item) await db.put('uploadQueue', { ...item, status: 'uploading' })
}

export async function markDone(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('uploadQueue', id)
  if (item) await db.put('uploadQueue', { ...item, status: 'done' })
}

export async function markError(id: string): Promise<void> {
  const db = await getDB()
  const item = await db.get('uploadQueue', id)
  if (!item) return
  const retries = item.retries + 1
  await db.put('uploadQueue', {
    ...item,
    status: retries >= item.maxRetries ? 'error' : 'pending',
    retries,
  })
}

export async function getQueueStats(): Promise<{ pending: number; error: number; done: number }> {
  const db = await getDB()
  const [pendingItems, errorItems, doneItems] = await Promise.all([
    db.getAllFromIndex('uploadQueue', 'byStatus', 'pending'),
    db.getAllFromIndex('uploadQueue', 'byStatus', 'error'),
    db.getAllFromIndex('uploadQueue', 'byStatus', 'done'),
  ])
  return { pending: pendingItems.length, error: errorItems.length, done: doneItems.length }
}

export async function clearDone(): Promise<void> {
  const db = await getDB()
  const done = await db.getAllFromIndex('uploadQueue', 'byStatus', 'done')
  const tx = db.transaction('uploadQueue', 'readwrite')
  await Promise.all(done.map((i) => tx.store.delete(i.id)))
  await tx.done
}
