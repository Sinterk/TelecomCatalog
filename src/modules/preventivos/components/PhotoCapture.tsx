import { useRef, useState, useEffect } from 'react'
import { getQueueItem } from '@/core/offline/uploadQueue'
import { cancelUpload } from '@/core/offline/cancelUpload'
import type { FotoEntry, FotoKey } from '../types'

interface Props {
  label: string
  fotoKey: FotoKey
  entry?: FotoEntry
  onCapture: (file: File, key: FotoKey) => Promise<void>
  onRemove: (key: FotoKey) => void
}

type UploadStatus = 'pending' | 'uploading' | 'error' | 'done' | null

const LABEL_MAP: Record<FotoKey, { emoji: string; color: string }> = {
  fotoLevantamiento: { emoji: '📋', color: 'border-blue-400' },
  fotoAntes: { emoji: '🔴', color: 'border-orange-400' },
  fotoDespues: { emoji: '🟢', color: 'border-green-400' },
}

export function PhotoCapture({ label, fotoKey, entry, onCapture, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(null)

  // Seguir el estado de la cola para esta foto
  useEffect(() => {
    // Ya subida a Drive — no hay nada que monitorear
    if (!entry?.queueId || entry.driveFileId) {
      setUploadStatus(null)
      return
    }

    let intervalId: ReturnType<typeof setInterval>

    async function check() {
      const item = await getQueueItem(entry!.queueId!)
      if (!item) {
        setUploadStatus(null)
        clearInterval(intervalId)
        return
      }
      setUploadStatus(item.status as UploadStatus)
      // Dejar de polling si ya terminó
      if (item.status === 'error' || item.status === 'done') {
        clearInterval(intervalId)
      }
    }

    check()
    // Polling cada 3s mientras esté pendiente/subiendo
    intervalId = setInterval(check, 3000)

    // Actualizar inmediatamente cuando se complete una subida
    function onUploaded(e: Event) {
      const { queueId } = (e as CustomEvent<{ queueId: string }>).detail
      if (queueId === entry!.queueId) {
        setUploadStatus('done')
        clearInterval(intervalId)
      }
    }
    window.addEventListener('photo-uploaded', onUploaded)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('photo-uploaded', onUploaded)
    }
  }, [entry?.queueId, entry?.driveFileId])

  const { emoji, color } = LABEL_MAP[fotoKey]

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      await onCapture(file, fotoKey)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (entry?.queueId) {
      await cancelUpload(entry.queueId).catch(() => {})
    }
    onRemove(fotoKey)
  }

  if (entry?.previewUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden border-2 ${color} bg-slate-800`}>
        <img
          src={entry.previewUrl}
          alt={label}
          className="w-full h-36 object-cover"
        />

        {/* Badge de estado de subida */}
        {uploadStatus && uploadStatus !== 'done' && (
          <div className={`absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold
            ${uploadStatus === 'error'
              ? 'bg-red-600/90 text-white'
              : 'bg-slate-900/80 text-slate-200'
            }`}
          >
            {uploadStatus === 'error' && '❌ No se pudo subir'}
            {(uploadStatus === 'pending' || uploadStatus === 'uploading') && (
              <><span className="animate-spin inline-block">⏳</span> Subiendo…</>
            )}
          </div>
        )}

        {entry.annotated && (
          <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] rounded px-1">
            GPS
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-white truncate">{emoji} {label}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="text-red-400 text-xs font-bold ml-2 hover:text-red-300"
            title="Eliminar foto"
          >
            ✕
          </button>
        </div>

        {/* Panel de error con botón de cancelar prominente */}
        {uploadStatus === 'error' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 p-2">
            <span className="text-white text-xs text-center font-medium">No se pudo subir a Drive</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemove}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                Cancelar subida
              </button>
            </div>
            <span className="text-slate-400 text-[10px] text-center">
              Usa "Reintentar ↑" en el banner para volver a intentar
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={loading}
      className={`w-full h-36 rounded-xl border-2 border-dashed ${color} bg-slate-800/50 flex flex-col items-center justify-center gap-1 hover:bg-slate-700/50 transition-colors disabled:opacity-50`}
    >
      {loading ? (
        <span className="text-2xl animate-spin">⏳</span>
      ) : (
        <>
          <span className="text-3xl">{emoji}</span>
          <span className="text-xs text-slate-300">{label}</span>
          <span className="text-[10px] text-slate-500">Toca para capturar</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  )
}
