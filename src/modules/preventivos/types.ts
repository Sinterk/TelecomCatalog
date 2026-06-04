export interface CuadranteInfo {
  // Obligatorios
  comuna: string
  cuadrante: string
  // Opcionales
  fecha: string
  semana: string
  nombreCuadrante: string
  direccion: string
  zona: string
}

export type FotoKey = 'fotoLevantamiento' | 'fotoAntes' | 'fotoDespues'

export interface FotoEntry {
  /** Data URL para preview local */
  previewUrl: string
  /** Nombre de archivo que se usará en Drive */
  fileName: string
  /** ID en la cola de upload offline */
  queueId?: string
  capturedAt: string
  annotated: boolean
}

export interface Punto {
  id: string
  nombre: string        // obligatorio — identificador visible, ej. "P1", "Poste Norte"
  descripcion: string   // obligatorio
  direccion: string     // obligatorio
  correccion: string    // opcional — nota de corrección del técnico
  fotoLevantamiento?: FotoEntry
  fotoAntes?: FotoEntry
  fotoDespues?: FotoEntry
}

export type PreventivoDraftStatus = 'draft' | 'syncing' | 'synced' | 'error'

export interface Preventivo {
  id: string
  cuadrante: CuadranteInfo
  puntos: Punto[]
  status: PreventivoDraftStatus
  createdAt: number
  updatedAt: number
}
