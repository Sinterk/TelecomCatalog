import { useState, useEffect } from 'react'
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

type ShareState = 'idle' | 'preparing' | 'ready' | 'done' | 'error'

export function ExportZipButton({ preventivo }: Props) {
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [saveState,  setSaveState]  = useState<'idle' | 'loading' | 'done'>('idle')
  const [shareMsg,   setShareMsg]   = useState('')
  const [readyFile,  setReadyFile]  = useState<File | null>(null)

  const busy = shareState === 'preparing' || saveState === 'loading'

  // Invalidar ZIP cacheado si los datos cambian mientras esperamos
  useEffect(() => {
    if (!readyFile) return
    setReadyFile(null)
    if (shareState === 'ready') setShareState('idle')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preventivo.updatedAt])

  // Auto-cancelar 'ready' después de 15 s
  useEffect(() => {
    if (shareState !== 'ready') return
    const t = setTimeout(() => { setShareState('idle'); setReadyFile(null) }, 15_000)
    return () => clearTimeout(t)
  }, [shareState])

  function showShareError(msg: string) {
    setShareMsg(msg); setShareState('error'); setReadyFile(null)
    setTimeout(() => { setShareState('idle'); setShareMsg('') }, 5000)
  }

  // ── Paso 1: construir ZIP (onClick — no necesita gesto activo) ────────────
  async function handleClick() {
    // Paso 2 lo gestiona onPointerDown; aquí solo hacemos Paso 1
    if (shareState === 'ready') return

    if (!window.isSecureContext) { showShareError('⚠️ Necesita HTTPS — abre desde GitHub Pages'); return }
    if (!('share' in navigator))  { showShareError('⚠️ Abre en Chrome o Safari para compartir'); return }

    setShareState('preparing')
    try {
      const { blob, fileName } = await buildZip(preventivo)
      const file = new File([blob], fileName, { type: 'application/zip' })
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        showShareError('⚠️ Este navegador no comparte archivos — usa "Guardar"')
        return
      }
      setReadyFile(file)
      setShareState('ready')
    } catch (err) {
      console.error('[TelecomCatalog] buildZip error:', err)
      showShareError('⚠️ Error al preparar ZIP — intenta de nuevo')
    }
  }

  // ── Paso 2: compartir (onPointerDown — gesto más temprano y directo) ──────
  //
  // Por qué onPointerDown en vez de onClick:
  //   Chrome Android crea el "transient activation" (user gesture token) en
  //   touchstart/pointerdown, mucho antes de que dispare click. React delega
  //   onClick al root del DOM; para cuando el evento llega al handler el token
  //   puede estar invalidado. onPointerDown captura el gesto en su origen.
  //
  //   Además, animate-pulse impide que algunos Chrome Android registren el tap
  //   como gesto válido; el botón 'ready' usa color estático (sin animación).
  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (shareState !== 'ready' || !readyFile) return
    e.preventDefault() // Evita que dispare click después

    const file = readyFile
    setReadyFile(null)
    setShareState('idle')

    const ua = (navigator as any).userActivation
    console.log('[TelecomCatalog] share via pointerDown, ua.isActive:', ua?.isActive)

    navigator.share({
      files: [file],
      title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
      text: [preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna].filter(Boolean).join(' — '),
    }).then(() => {
      setShareState('done')
      setTimeout(() => setShareState('idle'), 2500)
    }).catch((err: Error) => {
      const name = err.name
      const ua2 = (navigator as any).userActivation
      console.warn('[TelecomCatalog] share error:', name, 'ua.isActive:', ua2?.isActive)
      if (name === 'AbortError') { setShareState('idle'); return }
      showShareError(`⚠️ Error al compartir (${name}, ua=${ua2?.isActive}) — usa "Guardar"`)
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

  // ── Etiquetas y estilos ───────────────────────────────────────────────────
  const shareLabel =
    shareState === 'preparing' ? '⏳ Preparando…'      :
    shareState === 'ready'     ? '📲 Toca para enviar' :
    shareState === 'done'      ? '✅ Compartido'        :
    shareState === 'error'     ? shareMsg               :
    '📤 Compartir ZIP'

  // Sin animate-pulse en 'ready': Chrome Android no registra taps en elementos
  // con CSS animations activas como gestos válidos en algunas versiones.
  const shareClass =
    shareState === 'done'  ? 'bg-green-700 text-white'        :
    shareState === 'ready' ? 'bg-emerald-300 text-slate-900'  :
    shareState === 'error' ? 'bg-amber-700/80 text-amber-100' :
    'bg-emerald-700 hover:bg-emerald-600 text-white'

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">

      <button
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        disabled={busy}
        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${shareClass}`}
      >
        {shareLabel}
      </button>

      <button type="button" onClick={handleSave} disabled={busy}
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
