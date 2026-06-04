/**
 * Cliente que habla con el proxy-server.
 * La Service Account reside ÚNICAMENTE en el servidor.
 */

const PROXY_BASE = import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001'

export interface DriveUploadResult {
  fileId: string
  folder: string
}

/**
 * Sube un archivo al Drive corporativo.
 * El proxy resuelve automáticamente la ruta:
 *   Root / Preventivos / {cuadrante_comuna} / {fileName}
 * y actualiza el metadata JSON del cuadrante en la misma carpeta.
 */
export async function uploadFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  preventivoId: string,
): Promise<DriveUploadResult> {
  const form = new FormData()
  form.append('file', blob, fileName)
  form.append('preventivoId', preventivoId)
  form.append('mimeType', mimeType)

  const res = await fetch(`${PROXY_BASE}/api/drive/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Drive upload failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<DriveUploadResult>
}

/** Crea o busca una carpeta en Drive (idempotente) */
export async function ensureFolder(
  name: string,
  parentId?: string,
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${PROXY_BASE}/api/drive/folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  })
  if (!res.ok) throw new Error(`ensureFolder failed (${res.status})`)
  return res.json() as Promise<{ id: string; name: string }>
}

/** Devuelve el ID de la carpeta raíz del módulo */
export async function getRootFolder(moduleId: string): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/api/drive/root/${moduleId}`)
  if (!res.ok) throw new Error(`getRootFolder failed (${res.status})`)
  const data = (await res.json()) as { folderId: string }
  return data.folderId
}
