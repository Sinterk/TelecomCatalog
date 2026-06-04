import { useState } from 'react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Props {
  onSave: () => Promise<void>
  label?: string
  className?: string
}

export function SaveButton({ onSave, label = 'Guardar', className = '' }: Props) {
  const [state, setState] = useState<SaveState>('idle')

  async function handle() {
    if (state === 'saving') return
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const cfg: Record<SaveState, { text: string; cls: string }> = {
    idle:   { text: `💾 ${label}`,    cls: 'bg-brand-600 hover:bg-brand-700 text-white' },
    saving: { text: '⏳ Guardando…',  cls: 'bg-slate-600 text-slate-300 cursor-wait' },
    saved:  { text: '✅ Guardado',    cls: 'bg-green-700 text-white' },
    error:  { text: '❌ Error al guardar', cls: 'bg-red-700 text-white' },
  }

  const { text, cls } = cfg[state]

  return (
    <button
      type="button"
      onClick={handle}
      disabled={state === 'saving'}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-wait ${cls} ${className}`}
    >
      {text}
    </button>
  )
}
