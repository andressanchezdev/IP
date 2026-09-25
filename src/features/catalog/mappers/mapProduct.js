import { resolveAssetUrl } from './resolveAssetUrl'
import { parseImageArray, stockTotal } from './parseUbicacionStock'
import { resolveProductCardImageUrl } from './productImageThumb'
import { pickProductFiscalFields } from '@/features/catalog/lib/productFiscalFields'

const PLACEHOLDER_IMAGE_HINTS = [
  'blanco.png',
  'imagen_base_productos',
  'modelos/blanco',
]

function isPlaceholderImage(path) {
  const normalized = String(path || '').toLowerCase()
  return PLACEHOLDER_IMAGE_HINTS.some((hint) => normalized.includes(hint))
}

function pickProductImageUrls(imagenProducto) {
  const images = parseImageArray(imagenProducto)
  if (images.length === 0) {
    return []
  }

  const resolved = images
    .filter((path) => !isPlaceholderImage(path))
    .map((path) => resolveAssetUrl(path))
    .filter(Boolean)

  if (resolved.length > 0) {
    return resolved
  }

  const fallback = resolveAssetUrl(images[0])
  return fallback ? [fallback] : []
}

/** API `precio` → número para ProductCard / carrito. */
function mapPrecio(product) {
  const numeric = Number(product?.precio)
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0
}

/** Descarta sentinels (vacío, 0, -1) que algunos listados mandan en `id`. */
export function isUsableProductId(value) {
  if (value == null || value === '') {
    return false
  }
  const text = String(value).trim()
  if (!text || text === 'undefined' || text === 'null' || text === '-1') {
    return false
  }
  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric <= 0) {
    return false
  }
  return true
}

/**
 * True si el candidato es en realidad el codigo/barcode (no el id de inventario).
 * id_producto ≠ codigo.
 */
export function isCodigoMistakenAsId(candidate, product) {
  if (candidate == null || candidate === '') {
    return false
  }
  const value = String(candidate).trim().toLowerCase()
  if (!value) {
    return false
  }
  const codes = [
    product?.codigo,
    product?.reference,
    product?.Codigo,
  ]
    .map((entry) => String(entry ?? '').trim().toLowerCase())
    .filter(Boolean)

  return codes.includes(value)
}

/**
 * id de inventario usable.
 * Preferencia: `id` (PK de /general) → `id_producto` → `idProducto`.
 * Nunca usa `codigo` / reference.
 */
export function getCatalogProductId(product) {
  const candidates = [
    product?.id,
    product?.id_producto,
    product?.idProducto,
  ]
  for (const value of candidates) {
    if (!isUsableProductId(value)) {
      continue
    }
    if (isCodigoMistakenAsId(value, product)) {
      continue
    }
    return String(value).trim()
  }
  return null
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
 * thumb card → imageCardUrl (*_card.webp o API thumb)
 * stock → stock
 * iva / exento / compra → campos fiscales (GET /general e inventario)
 */
export function mapApiProduct(product) {
  const brand = String(product.marca ?? '').trim()
  const brandLogoUrl = resolveAssetUrl(product.imagen)
  const imageUrls = pickProductImageUrls(product.imagen_producto)
  const imageUrl = imageUrls[0] ?? ''
  const imageCardUrl = resolveProductCardImageUrl(imageUrl, product)
  const precio = mapPrecio(product)
  const fiscal = pickProductFiscalFields(product)

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
    stock: stockTotal(product.stock),
    searching: String(product.searching ?? '').trim(),
    imageUrl,
    imageCardUrl,
    imageUrls,
    brandLogo: brandLogoUrl,
    brandLogoUrl,
    ...fiscal,
  }
}

export function mapApiProducts(productos = []) {
  if (!Array.isArray(productos)) {
    return []
  }

  return productos.map(mapApiProduct).filter((product) => Boolean(product.id))
}
