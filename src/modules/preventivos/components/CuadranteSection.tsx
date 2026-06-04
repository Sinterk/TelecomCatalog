import { usePreventivoStore } from '../store'
import type { CuadranteInfo } from '../types'

interface Props {
  preventivoId: string
  cuadrante: CuadranteInfo
}

export function CuadranteSection({ preventivoId, cuadrante }: Props) {
  const { updateCuadrante } = usePreventivoStore()

  function set<K extends keyof CuadranteInfo>(key: K, value: CuadranteInfo[K]) {
    updateCuadrante(preventivoId, { [key]: value })
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-5">
      <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">
        📍 Información de Cuadrante
      </h2>

      {/* ── Obligatorios ─────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Obligatorio
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comuna" required span={1}>
            <input
              type="text"
              value={cuadrante.comuna}
              onChange={(e) => set('comuna', e.target.value)}
              placeholder="Ej. San Marcos"
              className={inputCls}
            />
          </Field>

          <Field label="Cuadrante" required span={1}>
            <input
              type="text"
              value={cuadrante.cuadrante}
              onChange={(e) => set('cuadrante', e.target.value)}
              placeholder="Ej. C-042"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Divisor */}
      <div className="border-t border-slate-700" />

      {/* ── Opcionales ───────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Opcional
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha" span={1}>
            <input
              type="date"
              value={cuadrante.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Semana" span={1}>
            <input
              type="text"
              value={cuadrante.semana}
              onChange={(e) => set('semana', e.target.value)}
              placeholder="Ej. Semana 24"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Nombre cuadrante">
          <input
            type="text"
            value={cuadrante.nombreCuadrante}
            onChange={(e) => set('nombreCuadrante', e.target.value)}
            placeholder="Ej. Norte Centro Histórico"
            className={inputCls}
          />
        </Field>

        <Field label="Dirección">
          <input
            type="text"
            value={cuadrante.direccion}
            onChange={(e) => set('direccion', e.target.value)}
            placeholder="Ej. 6a Av. 0-60, zona 1"
            className={inputCls}
          />
        </Field>

        <Field label="Zona">
          <input
            type="text"
            value={cuadrante.zona}
            onChange={(e) => set('zona', e.target.value)}
            placeholder="Ej. Zona 1"
            className={inputCls}
          />
        </Field>
      </div>
    </div>
  )
}

const inputCls =
  'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-brand-500 focus:outline-none placeholder-slate-500'

function Field({
  label,
  required,
  span,
  children,
}: {
  label: string
  required?: boolean
  span?: number
  children: React.ReactNode
}) {
  return (
    <div className={span === 1 ? '' : 'col-span-2'}>
      <label className="block text-xs text-slate-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
