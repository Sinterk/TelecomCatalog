import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/core/utils/nanoid'
import type { Preventivo, CuadranteInfo, Punto, FotoKey, FotoEntry } from './types'

interface PreventivoState {
  records: Record<string, Preventivo>
  activeId: string | null

  /** Reemplaza todos los records (usado al sincronizar con proxy) */
  mergeFromServer: (list: Preventivo[]) => void
  createNew: () => string
  upsert: (p: Preventivo) => void
  setActive: (id: string) => void
  updateCuadrante: (id: string, data: Partial<CuadranteInfo>) => void
  addPunto: (id: string) => string
  removePunto: (id: string, puntoId: string) => void
  updatePunto: (id: string, puntoId: string, data: Partial<Pick<Punto, 'nombre' | 'descripcion' | 'direccion' | 'correccion'>>) => void
  setFoto: (id: string, puntoId: string, key: FotoKey, entry: FotoEntry) => void
  removeFoto: (id: string, puntoId: string, key: FotoKey) => void
  setStatus: (id: string, status: Preventivo['status']) => void
  remove: (id: string) => void
}

const emptyCuadrante = (): CuadranteInfo => ({
  comuna: '',
  cuadrante: '',
  fecha: new Date().toISOString().slice(0, 10),
  semana: '',
  nombreCuadrante: '',
  direccion: '',
  zona: '',
})

export const usePreventivoStore = create<PreventivoState>()(
  persist(
    (set) => ({
      records: {},
      activeId: null,

      mergeFromServer: (list) =>
        set((s) => {
          const merged = { ...s.records }
          for (const p of list) {
            // Si ya existe localmente con más datos (puntos con fotos), conservar local
            const local = merged[p.id]
            if (!local || local.updatedAt <= p.updatedAt) {
              merged[p.id] = p
            }
          }
          return { records: merged }
        }),

      upsert: (p) =>
        set((s) => ({ records: { ...s.records, [p.id]: p } })),

      createNew: () => {
        const id = nanoid()
        set((s) => ({
          records: {
            ...s.records,
            [id]: {
              id,
              cuadrante: emptyCuadrante(),
              puntos: [],
              status: 'draft',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
          activeId: id,
        }))
        return id
      },

      setActive: (id) => set({ activeId: id }),

      updateCuadrante: (id, data) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: { ...rec, cuadrante: { ...rec.cuadrante, ...data }, updatedAt: Date.now() },
            },
          }
        }),

      addPunto: (id) => {
        const puntoId = nanoid()
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: {
                ...rec,
                puntos: [
                  ...rec.puntos,
                  { id: puntoId, nombre: '', descripcion: '', direccion: '', correccion: '' },
                ],
                updatedAt: Date.now(),
              },
            },
          }
        })
        return puntoId
      },

      removePunto: (id, puntoId) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: { ...rec, puntos: rec.puntos.filter((p) => p.id !== puntoId), updatedAt: Date.now() },
            },
          }
        }),

      updatePunto: (id, puntoId, data) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: {
                ...rec,
                puntos: rec.puntos.map((p) => (p.id === puntoId ? { ...p, ...data } : p)),
                updatedAt: Date.now(),
              },
            },
          }
        }),

      setFoto: (id, puntoId, key, entry) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: {
                ...rec,
                puntos: rec.puntos.map((p) => (p.id === puntoId ? { ...p, [key]: entry } : p)),
                updatedAt: Date.now(),
              },
            },
          }
        }),

      removeFoto: (id, puntoId, key) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return {
            records: {
              ...s.records,
              [id]: {
                ...rec,
                puntos: rec.puntos.map((p) => {
                  if (p.id !== puntoId) return p
                  const next = { ...p }
                  delete next[key]
                  return next
                }),
                updatedAt: Date.now(),
              },
            },
          }
        }),

      setStatus: (id, status) =>
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: { ...rec, status, updatedAt: Date.now() } } }
        }),

      remove: (id) =>
        set((s) => {
          const next = { ...s.records }
          delete next[id]
          return { records: next, activeId: s.activeId === id ? null : s.activeId }
        }),
    }),
    {
      name: 'preventivos-store',
      partialize: (s) => ({
        records: Object.fromEntries(
          Object.entries(s.records).map(([k, v]) => [
            k,
            {
              ...v,
              puntos: v.puntos.map((p) => ({
                ...p,
                fotoLevantamiento: p.fotoLevantamiento ? { ...p.fotoLevantamiento, previewUrl: '' } : undefined,
                fotoAntes: p.fotoAntes ? { ...p.fotoAntes, previewUrl: '' } : undefined,
                fotoDespues: p.fotoDespues ? { ...p.fotoDespues, previewUrl: '' } : undefined,
              })),
            },
          ]),
        ),
        activeId: s.activeId,
      }),
    },
  ),
)
