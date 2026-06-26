import { useRef, useState } from 'react'
import { useAttStore } from '../store'
import type { AttRecord, FotoCategoria } from '../types'

interface Props {
  recordId: string
  processPhoto: (file: File, cat: FotoCategoria) => Promise<void>
}

const CAT_CONFIG: Array<{
  key: FotoCategoria
  label: string
  emoji: string
  visible: (r: AttRecord) => boolean
}> = [
  { key: 'tendidoFO',       label: 'Tendido FO',          emoji: '🔌', visible: () => true },
  { key: 'cmic',            label: 'CMIC / Cabecera',     emoji: '📦', visible: (r) => r.instalaCMIC },
  { key: 'medicionTraza',   label: 'Medición traza',      emoji: '📏', visible: () => true },
  { key: 'reparacionDucto', label: 'Reparación de ducto', emoji: '🔧', visible: (r) => r.tieneReparacionDucto },
  { key: 'mufaProyectada',  label: 'Mufa proyectada',     emoji: '🔗', visible: (r) => r.instalaMufas },
  { key: 'ingresoRed',      label: 'Ingreso a red',       emoji: '🌐', visible: (r) => r.tieneIngresoRed },
]

export function SeccionFotos({ recordId, processPhoto }: Props) {
  const { records, removeFoto } = useAttStore()
  const record = records[recordId]
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeCat, setActiveCat] = useState<FotoCategoria | null>(null)
  const [loading, setLoading] = useState(false)

  if (!record) return null

  const visibleCats = CAT_CONFIG.filter((c) => c.visible(record))

  function triggerCapture(cat: FotoCategoria) {
    setActiveCat(cat)
    inputRef.current?.click()
  }

  async function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !activeCat) return
    setLoading(true)
    try { await processPhoto(file, activeCat) } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
      setActiveCat(null)
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-5">
      <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">5. Registro fotográfico</h2>

      {visibleCats.length === 0 && (
        <p className="text-xs text-slate-500 italic">
          Activa condiciones del proyecto (CMIC, mufas, ingreso red, reparación ducto) para habilitar más categorías.
        </p>
      )}

      {visibleCats.map(({ key, label, emoji }) => {
        const fotos = record.fotos[key] ?? []
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">
                {emoji} {label}
                {fotos.length > 0 && (
                  <span className="ml-1.5 text-slate-500">({fotos.length})</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => triggerCapture(key)}
                disabled={loading}
                className="text-xs text-brand-400 hover:text-brand-300 font-medium disabled:opacity-50">
                + Foto
              </button>
            </div>

            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {fotos.map((foto, i) => (
                  <div key={foto.blobId ?? i} className="relative rounded-lg overflow-hidden border border-slate-600 aspect-square bg-slate-700">
                    {foto.previewUrl ? (
                      <img src={foto.previewUrl} alt={`${label} ${i + 1}`}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">⏳</div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFoto(recordId, key, i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fotos.length === 0 && (
              <button
                type="button"
                onClick={() => triggerCapture(key)}
                disabled={loading}
                className="w-full h-16 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 flex items-center justify-center gap-2 hover:border-brand-500 transition-colors disabled:opacity-50">
                <span className="text-slate-500 text-xs">Sin fotos — toca para agregar</span>
              </button>
            )}
          </div>
        )
      })}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />
    </div>
  )
}
