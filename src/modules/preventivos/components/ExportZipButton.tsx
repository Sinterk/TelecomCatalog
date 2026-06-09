import { useState, useEffect, useRef } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props { preventivo: Preventivo }

const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']

// ── Construir el ZIP (compartido por ambos botones) ───────────────────────────
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

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ShareState = 'idle' | 'preparing' | 'ready' | 'sharing' | 'done' | 'error'

// ── Componente ────────────────────────────────────────────────────────────────
export function ExportZipButton({ preventivo }: Props) {
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [saveState,  setSaveState]  = useState<'idle' | 'loading' | 'done'>('idle')
  const [shareMsg,   setShareMsg]   = useState('')

  // El archivo ZIP cacheado entre el paso 1 (preparar) y el paso 2 (compartir)
  const cachedFile = useRef<File | null>(null)

  const busy = shareState === 'preparing' || shareState === 'sharing' || saveState === 'loading'

  // Invalidar caché si los datos cambian mientras esperamos el segundo tap
  useEffect(() => {
    if (!cachedFile.current) return
    cachedFile.current = null
    if (shareState === 'ready') setShareState('idle')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preventivo.updatedAt])

  // Auto-cancelar estado 'ready' si el usuario no toca en 12 s
  useEffect(() => {
    if (shareState !== 'ready') return
    const t = setTimeout(() => { setShareState('idle'); cachedFile.current = null }, 12_000)
    return () => clearTimeout(t)
  }, [shareState])

  function showShareError(msg: string) {
    setShareMsg(msg); setShareState('error'); cachedFile.current = null
    setTimeout(() => { setShareState('idle'); setShareMsg('') }, 4000)
  }

  // ── Botón "Compartir" — flujo en 2 pasos para respetar el gesto de usuario ──
  //
  // Por qué 2 pasos:
  //   Chrome Android requiere que navigator.share() se llame dentro de ~5 s
  //   del tap del usuario (transient activation). buildZip() hace lecturas de
  //   IndexedDB + compresión y puede tardar más. Si llamamos share() después
  //   del await, Chrome lanza NotAllowedError.
  //
  //   Solución: Paso 1 = construir el ZIP (async, sin share). Cuando está listo
  //   el botón cambia a "Toca para enviar". Paso 2 = el nuevo tap llama share()
  //   inmediatamente, con el gesto fresco.
  async function handleShare() {
    if (!window.isSecureContext) {
      showShareError('⚠️ Necesita HTTPS — abre desde GitHub Pages')
      return
    }
    if (!('share' in navigator)) {
      showShareError('⚠️ Abre en Chrome o Safari para compartir')
      return
    }

    // ── Paso 2: ZIP ya preparado — llamar share() con gesto fresco ──────────
    if (cachedFile.current) {
      if (navigator.canShare && !navigator.canShare({ files: [cachedFile.current] })) {
        showShareError('⚠️ Este navegador no comparte archivos — usa "Guardar"')
        return
      }
      setShareState('sharing')
      try {
        await navigator.share({
          files: [cachedFile.current],
          title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
          text: [preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna].filter(Boolean).join(' — '),
        })
        setShareState('done'); cachedFile.current = null
        setTimeout(() => setShareState('idle'), 2500)
      } catch (err) {
        const name = (err as Error).name
        console.warn('[TelecomCatalog] Share error:', name, err)
        if (name === 'AbortError') { setShareState('idle'); cachedFile.current = null; return }
        if (name === 'NotAllowedError') showShareError('⚠️ Permiso denegado — intenta de nuevo')
        else if (name === 'TypeError')  showShareError('⚠️ Archivo no aceptado — usa "Guardar"')
        else                            showShareError(`⚠️ Error (${name}) — usa "Guardar"`)
      }
      return
    }

    // ── Paso 1: Construir ZIP (puede tardar, se permite el async aquí) ───────
    setShareState('preparing')
    try {
      const { blob, fileName } = await buildZip(preventivo)
      const file = new File([blob], fileName, { type: 'application/zip' })
      // Verificar soporte antes de pedir el segundo tap
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        showShareError('⚠️ Este navegador no comparte archivos — usa "Guardar"')
        return
      }
      cachedFile.current = file
      setShareState('ready') // ← pide segundo tap con gesto fresco
    } catch (err) {
      console.error('[TelecomCatalog] buildZip error:', err)
      showShareError('⚠️ Error al preparar el ZIP — intenta de nuevo')
    }
  }

  // ── Botón "Guardar" (descarga directa — escritorio / fallback) ────────────
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

  // ── Estilos y etiquetas del botón según estado ────────────────────────────
  const shareLabel =
    shareState === 'preparing' ? '⏳ Preparando…'      :
    shareState === 'ready'     ? '📲 Toca para enviar' :
    shareState === 'sharing'   ? '📤 Enviando…'        :
    shareState === 'done'      ? '✅ Compartido'        :
    shareState === 'error'     ? shareMsg               :
    '📤 Compartir ZIP'

  const shareClass =
    shareState === 'done'  ? 'bg-green-700 text-white'          :
    shareState === 'ready' ? 'bg-emerald-400 text-slate-900 animate-pulse' :
    shareState === 'error' ? 'bg-amber-700/80 text-amber-100'   :
    'bg-emerald-700 hover:bg-emerald-600 text-white'

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">

      {/* Botón principal — Compartir */}
      <button type="button" onClick={handleShare} disabled={busy}
        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${shareClass}`}>
        {shareLabel}
      </button>

      {/* Botón secundario — Guardar archivo */}
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
