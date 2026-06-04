import { useEffect, useState } from 'react'
import { getQueueStats } from '@/core/offline/uploadQueue'

export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    const interval = setInterval(async () => {
      const stats = await getQueueStats()
      setPending(stats.pending)
    }, 5000)

    getQueueStats().then((s) => setPending(s.pending))

    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(interval)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <div
      className={`px-4 py-2 text-xs font-medium text-center ${
        !online
          ? 'bg-orange-900/80 text-orange-200'
          : 'bg-blue-900/80 text-blue-200'
      }`}
    >
      {!online
        ? '📡 Sin conexión — las fotos se guardan localmente y se subirán al recuperar red'
        : `⏳ ${pending} foto(s) pendiente(s) de subir`}
    </div>
  )
}
