import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props { preventivo: Preventivo }

const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

// ── Construir el ZIP ──────────────────────────────────────────────────────────
async function buildZip(preventivo: Preventivo): Promise<{ blob: Blob; fileName: string }> {
  const zip = new JSZip()
  const f = zip.folder('fotos')!
  const plano = preventivo.cuadrante.fotoPlano

  if (plano?.blobId) {
    const e = await getPhotoBlob(plano.blobId)
    if (e) f.file(plano.fileName, e.blob)
  }
  for (const p of preventivo.puntos) {
    for (const k of FOTO_KEYS) {
      const foto = p[k]
      if (!foto?.blobId) continue
      const e = await getPhotoBlob(foto.blobId)
      if (e) f.file(foto.fileName, e.blob)
    }
  }

  zip.file('telecom_v1.json', JSON.stringify({
    version: 1, app: 'TelecomCatalog', exportedAt: new Date().toISOString(),
    levantamiento: {
      id: preventivo.id, createdAt: preventivo.createdAt, updatedAt: preventivo.updatedAt,
      cuadrante: {
        ...preventivo.cuadrante,
        fotoPlano: plano ? { fileName: plano.fileName, capturedAt: plano.capturedAt } : null,
      },
      puntos: preventivo.puntos.map((p) => ({
        id: p.id, nombre: p.nombre, descripcion: p.descripcion,
        direccion: p.direccion, correccion: p.correccion,
        fotos: {
          levantamiento: p.fotoLevantamiento ? { fileName: p.fotoLevantamiento.fileName, capturedAt: p.fotoLevantamiento.capturedAt } : null,
          antes: p.fotoAntes ? { fileName: p.fotoAntes.fileName, capturedAt: p.fotoAntes.capturedAt } : null,
          despues: p.fotoDespues ? { fileName: p.fotoDespues.fileName, capturedAt: p.fotoDespues.capturedAt } : null,
        },
      })),
    },
  }, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const slug = (s?: string) => (s || 'x').replace(/[^a-z0-9-]/gi, '_')
  const fileName = `telecom_${slug(preventivo.cuadrante.cuadrante)}_${slug(preventivo.cuadrante.comuna)}_${new Date().toISOString().slice(0, 10)}.zip`
  return { blob, fileName }
}

// ── Componente ────────────────────────────────────────────────────────────────
export function ExportZipButton({ preventivo }: Props) {
  // ZIP pre-construido en segundo plano — listo antes de que el usuario toque
  const [prebuildFile, setPrebuildFile] = useState<File | null>(null)
  const [isBuilding,   setIsBuilding]   = useState(false)
  const [shareDone,    setShareDone]    = useState(false)
  const [saveState,    setSaveState]    = useState<'idle' | 'loading' | 'done'>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Construir ZIP en segundo plano cada vez que los datos cambian (debounce 1 s).
  // Objetivo: cuando el usuario presione "Compartir", el archivo ya está listo
  // y navigator.share() se puede llamar inmediatamente, sin ningún await previo
  // que agote el transient activation de Chrome Android.
  useEffect(() => {
    setPrebuildFile(null)
    let cancelled = false

    const timer = setTimeout(async () => {
      setIsBuilding(true)
      try {
        const { blob, fileName } = await buildZip(preventivo)
        if (cancelled) return
        setPrebuildFile(new File([blob], fileName, { type: 'application/zip' }))
      } catch (err) {
        console.error('[TelecomCatalog] prebuild error:', err)
      } finally {
        if (!cancelled) setIsBuilding(false)
      }
    }, 1000)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [preventivo.updatedAt])

  function showError(msg: string) {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    setErrorMsg(msg)
    errorTimer.current = setTimeout(() => setErrorMsg(''), 8000)
  }

  // ── Compartir (onPointerDown = gesto más temprano, antes del click) ────────
  function handleSharePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (isBuilding || shareDone || saveState === 'loading') return

    if (!window.isSecureContext) {
      showError('⚠️ Necesita HTTPS — abre desde GitHub Pages')
      return
    }
    if (!('share' in navigator)) {
      showError('⚠️ Abre en Chrome o Safari para compartir')
      return
    }
    if (!prebuildFile) {
      showError('⚠️ ZIP aún no está listo — espera un momento e intenta de nuevo')
      return
    }
    if (navigator.canShare && !navigator.canShare({ files: [prebuildFile] })) {
      showError('⚠️ Este navegador no puede compartir archivos — usa "Guardar archivo"')
      return
    }

    e.preventDefault() // evita que dispare click después
    const file = prebuildFile

    const ua = (navigator as any).userActivation
    console.log('[TelecomCatalog] share pointerDown, ua.isActive:', ua?.isActive)

    navigator.share({
      files: [file],
      title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
      text: [preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna].filter(Boolean).join(' — '),
    }).then(() => {
      setShareDone(true)
      setTimeout(() => setShareDone(false), 3000)
    }).catch((err: Error) => {
      const ua2 = (navigator as any).userActivation
      console.warn('[TelecomCatalog] share error:', err.name, 'ua.isActive:', ua2?.isActive)
      if (err.name === 'AbortError') return
      showError(`⚠️ Error al compartir (${err.name}, ua=${ua2?.isActive}) — usa "Guardar archivo"`)
    })
  }

  // ── Guardar (descarga directa) ─────────────────────────────────────────────
  async function handleSave() {
    setSaveState('loading')
    try {
      const { blob, fileName } = await buildZip(preventivo)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
      setSaveState('done')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err) {
      console.error('Error al guardar ZIP:', err)
      setSaveState('idle')
    }
  }

  const shareLabel =
    isBuilding ? '⏳ Preparando…' :
    shareDone  ? '✅ Compartido'  :
    '📤 Compartir ZIP'

  const shareClass =
    isBuilding ? 'bg-emerald-700/50 text-white cursor-wait' :
    shareDone  ? 'bg-green-700 text-white'                   :
    'bg-emerald-700 hover:bg-emerald-600 text-white'

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">

      {/* Error persistente con botón de cierre */}
      {errorMsg && (
        <div className="max-w-[220px] text-[11px] text-amber-200 bg-amber-900/80 border border-amber-700/60 px-2.5 py-2 rounded-lg flex items-start gap-2">
          <span className="flex-1 leading-snug">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')}
            className="text-amber-300 hover:text-white font-bold text-base leading-none shrink-0">×</button>
        </div>
      )}

      <button
        type="button"
        onPointerDown={handleSharePointerDown}
        disabled={isBuilding || shareDone || saveState === 'loading'}
        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${shareClass}`}
      >
        {shareLabel}
      </button>

      <button type="button" onClick={handleSave} disabled={saveState === 'loading'}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
          saveState === 'done' ? 'bg-slate-600 text-green-300' :
          'bg-slate-700 hover:bg-slate-600 text-slate-300'
        }`}>
        {saveState === 'loading' ? '⏳ Guardando…'
          : saveState === 'done'  ? '✅ Guardado'
          : '📥 Guardar archivo'}
      </button>

      {saveState === 'done' && (
        <p className="text-[10px] text-slate-500">
          ⚠ En WhatsApp: enviar como <strong>Documento</strong>
        </p>
      )}
    </div>
  )
}
