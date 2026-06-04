import { useEffect, useState, useCallback } from 'react'
import { getQueueStats } from '@/core/offline/uploadQueue'
import { drainQueue } from '@/core/offline/mainThreadDrainer'

type DrainState = 'idle' | 'uploading' | 'done' | 'error'

export function OfflineBanner() {
  const [online, setOnline]         = useState(navigator.onLine)
  const [pending, setPending]       = useState(0)
  const [errors, setErrors]         = useState(0)
  const [drainState, setDrainState] = useState<DrainState>('idle')

  const refreshStats = useCallback(async () => {
    const stats = await getQueueStats()
    setPending(stats.pending)
    setErrors(stats.error)
  }, [])

  const triggerDrain = useCallback(async () => {
    if (!navigator.onLine || drainState === 'uploading') return
    setDrainState('uploading')
    try {
      const { uploaded, failed } = await drainQueue()
      await refreshStats()
      if (failed > 0) setDrainState('error')
      else if (uploaded > 0) { setDrainState('done'); setTimeout(() => setDrainState('idle'), 3000) }
      else setDrainState('idle')
    } catch {
      setDrainState('error')
    }
  }, [drainState, refreshStats])

  useEffect(() => {
    // Cargar stats iniciales
    refreshStats()

    // Actualizar stats cada 6s
    const interval = setInterval(refreshStats, 6000)

    // Eventos de red
    const handleOnline = () => {
      setOnline(true)
      // Drenar automáticamente al recuperar red
      setTimeout(triggerDrain, 1000)
    }
    const handleOffline = () => setOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Drenar al volver a la pestaña (técnico desbloquea el celular)
    const handleVisible = () => {
      if (!document.hidden && navigator.onLine) triggerDrain()
    }
    document.addEventListener('visibilitychange', handleVisible)

    // Intentar drenar al montar (cubre el caso de fotos pendientes de sesión anterior)
    triggerDrain()

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sin nada pendiente ni errores → no mostrar banner
  if (online && pending === 0 && errors === 0) return null

  // Sin conexión
  if (!online) {
    return (
      <div className="bg-orange-900/80 text-orange-200 px-4 py-2 text-xs font-medium text-center">
        📡 Sin conexión — las fotos se guardan localmente y se subirán al recuperar red
        {pending > 0 && <span className="ml-2 opacity-75">({pending} en cola)</span>}
      </div>
    )
  }

  // Con conexión pero subiendo
  if (drainState === 'uploading') {
    return (
      <div className="bg-blue-900/80 text-blue-200 px-4 py-2 text-xs font-medium flex items-center justify-center gap-2">
        <span className="animate-spin">⏳</span> Subiendo {pending} foto(s) a Drive…
      </div>
    )
  }

  // Subida completada
  if (drainState === 'done') {
    return (
      <div className="bg-green-900/70 text-green-200 px-4 py-2 text-xs font-medium text-center">
        ✅ Fotos subidas correctamente a Drive
      </div>
    )
  }

  // Error o pendientes sin actividad
  if (errors > 0 || pending > 0) {
    return (
      <div className="bg-yellow-900/70 text-yellow-200 px-4 py-2 text-xs font-medium flex items-center justify-between gap-3">
        <span>
          {errors > 0
            ? `❌ ${errors} foto(s) no pudieron subirse`
            : `⏳ ${pending} foto(s) pendiente(s) de subir`}
        </span>
        <button
          type="button"
          onClick={triggerDrain}
          className="shrink-0 bg-yellow-700 hover:bg-yellow-600 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
        >
          Reintentar ↑
        </button>
      </div>
    )
  }

  return null
}
