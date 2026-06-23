import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAttStore } from '../store'
import { useAtt } from '../hooks/useAtt'
import { useRestoreAttPhotos } from '../hooks/useRestoreAttPhotos'
import { PhotoSlot } from '@/ui/PhotoSlot'
import type { AttFotoKey } from '../types'

type SaveStatus = 'saved' | 'saving'

const FOTO_CONFIG: Record<AttFotoKey, { label: string; emoji: string; color: string }> = {
  cabecera:        { label: 'Cabecera',         emoji: '📸', color: 'border-blue-400'   },
  tendidoExterior: { label: 'Tendido exterior',  emoji: '🔌', color: 'border-yellow-400' },
  tendidoInterior: { label: 'Tendido interior',  emoji: '🏠', color: 'border-orange-400' },
  medicion:        { label: 'Medición',          emoji: '📏', color: 'border-purple-400' },
}

const FOTO_ORDER: AttFotoKey[] = ['cabecera', 'tendidoExterior', 'tendidoInterior', 'medicion']

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { update, removeFoto, removeFotoExtra } = useAttStore()
  const { record, processNamedPhoto, processExtraPhoto } = useAtt(id ?? '')
  useRestoreAttPhotos()

  const extraInputRef = useRef<HTMLInputElement>(null)
  const [extraLoading, setExtraLoading] = useState(false)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const prevUpdatedAt = useRef<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!record && id) navigate('/att', { replace: true })
  }, [record, id, navigate])

  useEffect(() => {
    if (!record) return
    if (prevUpdatedAt.current === null) { prevUpdatedAt.current = record.updatedAt; return }
    if (record.updatedAt === prevUpdatedAt.current) return
    prevUpdatedAt.current = record.updatedAt
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('saved'), 800)
  }, [record?.updatedAt])

  if (!record) return null

  async function handleExtraCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setExtraLoading(true)
    try { await processExtraPhoto(file) } finally {
      setExtraLoading(false)
      if (extraInputRef.current) extraInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/att')}
          className="text-slate-400 hover:text-white text-sm">← Volver</button>
        <span className="flex-1 text-sm font-semibold text-white truncate">
          {record.ott ? `OTT ${record.ott}` : 'Nueva instalación ATT'}
        </span>
      </div>

      {/* Formulario */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4">
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">Datos de la OTT</h2>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">
            Número OTT <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={record.ott}
            onChange={(e) => update(record.id, { ott: e.target.value })}
            placeholder="Ej: 123456"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">Dirección</label>
          <input
            type="text"
            value={record.direccion}
            onChange={(e) => update(record.id, { direccion: e.target.value })}
            placeholder="Calle y número"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">Fecha de inicio</label>
          <input
            type="date"
            value={record.fechaInicio}
            onChange={(e) => update(record.id, { fechaInicio: e.target.value })}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-medium">Descripción</label>
          <textarea
            value={record.descripcion}
            onChange={(e) => update(record.id, { descripcion: e.target.value })}
            placeholder="Detalles del trabajo..."
            rows={3}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>
      </div>

      {/* Fotos nombradas */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">📷 Fotos</h2>
        <div className="grid grid-cols-2 gap-3">
          {FOTO_ORDER.map((key) => {
            const cfg = FOTO_CONFIG[key]
            return (
              <PhotoSlot
                key={key}
                label={cfg.label}
                emoji={cfg.emoji}
                borderColor={cfg.color}
                previewUrl={record.fotos[key]?.previewUrl}
                onCapture={(file) => processNamedPhoto(file, key)}
                onRemove={() => removeFoto(record.id, key)}
              />
            )
          })}
        </div>
      </div>

      {/* Fotos extra */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">📎 Fotos extra</h2>
        {record.fotosExtra.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {record.fotosExtra.map((foto, i) => (
              <PhotoSlot
                key={foto.blobId ?? i}
                label={`Extra ${i + 1}`}
                emoji="🖼️"
                borderColor="border-slate-500"
                previewUrl={foto.previewUrl}
                onCapture={async () => {}}
                onRemove={() => removeFotoExtra(record.id, i)}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => extraInputRef.current?.click()}
          disabled={extraLoading}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 text-sm hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {extraLoading ? <span className="animate-spin">⏳</span> : '➕'} Agregar foto extra
        </button>
        <input ref={extraInputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleExtraCapture} />
      </div>

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-3 flex items-center gap-3 z-40">
        <button type="button" onClick={() => navigate('/att')}
          className="py-2.5 px-4 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors shrink-0">
          ← Volver
        </button>
        <div className="flex-1 flex items-center justify-center">
          {saveStatus === 'saving'
            ? <span className="text-xs text-amber-400 animate-pulse">⏳ Guardando…</span>
            : <span className="text-xs text-green-500">✅ Guardado</span>
          }
        </div>
      </div>
    </div>
  )
}
