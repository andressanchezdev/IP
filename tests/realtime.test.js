import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRealtimeFrame } from '../src/shared/realtime/parseFrame.js'
import { parseStockDetail, summarizeStockDetail } from '../src/shared/lib/stockDetail.js'
import { collectStockSnapshots } from '../src/features/realtime/reduceStockEvent.js'
import { applyCartPlan, planCartFromEvent } from '../src/features/realtime/reduceCartEvent.js'
import {
  confirmRealtimeMutation,
  noteRealtimeMutation,
  resetRealtimeMutations,
  setRealtimeSessionUser,
} from '../src/features/realtime/pendingMutations.js'
import { overlayRealtimeStock, rememberStockSnapshot, resetStockMemory } from '../src/features/realtime/stockMemory.js'
import { productOrderLabel, resolveProductOrderState } from '../src/features/catalog/lib/productOrderState.js'

const stockCarrito = {
  tipo: 'stock carrito',
  idProducto: 1209,
  listado: '{"1":[{"ubicacion":"02-D06","cantidad":0,"cantidadAux":0},{"ubicacion":"ZR","cantidad":193,"cantidadAux":191}],"6":[{"ubicacion":"15-A03","cantidad":1117,"cantidadAux":898}]}',
  carrito: {
    id_carrito: 510070,
    id_producto: 1209,
    id_usuario: 694,
    cantidad: 6,
    precio_unitario: '5900',
    id_bodega: '6',
    id_bodega_aux: 0,
  },
}

const eliminarTodo = {
  tipo: 'stock eliminarTodo',
  productos: [],
  carrito: [{
    id_carrito: 510083,
    id_producto: 12260,
    id_usuario: 694,
    cantidad: 1,
    precio_unitario: '75000',
    id_bodega: '1',
  }],
}

test('stock carrito: cantidadAux de MI bodega, id_bodega_aux no cambia la bodega pintada', () => {
  const message = parseRealtimeFrame(JSON.stringify(stockCarrito)).messages[0]
  const detail = parseStockDetail(collectStockSnapshots(message)[0].listado)
  assert.equal(summarizeStockDetail(detail, '1').available, 191)
  assert.equal(summarizeStockDetail(detail, '1').real, 193)
  assert.equal(summarizeStockDetail(detail, '6').available, 898)
  assert.equal(message.idBodega, '6')
})

test('stock carrito del mismo usuario agrega la línea; el de otro no', () => {
  const message = parseRealtimeFrame(JSON.stringify(stockCarrito)).messages[0]
  const mine = planCartFromEvent(message, { userId: 694, cartItems: [] })
  assert.deepEqual(mine.upserts.map((row) => [row.id, row.quantity, row.cartId]), [['1209', 6, 510070]])
  const other = planCartFromEvent(message, { userId: 1547, cartItems: [] })
  assert.equal(other.upserts.length, 0)
  const next = applyCartPlan([], mine)
  assert.equal(next[0].id, '1209')
  assert.equal(next[0].quantity, 6)
  assert.equal(applyCartPlan(next, mine), next)
})

test('eliminarTodo vacía solo las líneas de ese usuario y no inventa stock', () => {
  const message = parseRealtimeFrame(JSON.stringify(eliminarTodo)).messages[0]
  assert.equal(collectStockSnapshots(message).length, 0)
  const plan = planCartFromEvent(message, {
    userId: 694,
    cartItems: [{ id: '12260', quantity: 1 }, { id: '9', quantity: 2 }],
  })
  const next = applyCartPlan([{ id: '12260', quantity: 1 }, { id: '9', quantity: 2 }], plan)
  assert.deepEqual(next.map((item) => item.id), ['9'])
  assert.equal(planCartFromEvent(message, { userId: 1, cartItems: [{ id: '12260' }] }).removeIds.length, 0)
})

test('stock eliminar quita la línea propia y otro cliente solo mueve stock', () => {
  const message = parseRealtimeFrame(JSON.stringify({
    tipo: 'stock eliminar',
    idProducto: 1209,
    listado: '{"1":[{"ubicacion":"ZR","cantidad":193,"cantidadAux":197}]}',
    carrito: { id_producto: 1209, id_usuario: 694, cantidad: 1 },
  })).messages[0]
  const plan = planCartFromEvent(message, { userId: 694, cartItems: [{ id: '1209', quantity: 6 }] })
  assert.deepEqual(plan.removeIds, ['1209'])
  assert.equal(collectStockSnapshots(message)[0].productId, '1209')
  const stranger = planCartFromEvent(message, { userId: 1547, cartItems: [{ id: '1209', quantity: 1 }] })
  assert.equal(stranger.removeIds.length, 0)
})

test('cada 2xx queda pendiente hasta el evento del mismo tipo', () => {
  resetRealtimeMutations()
  setRealtimeSessionUser(694)
  noteRealtimeMutation({ action: 'post', productId: 1209, quantity: 6 })
  noteRealtimeMutation({ action: 'delete-massive' })
  const added = parseRealtimeFrame(JSON.stringify(stockCarrito)).messages[0]
  const cleared = parseRealtimeFrame(JSON.stringify(eliminarTodo)).messages[0]
  assert.equal(confirmRealtimeMutation(added).action, 'post')
  assert.equal(confirmRealtimeMutation(cleared).action, 'delete-massive')
  assert.equal(confirmRealtimeMutation(added), null)
  resetRealtimeMutations()
})

test('una respuesta HTTP anterior no pisa el stock que el socket ya aplicó', () => {
  resetStockMemory()
  const detail = parseStockDetail(stockCarrito.listado)
  rememberStockSnapshot('1209', detail, 200)
  const fresh = [{ id: '1209', stock: 999, stockDetail: null }, { id: '1', stock: 4 }]
  const patched = overlayRealtimeStock(fresh, 100, '1')
  assert.equal(patched[0].stock, 191)
  assert.equal(patched[1], fresh[1])
  assert.equal(overlayRealtimeStock(fresh, 300, '1'), fresh)
  resetStockMemory()
})

test('el botón sigue el stock libre y si la línea es mía', () => {
  assert.equal(productOrderLabel(resolveProductOrderState({ stock: 3, isInCart: false })), 'Ordenar')
  assert.equal(productOrderLabel(resolveProductOrderState({ stock: 0, isInCart: true })), 'Ordenado')
  assert.equal(productOrderLabel(resolveProductOrderState({ stock: 0, isInCart: false })), 'Agotado')
  assert.equal(productOrderLabel(resolveProductOrderState({ stock: 3, isInCart: false, isOrdering: true })), 'Ordenando…')
})

test('saludo del servidor y frames vacíos no son errores', () => {
  assert.equal(parseRealtimeFrame('{"type":"connected"}').ignored, 'latido')
  assert.equal(parseRealtimeFrame('undefined').ignored, 'vacio')
  assert.equal(parseRealtimeFrame('undefined').errors.length, 0)
})
