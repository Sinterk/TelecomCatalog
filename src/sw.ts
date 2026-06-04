/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[]
}

clientsClaim()
self.skipWaiting()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Estrategia Network First para el shell SPA
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'shell',
      plugins: [new CacheableResponsePlugin({ statuses: [200] })],
    }),
  ),
)

// Cache First para assets estáticos (JS, CSS, fonts)
registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
)

// Stale-While-Revalidate para imágenes de la app
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
)

// ─── Background Sync: drena la cola de uploads cuando hay red ─────────────
async function drainUploadQueue() {
  // Importación dinámica dentro del SW — comparte el módulo compilado
  const PROXY_BASE = (self as unknown as { VITE_PROXY_URL?: string }).VITE_PROXY_URL ?? 'http://localhost:3001'

  const { openDB } = await import('idb')
  const db = await openDB('telecom-catalog', 1)
  const tx = db.transaction('uploadQueue', 'readwrite')
  const store = tx.objectStore('uploadQueue')
  const index = store.index('byStatus')
  const pending = await index.getAll('pending')

  for (const item of pending) {
    try {
      await store.put({ ...item, status: 'uploading' })

      const form = new FormData()
      form.append('file', item.fileBlob, item.fileName)
      // driveFolderId contiene el preventivoId cuando moduleId === 'preventivos'
      form.append('preventivoId', item.metadata.preventivoId ?? item.driveFolderId)
      form.append('mimeType', item.mimeType)
      form.append('metadata', JSON.stringify(item.metadata))

      const res = await fetch(`${PROXY_BASE}/api/drive/upload`, {
        method: 'POST',
        body: form,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      await store.put({ ...item, status: 'done' })
    } catch {
      const retries = item.retries + 1
      await store.put({
        ...item,
        status: retries >= item.maxRetries ? 'error' : 'pending',
        retries,
      })
    }
  }

  await tx.done
}

self.addEventListener('sync', (event) => {
  if ((event as SyncEvent).tag === 'upload-queue') {
    (event as SyncEvent).waitUntil(drainUploadQueue())
  }
})

// También drenar al recuperar conexión en browsers sin Background Sync API
self.addEventListener('message', (event) => {
  if (event.data?.type === 'DRAIN_QUEUE') {
    drainUploadQueue().catch(console.error)
  }
})

// Notificar a clientes cuando la cola drena
self.addEventListener('fetch', () => {
  // Interceptor vacío — requerido para que el SW active fetch events
})

interface SyncEvent extends ExtendableEvent {
  tag: string
}
