/** Zoom de contenedor (hover) + lightbox. */

export const HOVER_ZOOM = 1.75
export const ORIGIN_CENTER = '50% 50%'

/**
 * Origen continuo según el puntero (0–100%), sin saltos de esquina a esquina.
 */
export function originFromPointer(x, y, width, height) {
  if (!width || !height) {
    return ORIGIN_CENTER
  }
  const px = Math.min(100, Math.max(0, (x / width) * 100))
  const py = Math.min(100, Math.max(0, (y / height) * 100))
  return `${px.toFixed(2)}% ${py.toFixed(2)}%`
}
