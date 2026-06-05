import { useRef, useState } from 'react'
import type { FotoEntry, FotoKey } from '../types'

interface Props {
  label: string
  fotoKey: FotoKey
  entry?: FotoEntry
  editable?: boolean
  onCapture: (file: File, key: FotoKey) => Promise<void>
  onRemove: (key: FotoKey) => void
}

const LABEL_MAP: Record<FotoKey, { emoji: string; color: string }> = {
  fotoLevantamiento: { emoji: '📋', color: 'border-blue-400' },
  fotoAntes:         { emoji: '🔴', color: 'border-orange-400' },
  fotoDespues:       { emoji: '🟢', color: 'border-green-400' },
}

export function PhotoCapture({ label, fotoKey, entry, editable = true, onCapture, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

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

  if (entry?.previewUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden border-2 ${color} bg-slate-800`}>
        <img src={entry.previewUrl} alt={label} className="w-full h-36 object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 flex items-center justify-between">
          <span className="text-xs text-white truncate">{emoji} {label}</span>
          {editable && (
            <button type="button" onClick={() => onRemove(fotoKey)}
              className="text-red-400 text-xs font-bold ml-2 hover:text-red-300">✕</button>
          )}
        </div>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className={`w-full h-36 rounded-xl border-2 border-dashed ${color} bg-slate-800/50 flex flex-col items-center justify-center gap-1`}>
        <span className="text-3xl opacity-30">{emoji}</span>
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-[10px] text-slate-600">Sin foto</span>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
      className={`w-full h-36 rounded-xl border-2 border-dashed ${color} bg-slate-800/50 flex flex-col items-center justify-center gap-1 hover:bg-slate-700/50 transition-colors disabled:opacity-50`}>
      {loading
        ? <span className="text-2xl animate-spin">⏳</span>
        : <>
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs text-slate-300">{label}</span>
            <span className="text-[10px] text-slate-500">Toca para capturar</span>
          </>
      }
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleChange} />
    </button>
  )
}
