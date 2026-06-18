import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { usePreventivoStore } from '../store'
import { usePreventivo } from '../hooks/usePreventivo'
import { useRestorePhotoPreviews } from '../hooks/useRestorePhotoPreviews'
import { CuadranteSection } from './CuadranteSection'
import { PuntoCard } from './PuntoCard'
import { ExportZipButton } from './ExportZipButton'
import type { FotoKey } from '../types'

type SaveStatus = 'saved' | 'saving'

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { record, processPhoto } = usePreventivo(id ?? '')
  const { addPunto, movePunto } = usePreventivoStore()
  useRestorePhotoPreviews()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !record) return
    const from = record.puntos.findIndex((p) => p.id === active.id)
    const to   = record.puntos.findIndex((p) => p.id === over.id)
    if (from !== -1 && to !== -1) movePunto(record.id, from, to)
  }

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const prevUpdatedAt = useRef<number | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detecta cada cambio en updatedAt y muestra "Guardando…" → "✅ Guardado"
  useEffect(() => {
    if (!record) return
    if (prevUpdatedAt.current === null) {
      prevUpdatedAt.current = record.updatedAt
      return
    }
    if (record.updatedAt === prevUpdatedAt.current) return
    prevUpdatedAt.current = record.updatedAt

    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaveStatus('saved'), 800)
  }, [record?.updatedAt])

  if (!record) {
    return <div className="text-slate-400 text-center py-16">Levantamiento no encontrado.</div>
  }

  const { puntos } = record
  const conFoto = puntos.filter((p) => p.fotoLevantamiento || p.fotoAntes || p.fotoDespues).length
  const total = puntos.length

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/preventivos')}
          className="text-slate-400 hover:text-white text-sm">← Volver</button>
        <span className="flex-1 text-sm font-semibold text-white truncate">
          {record.cuadrante.cuadrante || 'Nuevo levantamiento'}
          {record.cuadrante.comuna ? ` — ${record.cuadrante.comuna}` : ''}
        </span>
        <button type="button" onClick={() => navigate(`/preventivos/${id}/plano`)}
          className="text-slate-400 hover:text-brand-400 text-xs px-2 py-1 rounded-lg border border-slate-700 hover:border-brand-500 transition-colors shrink-0">
          📐 Plano
        </button>
      </div>

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

      <CuadranteSection preventivoId={record.id} cuadrante={record.cuadrante} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">🔧 Puntos</h2>
          <span className="text-xs text-slate-500">{total} punto(s)</span>
        </div>

        {puntos.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">Agrega puntos con el botón de abajo.</div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={puntos.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            {puntos.map((punto, i) => (
              <PuntoCard key={punto.id} preventivoId={record.id} punto={punto} index={i} total={puntos.length}
                editable={true}
                onSave={async () => {}}
                onMove={(from, to) => movePunto(record.id, from, to)}
                onPhotoCapture={(file: File, key: FotoKey) => processPhoto(file, punto.id, key)} />
            ))}
          </SortableContext>
        </DndContext>

        <button type="button" onClick={() => addPunto(record.id)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-600 text-slate-400 text-sm hover:border-brand-500 hover:text-brand-400 transition-colors flex items-center justify-center gap-2">
          ➕ Agregar punto
        </button>
      </div>

      {/* Barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/preventivos')}
          className="py-2.5 px-4 rounded-xl bg-slate-700 text-white text-sm font-medium hover:bg-slate-600 transition-colors shrink-0">
          ← Volver
        </button>

        {/* Indicador de guardado automático */}
        <div className="flex-1 flex items-center justify-center">
          {saveStatus === 'saving'
            ? <span className="text-xs text-amber-400 animate-pulse">⏳ Guardando…</span>
            : <span className="text-xs text-green-500">✅ Guardado</span>
          }
        </div>

        <ExportZipButton preventivo={record} />
      </div>
    </div>
  )
}
