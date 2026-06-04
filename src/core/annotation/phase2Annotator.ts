/**
 * FASE 2 — Anotador activo (inactivo hasta VITE_ANNOTATION_PHASE=2).
 * Solicita geolocalización, dibuja sobre la imagen via Canvas API:
 *   - Timestamp formateado en esquina inferior izquierda
 *   - Coordenadas GPS en esquina inferior derecha
 * El resto de la app no cambia — sólo se intercambia el annotator en el factory.
 */
import type { IAnnotator, AnnotationResult, AnnotationMetadata } from './types'
import { Phase1Annotator } from './phase1Annotator'

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
    }),
  )
}

function formatDatetime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-GT', { hour12: false })
}

async function drawOverlay(
  file: File,
  meta: AnnotationMetadata,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(bitmap, 0, 0)

  const fontSize = Math.max(20, Math.round(bitmap.width * 0.022))
  ctx.font = `bold ${fontSize}px monospace`
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 6
  const pad = fontSize * 0.6
  const lineHeight = fontSize * 1.4

  // Fondo semitransparente en barra inferior
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, bitmap.height - lineHeight * 2 - pad * 2, bitmap.width, lineHeight * 2 + pad * 2)

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'left'
  ctx.fillText(`📅 ${formatDatetime(meta.capturedAt)}`, pad, bitmap.height - lineHeight - pad)

  if (meta.gps) {
    const gpsStr = `📍 ${meta.gps.lat.toFixed(6)}, ${meta.gps.lng.toFixed(6)}`
    ctx.fillText(gpsStr, pad, bitmap.height - pad)
  }

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
}

export class Phase2Annotator implements IAnnotator {
  private phase1 = new Phase1Annotator()

  async process(file: File): Promise<AnnotationResult> {
    const { metadata } = await this.phase1.process(file)

    let gps: AnnotationMetadata['gps'] | undefined
    try {
      const pos = await getCurrentPosition()
      gps = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }
    } catch {
      // Geolocalización denegada o timeout — continúa sin GPS
    }

    const fullMeta: AnnotationMetadata = { ...metadata, gps, annotated: true }
    const blob = await drawOverlay(file, fullMeta)

    return { blob, metadata: fullMeta }
  }
}
