import { isSpanishCartAction, REALTIME_TYPES } from '../../shared/realtime/messageTypes.js'

function text(value) {
  return String(value ?? '').trim()
}

function entry(productId, listado) {
  const id = text(productId)
  if (!id || listado == null) return null
  return { productId: id, listado }
}

/**
 * Fotos absolutas de stock que trae el mensaje.
 * `cantidad` = existencia, `cantidadAux` = disponible. La bodega pintada la elige la sesión, no el evento.
 * `stock eliminarTodo` sin `listado` no inventa un cambio de stock.
 */
export function collectStockSnapshots(message) {
  const tipo = text(message?.tipo)
  if (!tipo) return []

  if (
    tipo === REALTIME_TYPES.STOCK_CART
    || tipo === REALTIME_TYPES.STOCK_DELETE
    || (isSpanishCartAction(tipo) && message?.listado != null)
  ) {
    const snap = entry(message?.idProducto ?? message?.carrito?.id_producto, message?.listado)
    return snap ? [snap] : []
  }

  const head = tipo.split(/\s+/)[0]
  if (head === 'nuevoControl') {
    const control = text(message?.info?.control)
    if (control !== 'stock' && control !== 'ubic') return []
    const snap = entry(message?.idProducto, message?.info?.lista ?? message?.lista)
    return snap ? [snap] : []
  }

  if (tipo === REALTIME_TYPES.INGRESO) {
    const productos = Array.isArray(message?.info?.productos) ? message.info.productos : []
    return productos
      .map((row) => entry(
        row?.idpr ?? row?.idProducto ?? row?.id_producto ?? row?.id,
        row?.stocking ?? row?.listado ?? row?.stock,
      ))
      .filter(Boolean)
  }

  if (tipo === REALTIME_TYPES.STOCK_DELETE_ALL) {
    const productos = Array.isArray(message?.productos) ? message.productos : []
    return productos
      .map((row) => entry(row?.idProducto ?? row?.id_producto ?? row?.id, row?.listado))
      .filter(Boolean)
  }

  return []
}
