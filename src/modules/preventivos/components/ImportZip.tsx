import { useRef, useState } from 'react'
import JSZip from 'jszip'
import { usePreventivoStore } from '../store'
import { savePhotoBlob } from '@/core/offline/photoStore'
import { nanoid } from '@/core/utils/nanoid'
import type { Preventivo, FotoEntry } from '../types'

interface Props {
  onImported: (id: string) => void
}

export function ImportZip({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const { upsert } = usePreventivoStore()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setState('loading')
    setErrorMsg('')

    try {
      const zip = await JSZip.loadAsync(file)
      const metaFile = zip.file('telecom_v1.json')
      if (!metaFile) throw new Error('ZIP inválido: falta telecom_v1.json')

      const meta = JSON.parse(await metaFile.async('string'))
      if (meta.version !== 1) throw new Error('Versión de ZIP no compatible')

      const lev = meta.levantamiento

      // Carga una foto del ZIP a IDB y devuelve FotoEntry
      async function loadFoto(
        fotaMeta: { fileName: string; capturedAt: string } | null | undefined,
      ): Promise<FotoEntry | undefined> {
        if (!fotaMeta?.fileName) return undefined
        const zipFile = zip.file(`fotos/${fotaMeta.fileName}`)
        if (!zipFile) return undefined
        const blob = await zipFile.async('blob')
        const blobId = nanoid()
        await savePhotoBlob({ id: blobId, blob, fileName: fotaMeta.fileName })
        return {
          previewUrl: URL.createObjectURL(blob),
          fileName: fotaMeta.fileName,
          blobId,
          capturedAt: fotaMeta.capturedAt || new Date().toISOString(),
          annotated: false,
        }
      }

      const now = Date.now()
      const preventivo: Preventivo = {
        id: lev.id || nanoid(),
        createdAt: lev.createdAt || now,
        updatedAt: now,
        cuadrante: {
          cuadrante:       lev.cuadrante.cuadrante       || '',
          comuna:          lev.cuadrante.comuna           || '',
          fecha:           lev.cuadrante.fecha            || '',
          semana:          lev.cuadrante.semana           || '',
          nombreCuadrante: lev.cuadrante.nombreCuadrante || '',
          direccion:       lev.cuadrante.direccion        || '',
          zona:            lev.cuadrante.zona             || '',
          fotoPlano:       await loadFoto(lev.cuadrante.fotoPlano),
        },
        puntos: await Promise.all(
          (lev.puntos || []).map(async (p: any) => ({
            id:          p.id          || nanoid(),
            nombre:      p.nombre      || '',
            descripcion: p.descripcion || '',
            direccion:   p.direccion   || '',
            correccion:  p.correccion  || '',
            fotoLevantamiento: await loadFoto(p.fotos?.levantamiento),
            fotoAntes:         await loadFoto(p.fotos?.antes),
            fotoDespues:       await loadFoto(p.fotos?.despues),
          })),
        ),
      }

      upsert(preventivo)
      onImported(preventivo.id)
    } catch (err) {
      console.error('[import]', err)
      setErrorMsg(err instanceof Error ? err.message : 'Error al importar el ZIP')
      setState('error')
    }

    if (e.target) e.target.value = ''
  }

  return (
    <div>
      <button type="button"
        onClick={() => fileRef.current?.click()}
        disabled={state === 'loading'}
        className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
        {state === 'loading' ? '⏳ Importando…' : '📥 Importar ZIP'}
      </button>
      {state === 'error' && (
        <p className="text-red-400 text-xs mt-1.5">❌ {errorMsg}</p>
      )}
      <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleFile} />
    </div>
  )
}
