import {
  isOrderFlowWsTipo,
  isSpanishCartActionTipo,
  WS_MESSAGE_TYPES,
} from '@/shared/ws/config'
import { applyProductStockFromListado } from './applyProductStock'
import { applyCatalogNoticeFromWs } from './applyCatalogProductFromWs'

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

  const tipoHead = tipo.split(/\s+/)[0]
  if (tipoHead === 'nuevoControl') {
    const control = text(message?.info?.control)
    if (control === 'stock' || control === 'ubic') {
      const applied = applyProductStockFromListado({
        setProducts,
        productId,
        listado: message?.info?.lista ?? message?.lista,
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

    const catalogNotice = applyCatalogNoticeFromWs(message, { setProducts })
    return { tipo, ...catalogNotice }
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

  if (isOrderFlowWsTipo(tipo) || tipoHead === 'abonoData') {
    return {
      tipo,
      action: 'flujo pedido (delegado a orders)',
      orderId: message.cuerpo != null
        ? String(message.cuerpo)
        : (message.idVenta != null ? String(message.idVenta) : null),
      idBodega: message.idBodega ?? null,
    }
  }

  if (import.meta.env.DEV) {
    console.info('[ws] tipo parseado pero no aplicado a stock', tipo, message)
  }

  return {
    tipo,
    action: 'ignorado',
    idBodega: message?.idBodega ?? null,
  }
}
