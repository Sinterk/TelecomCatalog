import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePreventivoStore } from '../../store'
import { fetchAllPreventivos } from '@/core/sync/preventivoSync'
import type { Preventivo } from '../../types'

export function FieldHome() {
  const navigate = useNavigate()
  const { records, mergeFromServer } = usePreventivoStore()
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')

  const list = Object.values(records).sort((a, b) => b.updatedAt - a.updatedAt)

  const filtered = list.filter((r) => {
    const q = search.toLowerCase()
    return (
      r.cuadrante.cuadrante.toLowerCase().includes(q) ||
      r.cuadrante.comuna.toLowerCase().includes(q) ||
      r.cuadrante.nombreCuadrante.toLowerCase().includes(q) ||
      r.cuadrante.zona.toLowerCase().includes(q)
    )
  })

  // Obtener cuadrantes del servidor al abrir
  useEffect(() => {
    setSyncing(true)
    fetchAllPreventivos()
      .then(mergeFromServer)
      .catch(() => {/* offline */})
      .finally(() => setSyncing(false))
  }, [mergeFromServer])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          📡 Terreno — Preventivos
        </h1>
        <p className="text-xs text-slate-400">
          {syncing
            ? '↻ Descargando cuadrantes…'
            : `${list.length} cuadrante(s) disponibles`}
        </p>
      </div>

      {/* Buscador */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Buscar por cuadrante, comuna o zona…"
        className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:border-brand-500 focus:outline-none placeholder-slate-500"
      />

      {/* Empty */}
      {!syncing && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500 space-y-2">
          <div className="text-5xl">🔌</div>
          <p className="text-sm">
            {list.length === 0
              ? 'No hay cuadrantes disponibles. Conéctate a la red para sincronizar.'
              : 'No hay resultados para tu búsqueda.'}
          </p>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <FieldCuadranteCard
            key={r.id}
            record={r}
            onSelect={() => navigate(`/preventivos/field/${r.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function FieldCuadranteCard({
  record,
  onSelect,
}: {
  record: Preventivo
  onSelect: () => void
}) {
  const photos = record.puntos.reduce(
    (n, p) => n + (p.fotoLevantamiento ? 1 : 0) + (p.fotoAntes ? 1 : 0) + (p.fotoDespues ? 1 : 0),
    0,
  )

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left bg-slate-800 rounded-2xl border border-slate-700 p-4 hover:border-brand-500 active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {record.cuadrante.cuadrante || 'Sin ID'}{' '}
            <span className="font-normal text-slate-400">
              {record.cuadrante.comuna ? `— ${record.cuadrante.comuna}` : ''}
            </span>
          </div>
          {record.cuadrante.nombreCuadrante && (
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              {record.cuadrante.nombreCuadrante}
            </div>
          )}
          <div className="flex gap-3 mt-1.5">
            {record.cuadrante.fecha && (
              <span className="text-[11px] text-slate-500">📅 {record.cuadrante.fecha}</span>
            )}
            {record.cuadrante.zona && (
              <span className="text-[11px] text-slate-500">📍 {record.cuadrante.zona}</span>
            )}
            <span className="text-[11px] text-slate-500">{record.puntos.length} punto(s)</span>
            <span className="text-[11px] text-slate-500">📷 {photos}</span>
          </div>
        </div>
        <span className="text-brand-400 text-xl shrink-0">›</span>
      </div>
    </button>
  )
}
