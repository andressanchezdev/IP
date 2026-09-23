import { resolveAssetUrl } from './resolveAssetUrl'

/**
 * Thumb de card (~400–600 px WebP) a partir de la URL full.
 * Convención de origen: `foto.jpg` → `foto_card.webp` (mismo directorio en GCS).
 * Si el archivo aún no existe, ProductCard hace fallback a la full.
 */
export function deriveCardThumbUrl(resolvedUrl) {
  const url = String(resolvedUrl || '').trim()
  if (!url) return ''

  if (/_card\.webp(?:$|\?)/i.test(url) || /\/thumbs\//i.test(url)) {
    return url
  }

  // path/file.ext?query → path/file_card.webp?query
  const matched = url.match(/^(.*?)(\.[a-z0-9]+)(\?.*)?$/i)
  if (!matched) return ''

  const [, base, , query = ''] = matched
  if (!base || /_card$/i.test(base)) {
    return `${base}.webp${query}`
  }
  return `${base}_card.webp${query}`
}

/** Campos API opcionales de thumb (si el backend ya los envía). */
export function pickApiCardThumbPath(product) {
  if (!product || typeof product !== 'object') return ''
  const candidates = [
    product.imagen_producto_thumb,
    product.imagen_producto_card,
    product.imagen_card,
    product.imagen_thumb,
    product.thumb,
    product.thumbnail,
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

/**
 * URL liviana para grid/card. Prioridad: campo API thumb → convención *_card.webp.
 */
export function resolveProductCardImageUrl(fullResolvedUrl, product) {
  const fromApi = resolveAssetUrl(pickApiCardThumbPath(product))
  if (fromApi) return fromApi
  return deriveCardThumbUrl(fullResolvedUrl)
}
