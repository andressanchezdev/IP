/**
 * Nombre accesible de un control: aria-label (lector de pantalla) + title (tooltip).
 */
export function namedControl(label) {
  const name = String(label ?? '').trim()
  if (!name) {
    return {}
  }
  return {
    'aria-label': name,
    title: name,
  }
}

/**
 * Nombre accesible de una imagen: alt + title.
 */
export function namedImage(label) {
  const name = String(label ?? '').trim() || 'Imagen'
  return {
    alt: name,
    title: name,
  }
}
