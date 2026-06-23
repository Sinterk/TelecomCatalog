import { useNavigate } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'

export function ProjectHome() {
  const navigate = useNavigate()
  const modules = registry.getAll()

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="text-xl font-bold text-white">¿En qué vas a trabajar?</h1>
        <p className="text-sm text-slate-400 mt-1">Selecciona el tipo de proyecto</p>
      </div>
      <div className="flex flex-col gap-4">
        {modules.map((mod) => (
          <button
            key={mod.id}
            type="button"
            onClick={() => navigate(mod.indexPath)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-brand-500 rounded-2xl p-5 text-left transition-colors group"
          >
            <div className="text-5xl mb-3">{mod.icon}</div>
            <div className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">{mod.name}</div>
            <div className="text-sm text-slate-400 mt-1 leading-relaxed">{mod.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
