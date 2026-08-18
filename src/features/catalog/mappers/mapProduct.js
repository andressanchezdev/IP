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

/** API `precio` → número para ProductCard / carrito. */
function mapPrecio(product) {
  const numeric = Number(product?.precio)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

/** id de inventario: `id` | `id_producto` (cursor `last_id` y cards). */
export function getCatalogProductId(product) {
  const value = product?.id ?? product?.id_producto ?? product?.idProducto
  if (value == null || value === '') {
    return null
  }
  const text = String(value).trim()
  return text && text !== 'undefined' && text !== 'null' ? text : null
}

/**
 * API fields → ProductCard model
 * precio → price (y precio)
 * descripcion → description
 * categoria → category
 * marca → brand
 * modelo → model
 * codigo → reference
 * imagen → brandLogo / img_marca
 * imagen_producto → imageUrl / img_producto
 * stock → stock
 */
export function mapApiProduct(product) {
  const brand = String(product.marca ?? '').trim()
  const brandLogoUrl = resolveAssetUrl(product.imagen)
  const imageUrl = pickProductImageUrl(product.imagen_producto)
  const precio = mapPrecio(product)

  const id = getCatalogProductId(product)

  return {
    id: id ?? '',
    precio,
    price: precio,
    description: String(product.descripcion ?? '').trim(),
    category: String(product.categoria ?? '').trim(),
    brand,
    model: String(product.modelo ?? '').trim(),
    reference: String(product.codigo ?? '').trim(),
    stock: parseStock(product.stock),
    searching: String(product.searching ?? '').trim(),
    imageUrl,
    brandLogo: brandLogoUrl,
    brandLogoUrl,
  }
}

export function mapApiProducts(productos = []) {
  if (!Array.isArray(productos)) {
    return []
  }

  return productos.map(mapApiProduct).filter((product) => Boolean(product.id))
}
