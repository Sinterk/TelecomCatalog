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
  // UI state (para renderizado)
  const [isBuilding, setIsBuilding] = useState(false)
  const [shareDone,  setShareDone]  = useState(false)
  const [saveState,  setSaveState]  = useState<'idle' | 'loading' | 'done'>('idle')
  const [errorMsg,   setErrorMsg]   = useState('')

  // Refs para el handler nativo (sin closures obsoletos)
  const shareButtonRef  = useRef<HTMLButtonElement>(null)
  const prebuildFileRef = useRef<File | null>(null)
  const preventivoRef   = useRef(preventivo)
  const isBuildingRef   = useRef(false)
  const shareDoneRef    = useRef(false)
  const errorTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mantener refs sincronizados con props/state
  preventivoRef.current = preventivo

  // ── Pre-construir ZIP en segundo plano (1 s de debounce) ─────────────────
  // Objetivo: cuando el usuario toque "Compartir", el archivo ya está listo
  // y navigator.share() se puede llamar sin ningún await intermedio.
  useEffect(() => {
    prebuildFileRef.current = null
    let cancelled = false

    const timer = setTimeout(async () => {
      isBuildingRef.current = true
      setIsBuilding(true)
      try {
        const { blob, fileName } = await buildZip(preventivo)
        if (cancelled) return
        prebuildFileRef.current = new File([blob], fileName, { type: 'application/zip' })
      } catch (err) {
        console.error('[TelecomCatalog] prebuild error:', err)
      } finally {
        if (!cancelled) { isBuildingRef.current = false; setIsBuilding(false) }
      }
    }, 1000)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [preventivo.updatedAt])

  function showError(msg: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    setErrorMsg(msg)
    errorTimerRef.current = setTimeout(() => setErrorMsg(''), 8000)
  }

  // ── Listener nativo de touchstart en el botón ─────────────────────────────
  //
  // Por qué nativo y no React (onClick / onPointerDown):
  //   React 18 delega TODOS los eventos al nodo raíz (#root). Chrome Android
  //   crea "transient activation" (user gesture) solo para listeners adjuntos
  //   DIRECTAMENTE al elemento tocado. Con la delegación de React, ua.isActive
  //   llega como false al handler, y navigator.share() lanza NotAllowedError.
  //
  //   Solución: addEventListener directo en el <button> con passive:false
  //   (permite e.preventDefault() para cancelar el click posterior).
  useEffect(() => {
    const btn = shareButtonRef.current
    if (!btn) return

    function onTouchStart(e: TouchEvent) {
      // Ignorar si el botón está en estado "deshabilitado"
      if (isBuildingRef.current || shareDoneRef.current) return

      const ua = (navigator as any).userActivation
      console.log('[TelecomCatalog] touchstart nativo, ua.isActive:', ua?.isActive)

      if (!window.isSecureContext) {
        showError('⚠️ Necesita HTTPS — abre desde GitHub Pages')
        return
      }
      if (!('share' in navigator)) {
        showError('⚠️ Abre en Chrome o Safari para compartir')
        return
      }

      const file = prebuildFileRef.current
      if (!file) {
        showError('⚠️ ZIP aún no está listo — espera un momento')
        return
      }

      // e.preventDefault() evita que disparen pointerdown / click después
      e.preventDefault()

      navigator.share({
        files: [file],
        title: `TelecomCatalog — ${preventivoRef.current.cuadrante.cuadrante || 'Levantamiento'}`,
        text: [preventivoRef.current.cuadrante.cuadrante, preventivoRef.current.cuadrante.comuna]
          .filter(Boolean).join(' — '),
      }).then(() => {
        shareDoneRef.current = true
        setShareDone(true)
        setTimeout(() => { shareDoneRef.current = false; setShareDone(false) }, 3000)
      }).catch((err: Error) => {
        const ua2 = (navigator as any).userActivation
        console.warn('[TelecomCatalog] share error:', err.name, 'ua.isActive:', ua2?.isActive)
        if (err.name !== 'AbortError') {
          showError(`⚠️ Error al compartir (${err.name}, ua=${ua2?.isActive}) — usa "Guardar archivo"`)
        }
      })
    }

    // passive: false permite llamar e.preventDefault()
    btn.addEventListener('touchstart', onTouchStart, { passive: false })
    return () => btn.removeEventListener('touchstart', onTouchStart)
  }, []) // Solo se registra una vez; usa refs para el estado actual

  // ── Guardar (descarga directa — escritorio / fallback) ────────────────────
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
    isBuilding ? 'bg-emerald-700/50 text-white/60 cursor-wait' :
    shareDone  ? 'bg-green-700 text-white'                     :
    'bg-emerald-700 hover:bg-emerald-600 text-white'

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">

      {/* Panel de error persistente con botón de cierre */}
      {errorMsg && (
        <div className="max-w-[220px] text-[11px] text-amber-200 bg-amber-900/80 border border-amber-700/60 px-2.5 py-2 rounded-lg flex items-start gap-2">
          <span className="flex-1 leading-snug">{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')}
            className="text-amber-300 hover:text-white font-bold text-base leading-none shrink-0 ml-1">×</button>
        </div>
      )}

      {/*
        Sin disabled ni onClick — el touchstart nativo gestiona todo.
        aria-disabled para accesibilidad; la opacidad comunica el estado visual.
      */}
      <button
        ref={shareButtonRef}
        type="button"
        aria-disabled={isBuilding || shareDone || saveState === 'loading'}
        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${shareClass}`}
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
