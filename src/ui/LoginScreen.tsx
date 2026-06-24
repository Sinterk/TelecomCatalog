interface Props {
  onEnter: () => void
}

export function LoginScreen({ onEnter }: Props) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📡</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">TelecomCatalog</h1>
          <p className="text-slate-400 text-sm mt-2">Gestión de proyectos de telecomunicaciones</p>
        </div>

        {/* Formulario (futuro: usuario + contraseña) */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Usuario</label>
            <input
              type="text"
              disabled
              placeholder="usuario@empresa.cl"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-slate-500 placeholder-slate-600 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Contraseña</label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-3 py-2.5 text-sm text-slate-500 placeholder-slate-600 cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-xl bg-brand-700/40 text-brand-400/50 font-semibold text-sm cursor-not-allowed"
          >
            Ingresar
          </button>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-600">o</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={onEnter}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-white font-semibold text-sm transition-colors"
          >
            Ingresar como invitado
          </button>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          Inicio de sesión con usuario disponible próximamente
        </p>
      </div>
    </div>
  )
}
