import { useState } from 'react'
import { PhotoCapture } from './PhotoCapture'
import { usePreventivoStore } from '../store'
import { deletePhotoBlob } from '@/core/offline/photoStore'
import type { Punto, FotoKey } from '../types'

interface Props {
  preventivoId: string
  punto: Punto
  index: number
  editable?: boolean
  onSave?: () => void
  onPhotoCapture: (file: File, key: FotoKey) => Promise<void>
}

export function PuntoCard({ preventivoId, punto, index, editable = true, onSave, onPhotoCapture }: Props) {
  const { updatePunto, removePunto, removeFoto } = usePreventivoStore()
  const [expanded, setExpanded] = useState(true)

  const fotosCount = [punto.fotoLevantamiento, punto.fotoAntes, punto.fotoDespues].filter(Boolean).length

  async function handleRemoveFoto(key: FotoKey) {
    const entry = punto[key]
    if (entry?.blobId) await deletePhotoBlob(entry.blobId).catch(() => {})
    removeFoto(preventivoId, punto.id, key)
  }

  const inputCls = `w-full text-sm rounded-lg px-3 py-2 border focus:outline-none placeholder-slate-500 ${
    editable
      ? 'bg-slate-700 text-white border-slate-600 focus:border-brand-500'
      : 'bg-slate-800 text-slate-300 border-slate-700 cursor-default'
  }`

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="bg-brand-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {editable ? (
          <input type="text" value={punto.nombre}
            onChange={(e) => updatePunto(preventivoId, punto.id, { nombre: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nombre del punto (ej. P1)*"
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-slate-500 focus:outline-none border-b border-transparent focus:border-brand-500 py-0.5" />
        ) : (
          <span className="flex-1 text-sm font-medium text-white truncate">
            {punto.nombre || `Punto ${index + 1}`}
          </span>
        )}

        {fotosCount > 0 && (
          <span className="text-[10px] text-slate-500 shrink-0">📷 {fotosCount}/3</span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {editable && (
            <button type="button" onClick={() => removePunto(preventivoId, punto.id)}
              className="text-slate-600 hover:text-red-400 text-base p-1 leading-none" title="Eliminar">×</button>
          )}
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="text-slate-400 text-xs p-1">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción <span className="text-red-400">*</span></label>
            <textarea value={punto.descripcion}
              onChange={(e) => editable && updatePunto(preventivoId, punto.id, { descripcion: e.target.value })}
              readOnly={!editable} rows={2}
              placeholder="Describe el trabajo realizado…"
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Dirección / Ubicación <span className="text-red-400">*</span></label>
            <input type="text" value={punto.direccion}
              onChange={(e) => editable && updatePunto(preventivoId, punto.id, { direccion: e.target.value })}
              readOnly={!editable}
              placeholder="Ej. 5a Av. 12-34" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Corrección</label>
            <input type="text" value={punto.correccion ?? ''}
              onChange={(e) => editable && updatePunto(preventivoId, punto.id, { correccion: e.target.value })}
              readOnly={!editable}
              placeholder="Corrección aplicada (opcional)" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Fotografías</label>
            <div className="grid grid-cols-3 gap-2">
              {(['fotoLevantamiento', 'fotoAntes', 'fotoDespues'] as FotoKey[]).map((key) => (
                <PhotoCapture key={key} fotoKey={key}
                  label={key === 'fotoLevantamiento' ? 'Levantamiento' : key === 'fotoAntes' ? 'Antes' : 'Después'}
                  entry={punto[key]}
                  editable={editable}
                  onCapture={onPhotoCapture}
                  onRemove={handleRemoveFoto} />
              ))}
            </div>
          </div>

          {editable && onSave && (
            <div className="flex justify-end pt-1 border-t border-slate-700">
              <button type="button" onClick={onSave}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white transition-colors">
                💾 Guardar punto {index + 1}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
