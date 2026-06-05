/**
 * Comprime una imagen a JPEG con máximo maxPx en el lado mayor.
 * Reduce fotos de cámara (~5MB) a ~300-400KB — caben holgadas en WhatsApp.
 */
export async function compressImage(
  file: File | Blob,
  maxPx = 1600,
  quality = 0.82,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('compressImage: toBlob failed'))),
      'image/jpeg',
      quality,
    )
  })
}
