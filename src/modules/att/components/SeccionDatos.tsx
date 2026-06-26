import { useAttStore } from '../store'

interface Props { recordId: string }

const inputCls = 'w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-brand-500 focus:outline-none placeholder-slate-500'

export function SeccionDatos({ recordId }: Props) {
  const { records, update } = useAttStore()
  const record = records[recordId]
  if (!record) return null

  function set(data: Parameters<typeof update>[1]) {
    update(recordId, data)
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4">
      <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">2. Datos del proyecto</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">OTT <span className="text-red-400">*</span></label>
          <input type="text" value={record.ott}
            onChange={(e) => set({ ott: e.target.value })}
            placeholder="Ej. 72503609135" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Iniciativa</label>
          <input type="text" value={record.iniciativa}
            onChange={(e) => set({ iniciativa: e.target.value })}
            placeholder="Ej. IN-0001" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Nombre del proyecto</label>
        <input type="text" value={record.nombreProyecto}
          onChange={(e) => set({ nombreProyecto: e.target.value })}
          placeholder="Ej. Reposición FO Sector Sur" className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ingeniero del proyecto</label>
          <input type="text" value={record.ingenieroProyecto}
            onChange={(e) => set({ ingenieroProyecto: e.target.value })}
            placeholder="Nombre" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Jefe de proyecto</label>
          <input type="text" value={record.jefeProyecto}
            onChange={(e) => set({ jefeProyecto: e.target.value })}
            placeholder="Nombre" className={inputCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Comuna</label>
          <input type="text" value={record.comuna}
            onChange={(e) => set({ comuna: e.target.value })}
            placeholder="Ej. Providencia" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Región</label>
          <input type="text" value={record.region}
            onChange={(e) => set({ region: e.target.value })}
            placeholder="Ej. Metropolitana" className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Contratista</label>
        <input type="text" value={record.contratista}
          onChange={(e) => set({ contratista: e.target.value })}
          placeholder="Ej. SINTERK" className={inputCls} />
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-700">
        <p className="text-xs text-slate-400 font-medium">Coordenadas inicio</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Latitud</label>
            <input type="text" value={record.coordsInicio.lat}
              onChange={(e) => set({ coordsInicio: { ...record.coordsInicio, lat: e.target.value } })}
              placeholder="-33.4569…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Longitud</label>
            <input type="text" value={record.coordsInicio.lng}
              onChange={(e) => set({ coordsInicio: { ...record.coordsInicio, lng: e.target.value } })}
              placeholder="-70.6483…" className={inputCls} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-medium">Coordenadas término</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Latitud</label>
            <input type="text" value={record.coordsTermino.lat}
              onChange={(e) => set({ coordsTermino: { ...record.coordsTermino, lat: e.target.value } })}
              placeholder="-33.4569…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Longitud</label>
            <input type="text" value={record.coordsTermino.lng}
              onChange={(e) => set({ coordsTermino: { ...record.coordsTermino, lng: e.target.value } })}
              placeholder="-70.6483…" className={inputCls} />
          </div>
        </div>
      </div>
    </div>
  )
}
