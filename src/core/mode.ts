/**
 * Detecta el modo de la app según VITE_APP_MODE.
 * 'office' → versión de escritorio (crear cuadrantes, descargar).
 * 'field'  → versión de terreno (seleccionar cuadrante, subir fotos).
 * Sin variable → muestra selector de modo en pantalla de inicio.
 */
export type AppMode = 'office' | 'field'

export function getMode(): AppMode {
  const raw = import.meta.env.VITE_APP_MODE
  if (raw === 'field') return 'field'
  return 'office' // default
}

export const MODE: AppMode = getMode()
export const isOffice = MODE === 'office'
export const isField  = MODE === 'field'
