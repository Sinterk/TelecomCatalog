export type FotoKey = 'fotoLevantamiento' | 'fotoAntes' | 'fotoDespues'

export interface FotoEntry {
  /** Blob URL local (se restaura desde IDB al montar, no se persiste) */
  previewUrl: string
  /** Nombre de archivo en el ZIP */
  fileName: string
  /** Clave en IndexedDB para persistir el blob entre sesiones */
  blobId?: string
  capturedAt: string
  annotated: boolean
}

export interface CuadranteInfo {
  /** Llena el TÉCNICO */
  cuadrante: string
  comuna: string
  fotoPlano?: FotoEntry  // foto del plano/mapa de trabajo

  /** Llena el JP al revisar */
  fecha: string
  semana: string
  nombreCuadrante: string
  direccion: string
  zona: string
}

export interface Punto {
  id: string
  nombre: string
  descripcion: string
  direccion: string
  correccion: string
  fotoLevantamiento?: FotoEntry
  fotoAntes?: FotoEntry
  fotoDespues?: FotoEntry
}

export interface Preventivo {
  id: string
  cuadrante: CuadranteInfo
  puntos: Punto[]
  createdAt: number
  updatedAt: number
}
