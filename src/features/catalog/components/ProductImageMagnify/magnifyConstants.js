/** Zoom fijo. El puntero solo define el destino; el pan viaja a velocidad constante. */
export const HOVER_ZOOM = 2
export const ORIGIN_TOP_LEFT = '0 0'
export const REST_TRANSFORM = 'translate(0px, 0px) scale(1)'
/** px/s: deslizamiento fluido, no seguimiento 1:1 del cursor. */
export const PAN_SPEED_PX_PER_S = 2420

export function formatMagnifyTransform(x, y, scale) {
  return `translate(${x}px, ${y}px) scale(${scale})`
}

/**
 * Destino del pan según la posición del puntero en el contenedor.
 * No centra el píxel bajo el cursor: mapea (0–1) al overflow del scale.
 * Esquina superior izquierda → (0, 0). Inferior derecha → overflow completo.
 */
export function panTargetFromPointer(x, y, width, height, scale = HOVER_ZOOM) {
  if (!width || !height) {
    return { x: 0, y: 0 }
  }

  const nx = Math.min(1, Math.max(0, x / width))
  const ny = Math.min(1, Math.max(0, y / height))
  const overflowX = width * (scale - 0.8)
  const overflowY = height * (scale - 0.8)

  return {
    x: -nx * overflowX,
    y: -ny * overflowY,
  }
}

export function stepPanToward(current, target, dtSeconds, speed = PAN_SPEED_PX_PER_S) {
  const dx = target.x - current.x
  const dy = target.y - current.y
  const distance = Math.hypot(dx, dy)
  const step = speed * Math.max(0, dtSeconds)

  if (distance <= step || distance === 0) {
    return { x: target.x, y: target.y, arrived: true }
  }

  const ratio = step / distance
  return {
    x: current.x + dx * ratio,
    y: current.y + dy * ratio,
    arrived: false,
  }
}
