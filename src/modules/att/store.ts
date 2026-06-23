import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/core/utils/nanoid'
import type { AttRecord, AttFotoKey, FotoEntry } from './types'

interface AttState {
  records: Record<string, AttRecord>
  createNew: () => string
  remove: (id: string) => void
  update: (id: string, data: Partial<Pick<AttRecord, 'ott' | 'direccion' | 'fechaInicio' | 'descripcion'>>) => void
  setFoto: (id: string, key: AttFotoKey, entry: FotoEntry) => void
  removeFoto: (id: string, key: AttFotoKey) => void
  addFotoExtra: (id: string, entry: FotoEntry) => void
  removeFotoExtra: (id: string, index: number) => void
  setFotoExtraPreview: (id: string, index: number, previewUrl: string) => void
}

export const useAttStore = create<AttState>()(
  persist(
    (set) => ({
      records: {},

      createNew: () => {
        const id = nanoid()
        const now = Date.now()
        set((s) => ({
          records: {
            ...s.records,
            [id]: { id, ott: '', direccion: '', fechaInicio: '', descripcion: '', fotos: {}, fotosExtra: [], createdAt: now, updatedAt: now },
          },
        }))
        return id
      },

      remove: (id) => set((s) => {
        const next = { ...s.records }
        delete next[id]
        return { records: next }
      }),

      update: (id, data) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        return { records: { ...s.records, [id]: { ...rec, ...data, updatedAt: Date.now() } } }
      }),

      setFoto: (id, key, entry) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        return { records: { ...s.records, [id]: { ...rec, fotos: { ...rec.fotos, [key]: entry }, updatedAt: Date.now() } } }
      }),

      removeFoto: (id, key) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        const fotos = { ...rec.fotos }
        delete fotos[key]
        return { records: { ...s.records, [id]: { ...rec, fotos, updatedAt: Date.now() } } }
      }),

      addFotoExtra: (id, entry) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        return { records: { ...s.records, [id]: { ...rec, fotosExtra: [...rec.fotosExtra, entry], updatedAt: Date.now() } } }
      }),

      removeFotoExtra: (id, index) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        return { records: { ...s.records, [id]: { ...rec, fotosExtra: rec.fotosExtra.filter((_, i) => i !== index), updatedAt: Date.now() } } }
      }),

      // No toca updatedAt — solo restaura blob URLs desde IDB al montar
      setFotoExtraPreview: (id, index, previewUrl) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        const fotosExtra = rec.fotosExtra.map((f, i) => i === index ? { ...f, previewUrl } : f)
        return { records: { ...s.records, [id]: { ...rec, fotosExtra } } }
      }),
    }),
    {
      name: 'att-store-v1',
      partialize: (s) => ({
        records: Object.fromEntries(
          Object.entries(s.records).map(([k, v]) => [
            k,
            {
              ...v,
              fotos: Object.fromEntries(
                Object.entries(v.fotos).map(([fk, fe]) => [fk, { ...fe, previewUrl: '' }])
              ),
              fotosExtra: v.fotosExtra.map((fe) => ({ ...fe, previewUrl: '' })),
            },
          ])
        ),
      }),
    }
  )
)
