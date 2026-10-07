import { normalizeStockWarehouseKey, parseStockDetail } from '@/shared/lib/stockDetail'

export const WS_PRODUCT_WAREHOUSE_ID = '6'

const restoredStockByCart = new Map()

function parseListing(value) {
  if (typeof value === 'string') {
    try {
      return parseListing(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const keys = Object.keys(value)
  if (keys.length && keys.every((key) => Array.isArray(value[key]))) {
    return Object.fromEntries(
      Object.entries(value).map(([key, rows]) => [key, rows.map((row) => ({ ...row }))]),
    )
  }

  const internal = {}
  for (const [warehouseId, bucket] of Object.entries(value)) {
    if (Array.isArray(bucket?.locations)) {
      internal[warehouseId] = bucket.locations.map((row) => ({ ...row }))
    }
  }
  return Object.keys(internal).length ? internal : null
}

export function stockListingFromProduct(product) {
  const raw = parseListing(product?.stockData)
  if (raw) return raw

  const detail = parseStockDetail(product?.stockDetail)
  if (!detail) return null
  const listing = {}
  Object.entries(detail).forEach(([warehouseId, bucket]) => {
    if (warehouseId !== '*') listing[warehouseId] = bucket.locations
  })
  return Object.keys(listing).length ? listing : null
}

export function restoreStockForDeleteAll(product, warehouseId, quantity) {
  const listing = stockListingFromProduct(product)
  const key = normalizeStockWarehouseKey(warehouseId)
  const rows = listing?.[key]
  let remaining = Number(quantity)
  if (!Array.isArray(rows) || !Number.isFinite(remaining) || remaining <= 0) return null

  const orderedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => Number(String(a.row.ubicacion).toUpperCase() === 'ZR')
      - Number(String(b.row.ubicacion).toUpperCase() === 'ZR'))

  for (const { row } of orderedRows) {
    if (remaining <= 0) break
    const physical = Number(row.cantidad)
    if (!Number.isFinite(physical)) continue
    const current = Math.min(physical, available(row))
    const restored = Math.min(remaining, physical - current)
    if (restored <= 0) continue
    row.cantidadAux = current + restored
    remaining -= restored
  }

  return listing
}

function available(row) {
  const quantity = Number(row?.cantidadAux ?? row?.cantidad)
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0
}

function cartAllocationKey({ productId, warehouseId, cartId }) {
  return `${productId}:${warehouseId}:${cartId ?? ''}`
}

function cartPayload(cart, { productId, userId, quantity, product }) {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const fecha = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  const result = {
    ...cart,
    id_producto: cart?.id_producto ?? productId,
    id_usuario: cart?.id_usuario ?? userId,
    estado: cart?.estado ?? 'venta',
    cantidad: cart?.cantidad ?? cart?.quantity ?? quantity ?? 1,
    fecha: cart?.fecha ?? cart?.cartDate ?? fecha,
    descuento: cart?.descuento ?? cart?.discount ?? 0,
    precio_unitario: cart?.precio_unitario ?? cart?.price ?? product?.precio ?? product?.price ?? '0',
    compra: cart?.compra ?? product?.compra ?? '0',
    iva: cart?.iva ?? product?.iva ?? 0,
    exento: cart?.exento ?? product?.exento ?? 0,
    estadoCaja: cart?.estadoCaja ?? 'pendiente',
    id_bodega: WS_PRODUCT_WAREHOUSE_ID,
    aux_venta: cart?.aux_venta ?? JSON.stringify({ type: cart?.type ?? '', cons: cart?.cons ?? '' }),
    aplicacion: cart?.aplicacion ?? product?.aplicacion ?? '',
    cons: cart?.cons ?? '',
    type: cart?.type ?? '',
    id_bodega_aux: cart?.id_bodega_aux ?? 0,
  }
  for (const key of ['id_carrito', 'id_cliente', 'id_empresa']) {
    if (cart?.[key] != null) result[key] = cart[key]
  }
  for (const key of ['id', 'quantity', 'cartId', 'userId', 'price', 'cartDate', 'discount']) {
    delete result[key]
  }
  return result
}

function changeAvailable(listing, warehouseId, change, allocationKey) {
  const key = normalizeStockWarehouseKey(warehouseId)
  const rows = listing[key]
  if (!Array.isArray(rows) || rows.length === 0 || change === 0) return false

  if (change < 0) {
    let remaining = Math.abs(change)
    const allocations = []
    const orderedRows = rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => Number(String(a.row.ubicacion).toUpperCase() === 'ZR')
        - Number(String(b.row.ubicacion).toUpperCase() === 'ZR'))

    for (const { row, index } of orderedRows) {
      if (remaining <= 0) break
      const taken = Math.min(remaining, available(row))
      if (taken <= 0) continue
      const next = Math.max(0, available(row) - taken)
      row.cantidadAux = next
      allocations.push({ index, quantity: taken })
      remaining -= taken
    }
    if (allocationKey) {
      const previous = restoredStockByCart.get(allocationKey) ?? []
      const merged = new Map(previous.map(({ index, quantity }) => [index, quantity]))
      allocations.forEach(({ index, quantity }) => {
        merged.set(index, (merged.get(index) ?? 0) + quantity)
      })
      restoredStockByCart.set(
        allocationKey,
        Array.from(merged, ([index, quantity]) => ({ index, quantity })),
      )
    }
    return true
  }

  const allocations = allocationKey ? restoredStockByCart.get(allocationKey) : null
  if (allocations?.length) {
    let remaining = change
    const pending = []
    allocations.forEach(({ index, quantity }) => {
      const restored = Math.min(remaining, quantity)
      if (rows[index] && restored > 0) {
        rows[index].cantidadAux = available(rows[index]) + restored
        remaining -= restored
      }
      if (quantity > restored) pending.push({ index, quantity: quantity - restored })
    })
    if (remaining > 0) {
      const restoreIndex = Math.max(0, rows.findIndex((row) => String(row.ubicacion).toUpperCase() === 'ZR'))
      rows[restoreIndex].cantidadAux = available(rows[restoreIndex]) + remaining
    }
    if (pending.length) restoredStockByCart.set(allocationKey, pending)
    else restoredStockByCart.delete(allocationKey)
    return true
  }

  const restoreIndex = Math.max(0, rows.findIndex((row) => String(row.ubicacion).toUpperCase() === 'ZR'))
  rows[restoreIndex].cantidadAux = available(rows[restoreIndex]) + change
  return true
}

export function buildStockCartMessage({
  product,
  productId,
  userId,
  cart,
  quantityChange,
}) {
  const listing = stockListingFromProduct(product)
  if (!listing) return null
  const normalizedWarehouseId = WS_PRODUCT_WAREHOUSE_ID
  if (!normalizedWarehouseId || !Array.isArray(listing[normalizedWarehouseId]) || !userId) return null

  const cartId = cart?.id_carrito ?? cart?.cartId
  const key = cartAllocationKey({ productId, warehouseId: normalizedWarehouseId, cartId })
  if (!changeAvailable(listing, normalizedWarehouseId, -Number(quantityChange || 0), key)) return null

  const carrito = cartPayload(cart, {
    productId,
    userId,
    product,
  })

  return {
    tipo: 'stock carrito',
    idProducto: productId,
    listado: JSON.stringify(listing),
    carrito,
  }
}

export function buildStockDeleteMessage({ product, productId, cart }) {
  const listing = stockListingFromProduct(product)
  if (!listing) return null
  const normalizedWarehouseId = WS_PRODUCT_WAREHOUSE_ID
  if (!normalizedWarehouseId || !Array.isArray(listing[normalizedWarehouseId])) return null

  const cartId = cart?.id_carrito ?? cart?.cartId
  const key = cartAllocationKey({ productId, warehouseId: normalizedWarehouseId, cartId })
  if (!changeAvailable(listing, normalizedWarehouseId, Number(cart?.cantidad ?? cart?.quantity ?? 1), key)) return null
  return {
    idProducto: productId,
    tipo: 'stock eliminar',
    listado: JSON.stringify(listing),
    idBodega: String(normalizedWarehouseId),
    ...(cartId != null ? { idCarrito: Number(cartId) || cartId } : {}),
  }
}

export function buildStockDeleteAllMessage(cartItems = []) {
  const carrito = cartItems.map((item) => {
    const raw = item?.apiData
    if (raw && typeof raw === 'object') {
      return { ...raw, id_bodega: WS_PRODUCT_WAREHOUSE_ID }
    }
    return {
      id_carrito: item?.cartId,
      compra: item?.compra ?? '0',
      iva: item?.iva ?? 0,
      exento: item?.exento ?? 0,
      id_bodega: WS_PRODUCT_WAREHOUSE_ID,
      id_producto: item?.id,
      fecha: item?.cartDate ?? '',
      descuento: item?.discount ?? 0,
      id_usuario: item?.userId ?? null,
      cantidad: item?.quantity ?? 1,
      precio_unitario: item?.price ?? 0,
      aplicacion: item?.aplicacion ?? '',
      type: item?.type ?? '',
    }
  })
  return { productos: [], carrito, tipo: 'stock eliminarTodo' }
}

export function getStockListingFromMessage(message) {
  if (message?.tipo === 'nuevoControl' && ['stock', 'ubic'].includes(message?.info?.control)) {
    return {
      productId: message.idProducto,
      listado: message.info?.lista ?? message.lista,
    }
  }
  if (['stock carrito', 'stock eliminar'].includes(message?.tipo)) {
    return { productId: message.idProducto, listado: message.listado }
  }
  return null
}
