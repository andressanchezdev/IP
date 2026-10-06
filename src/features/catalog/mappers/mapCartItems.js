import { resolveAssetUrl } from './resolveAssetUrl'
import { parseImageArray } from './parseUbicacionStock'
import { resolveProductCardImageUrl } from './productImageThumb'
import { getSessionWarehouseId } from '@/shared/lib/sessionWarehouse'
import { buildStockFields } from '@/shared/lib/stockDetail'
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
 * Conserva iva / exento / compra si el carrito los trae; si no, el slice
 * puede enriquecerlos desde catálogo con enrichCartItemsFiscalFromCatalog.
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
  const imageCardUrl = resolveProductCardImageUrl(imageUrl, entry)
  // Mismo modelo que catálogo y WS: stock = cantidadAux de la bodega del cliente.
  const stockFields = entry.stock != null && entry.stock !== ''
    ? buildStockFields(entry.stock, getSessionWarehouseId())
    : null
  const cartIdValue = Number(entry.id_carrito)
  const cartId = Number.isFinite(cartIdValue) && cartIdValue > 0
    ? entry.id_carrito
    : undefined
  const fiscal = pickProductFiscalFields(entry)

  return {
    id: productId,
    price,
    precio: price,
    description: text(entry.descripcion),
    category: text(entry.categoria),
    brand,
    model: text(entry.modelo),
    reference: text(entry.codigo) || productId,
    ...stockFields,
    searching: text(entry.searching),
    imageUrl,
    imageCardUrl,
    brandLogo: brandLogoUrl,
    brandLogoUrl,
    quantity: Math.max(1, Number(entry.cantidad) || 1),
    ...(cartId !== undefined ? { cartId } : {}),
    userId: entry.id_usuario ?? null,
    discount: Number(entry.descuento) || 0,
    aplicacion: text(entry.aplicacion),
    cartDate: entry.fecha ?? null,
    ...fiscal,
  }
}

export function mapApiCartItems(carritos = []) {
  if (!Array.isArray(carritos) || carritos.length === 0) {
    return []
  }

  return carritos.map(mapApiCartItem).filter(Boolean)
}
