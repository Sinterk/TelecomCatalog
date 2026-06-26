import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '@/core/utils/nanoid'
import type {
  AttRecord, FotoEntry, FotoCategoria,
  TramoCable, Hito, InfraItem, Infraestructura,
} from './types'

function emptyInfraItem(): InfraItem {
  return { usa: false, cantidad: '', compania: '' }
}

function emptyInfra(): Infraestructura {
  return {
    postesElectricos:  emptyInfraItem(),
    postesOtraTeleco:  emptyInfraItem(),
    ductosOtraTeleco:  emptyInfraItem(),
    fibraOtraCompania: { usa: false },
    postesEntel:       { usa: false },
  }
}

export function emptyAttRecord(id: string, now: number): AttRecord {
  return {
    id, createdAt: now, updatedAt: now,
    tipoProyecto: '',
    ott: '', nombreProyecto: '', iniciativa: '',
    ingenieroProyecto: '', jefeProyecto: '',
    comuna: '', region: 'Metropolitana', contratista: 'SINTERK',
    coordsInicio: { lat: '', lng: '' },
    coordsTermino: { lat: '', lng: '' },
    tramos: [{ id: nanoid(), tipoCable: '', metraje: '', desde: '', hasta: '' }],
    descripcionCabecera: '',
    instalaCMIC: false, instalaMufas: false,
    tieneIngresoRed: false, tieneReparacionDucto: false,
    ingresoRed: { nodo: '', rack: '', odf: '', fo: '' },
    hitos: [],
    infraestructura: emptyInfra(),
    fotos: {},
  }
}

interface AttState {
  records: Record<string, AttRecord>

  createNew: () => string
  remove: (id: string) => void
  update: (id: string, data: Partial<AttRecord>) => void

  addTramo: (id: string) => void
  removeTramo: (id: string, tramoId: string) => void
  updateTramo: (id: string, tramoId: string, data: Partial<Omit<TramoCable, 'id'>>) => void

  addHito: (id: string) => void
  removeHito: (id: string, hitoId: string) => void
  updateHito: (id: string, hitoId: string, data: Partial<Omit<Hito, 'id'>>) => void

  setFotoAerea: (id: string, entry: FotoEntry) => void
  removeFotoAerea: (id: string) => void
  setFotoAereaPreview: (id: string, previewUrl: string) => void

  addFoto: (id: string, cat: FotoCategoria, entry: FotoEntry) => void
  removeFoto: (id: string, cat: FotoCategoria, index: number) => void
  setFotoPreview: (id: string, cat: FotoCategoria, index: number, previewUrl: string) => void
}

function touch(rec: AttRecord, extra?: Partial<AttRecord>): AttRecord {
  return { ...rec, ...extra, updatedAt: Date.now() }
}

export const useAttStore = create<AttState>()(
  persist(
    (set) => ({
      records: {},

      createNew() {
        const id = nanoid()
        const now = Date.now()
        set((s) => ({ records: { ...s.records, [id]: emptyAttRecord(id, now) } }))
        return id
      },

      remove(id) {
        set((s) => {
          const next = { ...s.records }
          delete next[id]
          return { records: next }
        })
      },

      update(id, data) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: touch(rec, data) } }
        })
      },

      addTramo(id) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const t: TramoCable = { id: nanoid(), tipoCable: '', metraje: '', desde: '', hasta: '' }
          return { records: { ...s.records, [id]: touch(rec, { tramos: [...rec.tramos, t] }) } }
        })
      },

      removeTramo(id, tramoId) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: touch(rec, { tramos: rec.tramos.filter((t) => t.id !== tramoId) }) } }
        })
      },

      updateTramo(id, tramoId, data) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const tramos = rec.tramos.map((t) => t.id === tramoId ? { ...t, ...data } : t)
          return { records: { ...s.records, [id]: touch(rec, { tramos }) } }
        })
      },

      addHito(id) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const h: Hito = { id: nanoid(), fecha: '', descripcion: '' }
          return { records: { ...s.records, [id]: touch(rec, { hitos: [...rec.hitos, h] }) } }
        })
      },

      removeHito(id, hitoId) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: touch(rec, { hitos: rec.hitos.filter((h) => h.id !== hitoId) }) } }
        })
      },

      updateHito(id, hitoId, data) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const hitos = rec.hitos.map((h) => h.id === hitoId ? { ...h, ...data } : h)
          return { records: { ...s.records, [id]: touch(rec, { hitos }) } }
        })
      },

      setFotoAerea(id, entry) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: touch(rec, { fotoAerea: entry }) } }
        })
      },

      removeFotoAerea(id) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          return { records: { ...s.records, [id]: touch(rec, { fotoAerea: undefined }) } }
        })
      },

      setFotoAereaPreview(id, previewUrl) {
        set((s) => {
          const rec = s.records[id]
          if (!rec?.fotoAerea) return s
          return { records: { ...s.records, [id]: { ...rec, fotoAerea: { ...rec.fotoAerea, previewUrl } } } }
        })
      },

      addFoto(id, cat, entry) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const prev = rec.fotos[cat] ?? []
          return { records: { ...s.records, [id]: touch(rec, { fotos: { ...rec.fotos, [cat]: [...prev, entry] } }) } }
        })
      },

      removeFoto(id, cat, index) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const prev = rec.fotos[cat] ?? []
          return { records: { ...s.records, [id]: touch(rec, { fotos: { ...rec.fotos, [cat]: prev.filter((_, i) => i !== index) } }) } }
        })
      },

      setFotoPreview(id, cat, index, previewUrl) {
        set((s) => {
          const rec = s.records[id]
          if (!rec) return s
          const prev = rec.fotos[cat] ?? []
          const next = prev.map((f, i) => i === index ? { ...f, previewUrl } : f)
          return { records: { ...s.records, [id]: { ...rec, fotos: { ...rec.fotos, [cat]: next } } } }
        })
      },
    }),
    {
      name: 'att-store-v2',
      partialize: (s) => ({
        records: Object.fromEntries(
          Object.entries(s.records).map(([id, rec]) => [id, {
            ...rec,
            fotoAerea: rec.fotoAerea ? { ...rec.fotoAerea, previewUrl: '' } : undefined,
            fotos: Object.fromEntries(
              Object.entries(rec.fotos).map(([cat, arr]) => [
                cat,
                (arr ?? []).map((f) => ({ ...f, previewUrl: '' })),
              ])
            ),
          }])
        ),
      }),
    }
  )
)
