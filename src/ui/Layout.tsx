import { NavLink } from 'react-router-dom'
import { registry } from '@/core/registry/projectRegistry'
import { MODE } from '@/core/mode'
import { OfflineBanner } from './OfflineBanner'

interface Props {
  children: React.ReactNode
}

export function Layout({ children }: Props) {
  const modules = registry.getAll()

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 safe-area-top sticky top-0 z-30">
        <span className="text-xl">📡</span>
        <span className="font-bold text-base tracking-tight">TelecomCatalog</span>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          MODE === 'office'
            ? 'bg-violet-900/60 text-violet-300'
            : 'bg-cyan-900/60 text-cyan-300'
        }`}>
          {MODE === 'office' ? '🏢 Oficina' : '📡 Terreno'}
        </span>
      </header>

      {/* Offline banner */}
      <OfflineBanner />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </main>

      {/* Bottom nav — visible sólo cuando hay >1 módulo */}
      {modules.length > 1 && (
        <nav className="bg-slate-900 border-t border-slate-800 flex safe-area-bottom sticky bottom-0 z-30">
          {modules.map((mod) => (
            <NavLink
              key={mod.id}
              to={mod.indexPath}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <span className="text-xl mb-0.5">{mod.icon}</span>
              {mod.name}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
