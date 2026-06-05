import { setRole } from '@/core/role'
import type { AppRole } from '@/core/role'

interface Props { onSelect: (role: AppRole) => void }

export function RoleSelector({ onSelect }: Props) {
  function select(role: AppRole) { setRole(role); onSelect(role) }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center space-y-2">
        <div className="text-5xl">📡</div>
        <h1 className="text-2xl font-bold text-white">TelecomCatalog</h1>
        <p className="text-slate-400 text-sm">¿Qué rol usas hoy?</p>
      </div>
      <div className="w-full max-w-sm space-y-3">
        <button type="button" onClick={() => select('tecnico')}
          className="w-full bg-cyan-900/60 hover:bg-cyan-800/80 border-2 border-cyan-700 hover:border-cyan-500 text-white rounded-2xl p-5 text-left transition-colors">
          <div className="text-3xl mb-2">📱</div>
          <div className="text-base font-semibold text-cyan-300">Técnico en terreno</div>
          <div className="text-xs text-slate-400 mt-1">Capturo fotos y datos en campo. Exporto ZIP al terminar.</div>
        </button>
        <button type="button" onClick={() => select('jp')}
          className="w-full bg-violet-900/60 hover:bg-violet-800/80 border-2 border-violet-700 hover:border-violet-500 text-white rounded-2xl p-5 text-left transition-colors">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-base font-semibold text-violet-300">Jefe de Proyecto</div>
          <div className="text-xs text-slate-400 mt-1">Importo el ZIP del técnico, reviso y exporto el informe final.</div>
        </button>
      </div>
      <p className="text-xs text-slate-600 text-center max-w-xs">El rol se guarda localmente. Toca tu rol en la barra superior para cambiarlo.</p>
    </div>
  )
}
