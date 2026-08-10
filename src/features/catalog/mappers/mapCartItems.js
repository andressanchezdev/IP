import { resolveAssetUrl } from './resolveAssetUrl'
import { parseImageArray, parseStock } from './parseUbicacionStock'

const PLACEHOLDER_IMAGE_HINTS = [
  'blanco.png',
  'imagen_base_productos',
  'modelos/blanco',
]

function isPlaceholderImage(path) {
  const normalized = String(path || '').toLowerCase()
  return PLACEHOLDER_IMAGE_HINTS.some((hint) => normalized.includes(hint))
}

function pickProductImageUrl(imagenProducto) {
  const images = parseImageArray(imagenProducto)
  if (images.length === 0) {
    return ''
  }

  const preferred = images.find((path) => !isPlaceholderImage(path)) ?? images[0]
  return resolveAssetUrl(preferred)
}

/** Imagen de producto en carts: `imagen_producto` (nuevo) o `imagenArray` (actual). */
function pickCartProductImageField(entry) {
  return (
    entry?.imagen_producto
    ?? entry?.Imagen_producto
    ?? entry?.imagenArray
    ?? entry?.imagen_array
    ?? null
  )
}

function text(value) {
  return String(value ?? '').trim()
}

/**
 * Mapea un ítem de GET /api/v1/inventory/carts → modelo de carrito-card.
 * Solo usa campos de la respuesta API (sin merge/localStorage/catálogo).
 */
export function mapApiCartItem(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const productId = text(entry.id_producto)
  if (!productId) {
    return null
  }

  const unitPrice = Number(entry.precio_unitario)
  const price = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0
  const brand = text(entry.marca)
  const brandLogoUrl = resolveAssetUrl(entry.imagen)
  const imageUrl = pickProductImageUrl(pickCartProductImageField(entry))
  const stock = entry.stock != null ? parseStock(entry.stock) : 0

  return {
    id: productId,
    price,
    precio: price,
    description: text(entry.descripcion),
    category: text(entry.categoria),
    brand,
    model: text(entry.modelo),
    reference: text(entry.codigo) || productId,
    stock,
    searching: text(entry.searching),
    imageUrl,
    brandLogo: brandLogoUrl,
    brandLogoUrl,
    quantity: Math.max(1, Number(entry.cantidad) || 1),
    cartId: entry.id_carrito ?? null,
    userId: entry.id_usuario ?? null,
    discount: Number(entry.descuento) || 0,
    aplicacion: text(entry.aplicacion),
    cartDate: entry.fecha ?? null,
  }
}

export function mapApiCartItems(carritos = []) {
  if (!Array.isArray(carritos) || carritos.length === 0) {
    return []
  }

  return carritos.map(mapApiCartItem).filter(Boolean)
}
