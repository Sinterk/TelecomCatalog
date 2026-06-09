import { useState } from 'react'
import JSZip from 'jszip'
import { getPhotoBlob } from '@/core/offline/photoStore'
import type { Preventivo, FotoKey } from '../types'

interface Props { preventivo: Preventivo }

const FOTO_KEYS: FotoKey[] = ['fotoLevantamiento', 'fotoAntes', 'fotoDespues']
const hasShareApi = typeof navigator !== 'undefined' && 'share' in navigator

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

// ── Componente ────────────────────────────────────────────────────────────────
export function ExportZipButton({ preventivo }: Props) {
  const [shareState, setShareState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [saveState,  setSaveState]  = useState<'idle' | 'loading' | 'done'>('idle')

  const [shareMsg, setShareMsg] = useState('')
  const busy = shareState === 'loading' || saveState === 'loading'

  function showShareError(msg: string) {
    setShareMsg(msg)
    setShareState('error')
    setTimeout(() => { setShareState('idle'); setShareMsg('') }, 4000)
  }

  // ── Botón "Compartir" (Web Share API — móvil) ─────────────────────────────
  async function handleShare() {
    // 1. ¿Contexto seguro? (HTTPS o localhost)
    if (!window.isSecureContext) {
      showShareError('⚠️ Abre la app con HTTPS')
      return
    }
    // 2. ¿El navegador tiene Share API?
    if (!('share' in navigator)) {
      showShareError('⚠️ Usa Chrome en el celular')
      return
    }
    setShareState('loading')
    try {
      const { blob, fileName } = await buildZip(preventivo)
      const file = new File([blob], fileName, { type: 'application/zip' })
      await navigator.share({
        files: [file],
        title: `TelecomCatalog — ${preventivo.cuadrante.cuadrante || 'Levantamiento'}`,
        text: [preventivo.cuadrante.cuadrante, preventivo.cuadrante.comuna].filter(Boolean).join(' — '),
      })
      setShareState('done')
      setTimeout(() => setShareState('idle'), 2500)
    } catch (err) {
      const name = (err as Error).name
      console.warn('Share error:', name, err)
      if (name === 'AbortError') { setShareState('idle'); return }
      // Contexto seguro pero el SO/navegador rechazó el archivo
      showShareError('⚠️ No disponible aquí, usa Guardar')
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

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">

      {/* Botón principal — Compartir (siempre visible; el handler gestiona cada caso) */}
      <button type="button" onClick={handleShare} disabled={busy}
        className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 ${
          shareState === 'done'  ? 'bg-green-700 text-white' :
          shareState === 'error' ? 'bg-amber-700/80 text-amber-100' :
          'bg-emerald-700 hover:bg-emerald-600 text-white'
        }`}>
        {shareState === 'loading' ? '⏳ Preparando…'
          : shareState === 'done'  ? '✅ Compartido'
          : shareState === 'error' ? shareMsg
          : '📤 Compartir ZIP'}
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
