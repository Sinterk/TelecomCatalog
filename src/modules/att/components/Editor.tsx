import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAtt } from '../hooks/useAtt'
import { useRestoreAttPhotos } from '../hooks/useRestoreAttPhotos'
import { SeccionTipo } from './SeccionTipo'
import { SeccionDatos } from './SeccionDatos'
import { SeccionDescripcion } from './SeccionDescripcion'
import { SeccionInfra } from './SeccionInfra'
import { SeccionFotos } from './SeccionFotos'

type SaveStatus = 'saved' | 'saving'

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { record, processPhoto, processFotoAerea } = useAtt(id ?? '')
  useRestoreAttPhotos()

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

  if (!id || !record) return null

  const title = record.ott ? `OTT ${record.ott}` : 'Nuevo informe ATT'

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/att')}
          className="text-slate-400 hover:text-white text-sm">← Volver</button>
        <span className="flex-1 text-sm font-semibold text-white truncate">{title}</span>
      </div>

      <SeccionTipo recordId={id} />
      <SeccionDatos recordId={id} />
      <SeccionDescripcion recordId={id} processFotoAerea={processFotoAerea} />
      <SeccionInfra recordId={id} />
      <SeccionFotos recordId={id} processPhoto={processPhoto} />

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-3 flex items-center gap-3 z-40">
        <button type="button" onClick={() => navigate('/att')}
          className="py-2.5 px-4 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors shrink-0">
          ← Volver
        </button>
        <div className="flex-1 flex items-center justify-center">
          {saveStatus === 'saving'
            ? <span className="text-xs text-amber-400 animate-pulse">⏳ Guardando…</span>
            : <span className="text-xs text-green-500">✅ Guardado</span>}
        </div>
      </div>
    </div>
  )
}
