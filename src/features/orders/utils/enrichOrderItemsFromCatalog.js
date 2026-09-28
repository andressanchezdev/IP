import { pickProductFiscalFields } from '@/features/catalog/lib/productFiscalFields'

function toKeys(values) {
  return values
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)
}

export function buildCatalogIndex(products = []) {
  const index = new Map()
  products.forEach((product) => {
    toKeys([product?.id, product?.reference, product?.codigo]).forEach((key) => {
      if (!index.has(key)) {
        index.set(key, product)
      }
    })
  })
  return index
}

function findCatalogProduct(item, catalogIndex) {
  return toKeys([item?.idpr, item?.id, item?.reference, item?.codigo])
    .map((key) => catalogIndex.get(key))
    .find(Boolean)
}

/**
 * Completa líneas de pedido (venta de /managment/sales solo trae idpr/cant/costo)
 * con datos de catálogo: descripción, imagen, marca e iva/exento para el desglose.
 * No modifica el precio de la línea si ya viene del pedido.
 */
export function enrichOrderItemsFromCatalog(items = [], catalogIndex = new Map()) {
  if (!items.length || catalogIndex.size === 0) {
    return items
  }

  return items.map((item) => {
    const product = findCatalogProduct(item, catalogIndex)
    if (!product) {
      return item
    }

    const weakDescription = !item.description
      || /^producto\s*#/i.test(String(item.description))
    const itemFiscal = pickProductFiscalFields(item)
    const catalogFiscal = pickProductFiscalFields(product)

    return {
      ...item,
      description: weakDescription
        ? (product.description || product.model || item.description)
        : item.description,
      category: item.category || product.category || '',
      brand: item.brand || product.brand || '',
      model: item.model || product.model || '',
      reference: item.reference || product.reference || product.codigo || item.id || '',
      imageUrl: item.imageUrl || product.imageUrl || product.imageCardUrl || '',
      brandLogo: item.brandLogo || item.brandLogoUrl || product.brandLogo || product.brandLogoUrl || '',
      brandLogoUrl: item.brandLogoUrl || product.brandLogoUrl || product.brandLogo || '',
      price: Number(item.price ?? item.costo) > 0
        ? Number(item.price ?? item.costo)
        : Number(product.precio ?? product.price) || 0,
      iva: itemFiscal.iva ?? catalogFiscal.iva,
      exento: itemFiscal.exento ?? catalogFiscal.exento,
    }
  })
}
