import { useNavigate } from 'react-router-dom'
import { useAttStore } from '../store'
import type { AttRecord } from '../types'

export function Home() {
  const navigate = useNavigate()
  const { records, createNew, remove } = useAttStore()
  const list = Object.values(records).sort((a, b) => b.updatedAt - a.updatedAt)

  function handleNew() {
    const id = createNew()
    navigate(`/att/${id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">🔧 Instalaciones ATT</h1>
          <p className="text-xs text-slate-400">{list.length} registro(s)</p>
        </div>
        <button type="button" onClick={handleNew}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3 py-2 rounded-xl">
          ➕ Nueva OTT
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 text-slate-500 space-y-2">
          <div className="text-5xl">🔌</div>
          <p className="text-sm">Registra tu primera instalación ATT.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <AttCard key={r.id} record={r}
              onSelect={() => navigate(`/att/${r.id}`)}
              onDelete={() => { if (confirm('¿Eliminar esta instalación?')) remove(r.id) }} />
          ))}
        </div>
      )}
    </div>
  )
}

function AttCard({ record, onSelect, onDelete }: {
  record: AttRecord; onSelect: () => void; onDelete: () => void
}) {
  const fotoCount = Object.keys(record.fotos).length + record.fotosExtra.length

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 hover:border-brand-500 transition-colors">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onSelect} className="flex-1 text-left min-w-0">
          <div className="text-sm font-semibold text-white">
            OTT: {record.ott || <span className="text-slate-500 font-normal">Sin número</span>}
          </div>
          {record.direccion && (
            <div className="text-xs text-slate-400 mt-0.5 truncate">📍 {record.direccion}</div>
          )}
          <div className="flex gap-3 mt-1.5 flex-wrap">
            {record.fechaInicio && (
              <span className="text-[11px] text-slate-500">📅 {record.fechaInicio}</span>
            )}
            {fotoCount > 0 && (
              <span className="text-[11px] text-slate-500">📷 {fotoCount} foto(s)</span>
            )}
          </div>
          {record.descripcion && (
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{record.descripcion}</p>
          )}
        </button>
        <button type="button" onClick={onDelete}
          className="text-slate-600 hover:text-red-400 text-lg p-1 leading-none shrink-0">×</button>
      </div>
    </div>
  )
}
