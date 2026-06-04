/**
 * Sincroniza preventivos con el proxy-server.
 * El proxy almacena la lista centralizada (cuadrantes de oficina disponibles para terreno).
 * Trabaja en modo best-effort: si no hay red, se opera con datos locales.
 */
import type { Preventivo } from '@/modules/preventivos/types'

const BASE = import.meta.env.VITE_PROXY_URL ?? 'http://localhost:3001'

export async function fetchAllPreventivos(): Promise<Preventivo[]> {
  const res = await fetch(`${BASE}/api/preventivos`)
  if (!res.ok) throw new Error(`fetch failed ${res.status}`)
  return res.json() as Promise<Preventivo[]>
}

export async function pushPreventivo(p: Preventivo): Promise<void> {
  const res = await fetch(`${BASE}/api/preventivos/${p.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    // No enviamos blobs — sólo metadatos (sin previewUrl ni fileBlob)
    body: JSON.stringify(stripBlobs(p)),
  })
  if (!res.ok) throw new Error(`push failed ${res.status}`)
}

export async function createPreventivo(p: Preventivo): Promise<void> {
  const res = await fetch(`${BASE}/api/preventivos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stripBlobs(p)),
  })
  if (!res.ok) throw new Error(`create failed ${res.status}`)
}

/** Elimina los datos binarios antes de enviar al proxy */
function stripBlobs(p: Preventivo): Preventivo {
  return {
    ...p,
    puntos: p.puntos.map((pt) => ({
      ...pt,
      fotoLevantamiento: pt.fotoLevantamiento
        ? { ...pt.fotoLevantamiento, previewUrl: '' }
        : undefined,
      fotoAntes: pt.fotoAntes
        ? { ...pt.fotoAntes, previewUrl: '' }
        : undefined,
      fotoDespues: pt.fotoDespues
        ? { ...pt.fotoDespues, previewUrl: '' }
        : undefined,
    })),
  }
}
