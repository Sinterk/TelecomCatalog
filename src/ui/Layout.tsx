import { NavLink } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'
import { getRole, clearRole } from '@/core/role'
import { OfflineBanner } from './OfflineBanner'

interface Props {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  const modules = registry.getAll()
  const role = getRole()

  function handleRoleChange() {
    if (confirm('¿Cambiar de rol? Se borrará la selección guardada en este dispositivo.')) {
      clearRole()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <span className="text-xl">📡</span>
        <span className="font-bold text-base tracking-tight flex-1">TelecomCatalog</span>
        {role && (
          <button type="button" onClick={handleRoleChange}
            title="Toca para cambiar de rol"
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors
              ${role === 'jp'
                ? 'bg-violet-900/60 text-violet-300 hover:bg-violet-800/60'
                : 'bg-cyan-900/60 text-cyan-300 hover:bg-cyan-800/60'
              }`}>
            {role === 'jp' ? '💼 JP' : '📱 Técnico'}
          </button>
        )}
      </header>

      <OfflineBanner />

      <main className="flex-1 overflow-y-auto px-4 py-4">{children}</main>

      {modules.length > 1 && (
        <nav className="bg-slate-900 border-t border-slate-800 flex sticky bottom-0 z-30">
          {modules.map((mod) => (
            <NavLink key={mod.id} to={mod.indexPath}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
                }`}>
              <span className="text-xl mb-0.5">{mod.icon}</span>
              {mod.name}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
