import { useAttStore } from '../store'
import type { Infraestructura } from '../types'

interface Props { recordId: string }

const inputCls = 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-brand-500 focus:outline-none placeholder-slate-500'

type InfraKey = keyof Infraestructura

const INFRA_ROWS: Array<{ key: InfraKey; label: string; hasCantidad: boolean }> = [
  { key: 'postesElectricos',  label: 'Postes eléctricos',         hasCantidad: true  },
  { key: 'postesOtraTeleco',  label: 'Postes otra teleco',        hasCantidad: true  },
  { key: 'ductosOtraTeleco',  label: 'Ductos otra teleco',        hasCantidad: true  },
  { key: 'fibraOtraCompania', label: 'Fibra de otra compañía',    hasCantidad: false },
  { key: 'postesEntel',       label: 'Postes Entel',              hasCantidad: false },
]

export function SeccionInfra({ recordId }: Props) {
  const { records, update } = useAttStore()
  const record = records[recordId]
  if (!record) return null

  function setItem(key: 'postesElectricos' | 'postesOtraTeleco' | 'ductosOtraTeleco', field: 'usa' | 'cantidad' | 'compania', value: boolean | string) {
    update(recordId, {
      infraestructura: {
        ...record.infraestructura,
        [key]: { ...record.infraestructura[key], [field]: value },
      },
    })
  }

  function setSimple(key: 'fibraOtraCompania' | 'postesEntel', usa: boolean) {
    update(recordId, {
      infraestructura: { ...record.infraestructura, [key]: { usa } },
    })
  }

  const { postesElectricos, postesOtraTeleco, ductosOtraTeleco, fibraOtraCompania, postesEntel } = record.infraestructura

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4">
      <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">4. Infraestructura</h2>

      <div className="space-y-3">
        {/* Postes eléctricos */}
        <InfraRow
          label="Postes eléctricos"
          usa={postesElectricos.usa}
          cantidad={postesElectricos.cantidad}
          compania={postesElectricos.compania}
          onToggle={(v) => setItem('postesElectricos', 'usa', v)}
          onCantidad={(v) => setItem('postesElectricos', 'cantidad', v)}
          onCompania={(v) => setItem('postesElectricos', 'compania', v)}
          inputCls={inputCls}
        />
        {/* Postes otra teleco */}
        <InfraRow
          label="Postes otra teleco"
          usa={postesOtraTeleco.usa}
          cantidad={postesOtraTeleco.cantidad}
          compania={postesOtraTeleco.compania}
          onToggle={(v) => setItem('postesOtraTeleco', 'usa', v)}
          onCantidad={(v) => setItem('postesOtraTeleco', 'cantidad', v)}
          onCompania={(v) => setItem('postesOtraTeleco', 'compania', v)}
          inputCls={inputCls}
        />
        {/* Ductos otra teleco */}
        <InfraRow
          label="Ductos otra teleco"
          usa={ductosOtraTeleco.usa}
          cantidad={ductosOtraTeleco.cantidad}
          compania={ductosOtraTeleco.compania}
          onToggle={(v) => setItem('ductosOtraTeleco', 'usa', v)}
          onCantidad={(v) => setItem('ductosOtraTeleco', 'cantidad', v)}
          onCompania={(v) => setItem('ductosOtraTeleco', 'compania', v)}
          inputCls={inputCls}
        />

        {/* Fibra otra compañía (solo toggle) */}
        <div className="flex items-center gap-3 py-2 border-t border-slate-700/50">
          <input type="checkbox" id="fibraOtraCompania" checked={fibraOtraCompania.usa}
            onChange={(e) => setSimple('fibraOtraCompania', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
          <label htmlFor="fibraOtraCompania" className="text-sm text-slate-200 cursor-pointer flex-1">
            Usa fibra de otra compañía
          </label>
        </div>

        {/* Postes Entel (solo toggle) */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="postesEntel" checked={postesEntel.usa}
            onChange={(e) => setSimple('postesEntel', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
          <label htmlFor="postesEntel" className="text-sm text-slate-200 cursor-pointer flex-1">
            Usa postes Entel
          </label>
        </div>
      </div>
    </div>
  )
}

function InfraRow({ label, usa, cantidad, compania, onToggle, onCantidad, onCompania, inputCls }: {
  label: string
  usa: boolean
  cantidad: string
  compania: string
  onToggle: (v: boolean) => void
  onCantidad: (v: string) => void
  onCompania: (v: string) => void
  inputCls: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={usa} onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded accent-brand-500 cursor-pointer" />
        <span className="text-sm text-slate-200">{label}</span>
      </div>
      {usa && (
        <div className="ml-7 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
            <input type="text" inputMode="numeric" value={cantidad}
              onChange={(e) => onCantidad(e.target.value)}
              placeholder="Ej. 5" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Compañía</label>
            <input type="text" value={compania}
              onChange={(e) => onCompania(e.target.value)}
              placeholder="Ej. Claro" className={inputCls} />
          </div>
        </div>
      )}
    </div>
  )
}
