/**
 * Factory — intercambia la implementación según variable de entorno.
 * Para activar fase 2: VITE_ANNOTATION_PHASE=2 en .env.local
 * No se requiere ningún cambio en el resto de la app.
 */
import type { IAnnotator } from './types'

let _instance: IAnnotator | null = null

export async function getAnnotator(): Promise<IAnnotator> {
  if (_instance) return _instance

  if (import.meta.env.VITE_ANNOTATION_PHASE === '2') {
    const { Phase2Annotator } = await import('./phase2Annotator')
    _instance = new Phase2Annotator()
  } else {
    const { Phase1Annotator } = await import('./phase1Annotator')
    _instance = new Phase1Annotator()
  }

  return _instance
}

export type { IAnnotator, AnnotationResult, AnnotationMetadata } from './types'
