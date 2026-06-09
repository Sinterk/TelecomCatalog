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
  const [debugMsg,   setDebugMsg]   = useState('')  // diagnóstico en pantalla (v0.11)

  // Refs para evitar closures obsoletos y await antes de share()
  const prebuildFileRef = useRef<File | null>(null)
  const errorTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pre-construir ZIP en segundo plano (1 s de debounce) ─────────────────
  // Objetivo: cuando el usuario toque "Compartir", el archivo ya está listo
  // y navigator.share() se puede llamar SIN ningún await intermedio. Cruzar
  // un await consumiría la "transient activation" y share() lanzaría
  // NotAllowedError. Por eso pre-construimos aquí, fuera del gesto.
  useEffect(() => {
    prebuildFileRef.current = null
    let cancelled = false

    const timer = setTimeout(async () => {
      setIsBuilding(true)
      try {
        const { blob, fileName } = await buildZip(preventivo)
        if (cancelled) return
        prebuildFileRef.current = new File([blob], fileName, { type: 'application/zip' })
      } catch (err) {
        console.error('[TelecomCatalog] prebuild error:', err)
      } finally {
        if (!cancelled) setIsBuilding(false)
      }
    }, 1000)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [preventivo.updatedAt])

  function showError(msg: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    setErrorMsg(msg)
    errorTimerRef.current = setTimeout(() => setErrorMsg(''), 8000)
  }

  // ── Compartir (onClick de React) ──────────────────────────────────────────
  //
  // Por qué `click` y NO `touchstart`:
  //   Según la HTML spec, los eventos que otorgan "transient activation" son:
  //   keydown, mousedown, pointerdown, pointerup, touchend y click.
  //   `touchstart` está EXCLUIDO a propósito (podría ser el inicio de un
  //   scroll), por eso userActivation.isActive llegaba false y share() fallaba.
  //   Un onClick de React es un `click` trusted → sí concede activación.
  //
  // Clave: NO hacer ningún await antes de share(). El archivo se pre-construye
  //   en el useEffect de arriba; aquí solo lo leemos del ref y compartimos.
  function handleShare() {
    if (isBuilding || shareDone || saveState === 'loading') return

    // ── Diagnóstico (v0.11): capturar estado en el instante del tap ──────────
    const ua = (navigator as any).userActivation
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    const file = prebuildFileRef.current
    const canShareFiles = file && navigator.canShare
      ? navigator.canShare({ files: [file] })
      : 'n/a'
    const diag =
      `act=${ua?.isActive} been=${ua?.hasBeenActive} ` +
      `standalone=${standalone} canShareFiles=${canShareFiles} ` +
      `secure=${window.isSecureContext}`
    setDebugMsg(diag)
    console.log('[TelecomCatalog] share diag:', diag)

    if (!window.isSecureContext) {
      showError('⚠️ Necesita HTTPS — abre desde GitHub Pages')
      return
    }
    if (!('share' in navigator)) {
      showError('⚠️ Abre en Chrome o Safari para compartir')
      return
    }
    if (!file) {
      showError('⚠️ ZIP aún no está listo — espera un momento')
      return
    }

    const shareData: ShareData = {
      files: [file],
      title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
      text: [preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna]
        .filter(Boolean).join(' — '),
    }

    if (navigator.canShare && !navigator.canShare(shareData)) {
      showError('⚠️ canShare(full)=false — el payload (title/text/files) no es compartible')
      return
    }

    navigator.share(shareData).then(() => {
      setShareDone(true)
      setTimeout(() => setShareDone(false), 3000)
    }).catch((err: Error) => {
      const ua2 = (navigator as any).userActivation
      console.warn('[TelecomCatalog] share error:', err.name, err.message)
      setDebugMsg(`${diag} → ERR ${err.name} act2=${ua2?.isActive}`)
      if (err.name !== 'AbortError') {
        showError(`⚠️ ${err.name}: ${err.message || 's/d'} — usa "Guardar archivo"`)
      }
    })
  }

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
        onClick directo: `click` es un gesto que concede transient activation,
        así que navigator.share() funciona. El archivo ya viene pre-construido,
        por lo que no hay await entre el gesto y share().
      */}
      <button
        type="button"
        onClick={handleShare}
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

      {/* Diagnóstico temporal (v0.11) — quitar cuando share funcione */}
      {debugMsg && (
        <div className="max-w-[240px] text-[9px] font-mono text-cyan-200 bg-slate-800 border border-cyan-800/50 px-2 py-1.5 rounded-lg break-all leading-snug">
          {debugMsg}
          <button type="button" onClick={() => setDebugMsg('')}
            className="ml-1 text-cyan-400 font-bold">×</button>
        </div>
      )}
    </div>
  )
}
