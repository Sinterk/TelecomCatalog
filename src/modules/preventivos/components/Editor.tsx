import { useNavigate, useParams } from 'react-router-dom'
import { usePreventivoStore } from '../store'
import { usePreventivo } from '../hooks/usePreventivo'
import { useRestorePhotoPreviews } from '../hooks/useRestorePhotoPreviews'
import { CuadranteSection } from './CuadranteSection'
import { PuntoCard } from './PuntoCard'
import { ExportZipButton } from './ExportZipButton'
import { getRole } from '@/core/role'
import type { FotoKey } from '../types'

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { record, processPhoto } = usePreventivo(id ?? '')
  const { addPunto } = usePreventivoStore()
  const role = getRole() ?? 'tecnico'
  useRestorePhotoPreviews()

  if (!record) {
    return <div className="text-slate-400 text-center py-16">Levantamiento no encontrado.</div>
  }

  const { puntos } = record
  const conFoto = puntos.filter((p) => p.fotoLevantamiento || p.fotoAntes || p.fotoDespues).length
  const total = puntos.length

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/preventivos')}
          className="text-slate-400 hover:text-white text-sm">← Volver</button>
        <span className="flex-1 text-sm font-semibold text-white truncate">
          {record.cuadrante.cuadrante || 'Nuevo levantamiento'}
          {record.cuadrante.comuna ? ` — ${record.cuadrante.comuna}` : ''}
        </span>
        <button type="button"
          onClick={() => navigate(`/preventivos/${id}/plano`)}
          className="text-slate-400 hover:text-brand-400 text-xs px-2 py-1 rounded-lg border border-slate-700 hover:border-brand-500 transition-colors shrink-0">
          📐 Plano
        </button>
      </div>

      {/* Barra de progreso */}
      {total > 0 && (
        <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400">Progreso del levantamiento</span>
            <span className={`text-xs font-semibold ${conFoto === total ? 'text-green-400' : 'text-brand-400'}`}>
              {conFoto}/{total} puntos con foto
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${(conFoto / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Info cuadrante */}
      <CuadranteSection
        preventivoId={record.id}
        cuadrante={record.cuadrante}
        role={role}
      />

      {/* Puntos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">🔧 Puntos</h2>
          <span className="text-xs text-slate-500">{total} punto(s)</span>
        </div>

        {puntos.length === 0 && role === 'tecnico' && (
          <div className="text-center py-8 text-slate-500 text-sm">
            Agrega puntos con el botón de abajo.
          </div>
        )}

        {puntos.map((punto, i) => (
          <PuntoCard
            key={punto.id}
            preventivoId={record.id}
            punto={punto}
            index={i}
            editable={role === 'tecnico'}
            onSave={() => {/* progreso se actualiza reactivamente por Zustand */}}
            onPhotoCapture={(file: File, key: FotoKey) => processPhoto(file, punto.id, key)}
          />
        ))}

        {role === 'tecnico' && (
          <button type="button" onClick={() => addPunto(record.id)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 text-sm hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center justify-center gap-2">
            ➕ Agregar punto
          </button>
        )}
      </div>

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/preventivos')}
          className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors">
          ← Volver
        </button>
        <ExportZipButton
          preventivo={record}
          label={role === 'tecnico' ? '📦 Exportar ZIP' : '📦 Exportar ZIP final'}
        />
      </div>
    </div>
  )
}
