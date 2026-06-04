import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePreventivo } from '../../hooks/usePreventivo'
import { useRestorePhotoPreviews } from '../../hooks/useRestorePhotoPreviews'
import { usePreventivoStore } from '../../store'
import { CuadranteSection } from '../CuadranteSection'
import { PuntoCard } from '../PuntoCard'
import { DownloadButton } from './DownloadButton'
import type { FotoKey } from '../../types'

export function OfficeEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { record, syncToServer } = usePreventivo(id ?? '')
  const { addPunto } = usePreventivoStore()
  useRestorePhotoPreviews()

  // Sincronizar cambios al servidor cuando el componente se desmonta
  useEffect(() => {
    return () => { syncToServer().catch(() => {}) }
  }, [syncToServer])

  if (!record) {
    return <div className="text-slate-400 text-center py-16">Cuadrante no encontrado.</div>
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/preventivos/office')}
          className="text-slate-400 hover:text-white text-sm"
        >
          ← Volver
        </button>
        <span className="flex-1 text-sm font-semibold text-white truncate">
          {record.cuadrante.cuadrante || 'Nuevo cuadrante'}
        </span>
        <DownloadButton preventivo={record} />
      </div>

      {/* Info cuadrante */}
      <CuadranteSection preventivoId={record.id} cuadrante={record.cuadrante} />

      {/* Puntos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">
            🔧 Puntos de Trabajo
          </h2>
          <span className="text-xs text-slate-500">{record.puntos.length} punto(s)</span>
        </div>

        {record.puntos.map((punto, i) => (
          <PuntoCard
            key={punto.id}
            preventivoId={record.id}
            punto={punto}
            index={i}
            editable
            onPhotoCapture={async () => {
              // En modo oficina no se capturan fotos desde el formulario
            }}
          />
        ))}

        <button
          type="button"
          onClick={() => addPunto(record.id)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 text-sm hover:border-brand-500 hover:text-brand-400 transition-colors"
        >
          ➕ Agregar punto
        </button>
      </div>
    </div>
  )
}
