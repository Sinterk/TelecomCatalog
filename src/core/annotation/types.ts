export interface AnnotationMetadata {
  /** ISO 8601 — extraído de EXIF (fase 1) o Date.now() como fallback */
  capturedAt: string
  /** Disponible sólo en fase 2 cuando el técnico otorga permiso de geolocalización */
  gps?: { lat: number; lng: number; accuracy?: number }
  /** true si la imagen fue modificada por Canvas (fase 2 activa) */
  annotated: boolean
}

export interface AnnotationResult {
  /** Blob listo para subir — igual al original en fase 1, con overlay en fase 2 */
  blob: Blob
  metadata: AnnotationMetadata
}

export interface IAnnotator {
  process(file: File): Promise<AnnotationResult>
}
