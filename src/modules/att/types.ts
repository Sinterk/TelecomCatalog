export type AttFotoKey = 'cabecera' | 'tendidoExterior' | 'tendidoInterior' | 'medicion'

export interface FotoEntry {
  previewUrl: string
  fileName: string
  blobId?: string
  capturedAt: string
  annotated: boolean
}

export interface AttRecord {
  id: string
  ott: string
  direccion: string
  fechaInicio: string
  descripcion: string
  fotos: Partial<Record<AttFotoKey, FotoEntry>>
  fotosExtra: FotoEntry[]
  createdAt: number
  updatedAt: number
}
