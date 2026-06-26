import { useAttStore } from '../store'
import { TIPO_PROYECTO_LABELS } from '../types'
import type { TipoProyecto } from '../types'

const TIPOS: TipoProyecto[] = [
  'acceso_fijo', 'backhaul', 'conectividad_movil', 'acceso_b2b',
  'proyectos_acceso', 'modernizacion', 'vulnerabilidad', 'adaptacion',
]

interface Props { recordId: string }

export function SeccionTipo({ recordId }: Props) {
  const { records, update } = useAttStore()
  const record = records[recordId]
  if (!record) return null

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">1. Tipo de proyecto</h2>
      <div className="grid grid-cols-2 gap-2">
        {TIPOS.map((tipo) => {
          const active = record.tipoProyecto === tipo
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => update(recordId, { tipoProyecto: active ? '' : tipo })}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                active
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-brand-500 hover:text-white'
              }`}
            >
              {TIPO_PROYECTO_LABELS[tipo]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
