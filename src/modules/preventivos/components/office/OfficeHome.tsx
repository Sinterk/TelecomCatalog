import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreventivoStore } from '../../store'
import { fetchAllPreventivos } from '@/core/sync/preventivoSync'
import { DownloadButton } from './DownloadButton'
import type { Preventivo } from '../../types'

const STATUS_CFG = {
  draft:    { label: 'Borrador',      dot: 'bg-slate-500'  },
  syncing:  { label: 'Sincronizando', dot: 'bg-yellow-500' },
  synced:   { label: 'Sincronizado',  dot: 'bg-green-500'  },
  error:    { label: 'Error',         dot: 'bg-red-500'    },
} as const

export function OfficeHome() {
  const navigate = useNavigate()
  const { records, createNew, remove, mergeFromServer } = usePreventivoStore()
  const [syncing, setSyncing] = useState(false)

  const list = Object.values(records).sort((a, b) => b.updatedAt - a.updatedAt)

  // Sincronizar al montar
  useEffect(() => {
    setSyncing(true)
    fetchAllPreventivos()
      .then(mergeFromServer)
      .catch(() => {/* offline */})
      .finally(() => setSyncing(false))
  }, [mergeFromServer])

  function handleNew() {
    const id = createNew()
    navigate(`/preventivos/office/${id}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            🏢 Oficina — Preventivos
          </h1>
          <p className="text-xs text-slate-400">
            {list.length} cuadrante(s)
            {syncing && <span className="ml-2 text-yellow-400">↻ sincronizando…</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          + Nuevo
        </button>
      </div>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="text-center py-16 text-slate-500 space-y-3">
          <div className="text-5xl">📋</div>
          <p className="text-sm">No hay cuadrantes registrados.</p>
          <button type="button" onClick={handleNew} className="text-brand-400 text-sm underline">
            Crear el primero
          </button>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {list.map((r) => (
          <OfficeCard
            key={r.id}
            record={r}
            onEdit={() => navigate(`/preventivos/office/${r.id}`)}
            onDelete={() => { if (confirm('¿Eliminar este cuadrante?')) remove(r.id) }}
          />
        ))}
      </div>
    </div>
  )
}

function OfficeCard({
  record,
  onEdit,
  onDelete,
}: {
  record: Preventivo
  onEdit: () => void
  onDelete: () => void
}) {
  const cfg = STATUS_CFG[record.status]
  const photos = record.puntos.reduce(
    (n, p) => n + (p.fotoLevantamiento ? 1 : 0) + (p.fotoAntes ? 1 : 0) + (p.fotoDespues ? 1 : 0),
    0,
  )
  const date = new Date(record.updatedAt).toLocaleDateString('es-GT')

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span className={`mt-1 inline-block w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {record.cuadrante.cuadrante || 'Sin cuadrante'}{' '}
            <span className="font-normal text-slate-400">
              {record.cuadrante.comuna ? `— ${record.cuadrante.comuna}` : ''}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {record.cuadrante.nombreCuadrante || record.cuadrante.zona || '—'} · Actualizado {date}
          </div>
          <div className="flex gap-3 mt-1">
            <span className={`text-[11px] font-medium text-slate-400`}>{cfg.label}</span>
            <span className="text-[11px] text-slate-500">{record.puntos.length} punto(s)</span>
            <span className="text-[11px] text-slate-500">📷 {photos}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="text-slate-600 hover:text-red-400 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Action row */}
      <div className="flex gap-2 pt-1 border-t border-slate-700">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 text-center py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition-colors"
        >
          ✏️ Editar
        </button>
        <DownloadButton preventivo={record} />
      </div>
    </div>
  )
}
