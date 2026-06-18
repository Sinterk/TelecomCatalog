import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/core/utils/nanoid'
import type { Preventivo, CuadranteInfo, Punto, FotoKey, FotoEntry } from './types'

interface PreventivoState {
  records: Record<string, Preventivo>

  upsert: (p: Preventivo) => void
  createNew: () => string
  remove: (id: string) => void
  updateCuadrante: (id: string, data: Partial<CuadranteInfo>) => void
  addPunto: (id: string) => string
  removePunto: (id: string, puntoId: string) => void
  updatePunto: (id: string, puntoId: string, data: Partial<Omit<Punto, 'id'>>) => void
  movePunto: (id: string, from: number, to: number) => void
  setFoto: (id: string, puntoId: string, key: FotoKey, entry: FotoEntry) => void
  removeFoto: (id: string, puntoId: string, key: FotoKey) => void
}

const emptyC = (): CuadranteInfo => ({
  cuadrante: '', comuna: '', fecha: '', semana: '', semestre: '',
  nombreCuadrante: '', direccion: '', zona: '', responsable: '',
})

export const usePreventivoStore = create<PreventivoState>()(
  persist(
    (set) => ({
      records: {},

      upsert: (p) => set((s) => ({ records: { ...s.records, [p.id]: p } })),

      createNew: () => {
        const id = nanoid()
        const now = Date.now()
        set((s) => ({
          records: {
            ...s.records,
            [id]: { id, cuadrante: emptyC(), puntos: [], createdAt: now, updatedAt: now },
          },
        }))
        return id
      },

      remove: (id) => set((s) => {
        const next = { ...s.records }
        delete next[id]
        return { records: next }
      }),

      updateCuadrante: (id, data) => set((s) => {
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
                puntos: [...rec.puntos, { id: puntoId, nombre: '', descripcion: '', direccion: '', correccion: '', hallazgo: '', resuelto: false }],
                updatedAt: Date.now(),
              },
            },
          }
        })
        return puntoId
      },

      removePunto: (id, puntoId) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        return {
          records: {
            ...s.records,
            [id]: { ...rec, puntos: rec.puntos.filter((p) => p.id !== puntoId), updatedAt: Date.now() },
          },
        }
      }),

      movePunto: (id, from, to) => set((s) => {
        const rec = s.records[id]
        if (!rec) return s
        const puntos = [...rec.puntos]
        const [removed] = puntos.splice(from, 1)
        puntos.splice(to, 0, removed)
        return { records: { ...s.records, [id]: { ...rec, puntos, updatedAt: Date.now() } } }
      }),

      updatePunto: (id, puntoId, data) => set((s) => {
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

      setFoto: (id, puntoId, key, entry) => set((s) => {
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

      removeFoto: (id, puntoId, key) => set((s) => {
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
    }),
    {
      name: 'preventivos-store-v2',
      partialize: (s) => ({
        records: Object.fromEntries(
          Object.entries(s.records).map(([k, v]) => [
            k,
            {
              ...v,
              cuadrante: {
                ...v.cuadrante,
                fotoPlano: v.cuadrante.fotoPlano
                  ? { ...v.cuadrante.fotoPlano, previewUrl: '' }
                  : undefined,
              },
              puntos: v.puntos.map((p) => ({
                ...p,
                fotoLevantamiento: p.fotoLevantamiento ? { ...p.fotoLevantamiento, previewUrl: '' } : undefined,
                fotoAntes: p.fotoAntes ? { ...p.fotoAntes, previewUrl: '' } : undefined,
                fotoDespues: p.fotoDespues ? { ...p.fotoDespues, previewUrl: '' } : undefined,
              })),
            },
          ]),
        ),
      }),
    },
  ),
)
