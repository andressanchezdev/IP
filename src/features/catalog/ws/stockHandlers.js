import {
  isOrderFlowWsTipo,
  isSpanishCartActionTipo,
  isStockWsTipo,
  WS_MESSAGE_TYPES,
} from '@/shared/ws/config'
import { applyProductStockFromListado } from './applyProductStock'

function text(value) {
  return String(value ?? '').trim()
}

/**
 * WS → stock de productos en catálogo.
 * Independiente del carrito API: no muta cantidades ni llama GET/POST.
 */
export function applyStockFromWsMessage(message, {
  setProducts,
  preferredWarehouseId = null,
} = {}) {
  const tipo = text(message?.tipo)
  const productId = text(message?.idProducto ?? message?.carrito?.id_producto)

  if (!tipo) {
    return { tipo: '', action: 'ignorado' }
  }

  if (
    tipo === WS_MESSAGE_TYPES.STOCK_CART
    || tipo === WS_MESSAGE_TYPES.STOCK_DELETE
    || (isSpanishCartActionTipo(tipo) && message?.listado != null)
  ) {
    const applied = applyProductStockFromListado({
      setProducts,
      productId,
      listado: message.listado,
      preferredWarehouseId,
      messageWarehouseId: message.idBodega,
    })

    return {
      tipo,
      action: applied ? 'stock actualizado' : 'sin listado',
      productId: productId || null,
      idBodega: applied?.warehouseId ?? message.idBodega ?? null,
      stock: applied?.stock ?? null,
      stockByWarehouse: applied?.stockByWarehouse ?? null,
    }
  }

  if (tipo === WS_MESSAGE_TYPES.STOCK_DELETE_ALL) {
    const productos = Array.isArray(message.productos) ? message.productos : []
    const updated = []

    productos.forEach((entry) => {
      const entryProductId = text(entry?.idProducto ?? entry?.id_producto ?? entry?.id)
      if (!entryProductId || entry?.listado == null) {
        return
      }
      const applied = applyProductStockFromListado({
        setProducts,
        productId: entryProductId,
        listado: entry.listado,
        preferredWarehouseId,
        messageWarehouseId: entry?.idBodega ?? message.idBodega,
      })
      if (applied) {
        updated.push(applied.productId)
      }
    })

    return {
      tipo,
      action: updated.length ? 'stock actualizado' : 'sin listado',
      productId: null,
      idBodega: message.idBodega ?? null,
      updatedIds: updated,
    }
  }

  if (isOrderFlowWsTipo(tipo)) {
    return {
      tipo,
      action: 'flujo pedido (sin stock)',
      orderId: message.cuerpo != null
        ? String(message.cuerpo)
        : (message.idVenta != null ? String(message.idVenta) : null),
      idBodega: message.idBodega ?? null,
    }
  }

  return {
    tipo,
    action: 'ignorado',
    idBodega: message?.idBodega ?? null,
  }
}

export { isStockWsTipo, applyProductStockFromListado }
