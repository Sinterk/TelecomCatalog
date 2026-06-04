import { useNavigate, useParams } from 'react-router-dom'
import { usePreventivo } from '../../hooks/usePreventivo'
import { useRestorePhotoPreviews } from '../../hooks/useRestorePhotoPreviews'
import { usePreventivoStore } from '../../store'
import { PuntoCard } from '../PuntoCard'
import type { FotoKey } from '../../types'

export function FieldEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { record, processAndQueuePhoto, syncToServer } = usePreventivo(id ?? '')
  const { addPunto } = usePreventivoStore()
  useRestorePhotoPreviews()

  if (!record) {
    return <div className="text-slate-400 text-center py-16">Cuadrante no encontrado.</div>
  }

  const { cuadrante } = record

  return (
    <div className="space-y-4 pb-24">
      {/* Header cuadrante (solo lectura) */}
      <div
        className="bg-slate-800 rounded-2xl border border-brand-700/40 p-4 space-y-1 cursor-pointer"
        onClick={() => navigate('/preventivos/field')}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-brand-400 font-semibold uppercase tracking-wide">
            ← Cambiar cuadrante
          </span>
        </div>
        <div className="text-base font-bold text-white">
          {cuadrante.cuadrante || '—'}
          {cuadrante.comuna ? <span className="font-normal text-slate-400"> — {cuadrante.comuna}</span> : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
          {cuadrante.nombreCuadrante && <span>{cuadrante.nombreCuadrante}</span>}
          {cuadrante.fecha && <span>📅 {cuadrante.fecha}</span>}
          {cuadrante.semana && <span>📆 {cuadrante.semana}</span>}
          {cuadrante.zona && <span>📍 {cuadrante.zona}</span>}
          {cuadrante.direccion && <span>🏠 {cuadrante.direccion}</span>}
        </div>
      </div>

      {/* Puntos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">
            🔧 Puntos de Trabajo
          </h2>
          <span className="text-xs text-slate-500">{record.puntos.length} punto(s)</span>
        </div>

        {record.puntos.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay puntos aún. Agrega el primero ↓
          </div>
        )}

        {record.puntos.map((punto, i) => (
          <PuntoCard
            key={punto.id}
            preventivoId={record.id}
            punto={punto}
            index={i}
            editable
            onPhotoCapture={(file: File, key: FotoKey) =>
              processAndQueuePhoto(file, punto.id, key)
            }
          />
        ))}

        <button
          type="button"
          onClick={() => addPunto(record.id)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 text-sm hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center justify-center gap-2"
        >
          ➕ Agregar punto
        </button>
      </div>

      {/* Botón guardar + sincronizar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={() => navigate('/preventivos/field')}
          className="flex-1 py-3 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors"
        >
          ← Volver
        </button>
        <button
          type="button"
          onClick={() => syncToServer()}
          className="flex-1 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          💾 Guardar cambios
        </button>
      </div>
    </div>
  )
}
