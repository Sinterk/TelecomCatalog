/**
 * FASE 1 — Anotador pasivo.
 * El técnico ya tiene la fecha/hora grabada por la app de cámara en el EXIF.
 * Este módulo extrae ese timestamp del EXIF para guardarlo en metadatos,
 * pero NO modifica los píxeles de la imagen.
 */
import type { IAnnotator, AnnotationResult } from './types'

function parseExifDate(raw: string): string | null {
  // Formato EXIF: "YYYY:MM:DD HH:MM:SS"
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`).toISOString()
}

async function readExifDate(file: File): Promise<string | null> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer()
    const view = new DataView(buffer)
    // Buscar marker APP1 (0xFFE1) que contiene EXIF
    let offset = 2
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset)
      const length = view.getUint16(offset + 2)
      if (marker === 0xffe1) {
        const exifHeader = new Uint8Array(buffer, offset + 4, 6)
        const isExif = String.fromCharCode(...exifHeader.slice(0, 4)) === 'Exif'
        if (isExif) {
          // Parseo básico para DateTimeOriginal (tag 0x9003)
          const exifStart = offset + 10
          const littleEndian = view.getUint16(exifStart) === 0x4949
          const ifdOffset = view.getUint32(exifStart + 4, littleEndian)
          const ifdEntries = view.getUint16(exifStart + ifdOffset, littleEndian)
          for (let i = 0; i < ifdEntries; i++) {
            const entryOffset = exifStart + ifdOffset + 2 + i * 12
            const tag = view.getUint16(entryOffset, littleEndian)
            if (tag === 0x9003 || tag === 0x0132) {
              const valOffset = view.getUint32(entryOffset + 8, littleEndian)
              const raw = new Uint8Array(buffer, exifStart + valOffset, 19)
              const str = String.fromCharCode(...raw).replace(/\0/g, '')
              return parseExifDate(str)
            }
          }
        }
      }
      offset += 2 + length
    }
  } catch {
    // Si el parseo falla, se usa Date.now() como fallback
  }
  return null
}

export class Phase1Annotator implements IAnnotator {
  async process(file: File): Promise<AnnotationResult> {
    const exifDate = file.type === 'image/jpeg' ? await readExifDate(file) : null
    return {
      blob: file, // Sin modificación
      metadata: {
        capturedAt: exifDate ?? new Date().toISOString(),
        annotated: false,
      },
    }
  }
}
