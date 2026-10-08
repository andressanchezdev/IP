import { WS_RETRY_MAX_MS, WS_RETRY_MIN_MS, WS_URL } from './config'
import { isProductStockMessage } from './messageTypes'

let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
let shouldConnect = false
let lifecycleBound = false
const listeners = new Set()
const pendingMessages = []

function recoverWebSocket() {
  if (!shouldConnect) return
  if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return
  startWebSocket()
}

function bindLifecycle() {
  if (lifecycleBound || typeof window === 'undefined') return
  lifecycleBound = true
  window.addEventListener('online', recoverWebSocket)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') recoverWebSocket()
  })
}

function notify(message) {
  listeners.forEach((listener) => {
    try {
      listener(message)
    } catch (error) {
      console.error('[ws] No se pudo aplicar el mensaje recibido', error)
    }
  })
}

function outgoingLabel(tipo) {
  return {
    'stock carrito': '[cart] POST completado',
    'stock eliminar': '[cart] DELETE completado',
    'stock eliminarTodo': '[cart] DELETE massive completado',
  }[tipo] ?? `[ws] ${tipo}`
}

function logOutgoing(message) {
  console.info(outgoingLabel(message?.tipo), message)
}

function flushPending(current) {
  while (socket === current && current.readyState === WebSocket.OPEN && pendingMessages.length > 0) {
    const payload = pendingMessages.shift()
    try {
      current.send(payload)
      logOutgoing(JSON.parse(payload))
    } catch (error) {
      pendingMessages.unshift(payload)
      console.error('[ws] No se pudo enviar el mensaje pendiente', error)
      current.close()
    }
  }
}

function reconnect() {
  if (!shouldConnect || reconnectTimer != null) return
  const delay = Math.min(WS_RETRY_MIN_MS * (2 ** reconnectAttempt), WS_RETRY_MAX_MS)
  reconnectAttempt += 1
  console.info('[ws] reconectando')
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectWebSocket()
  }, delay)
}

// [WS-HOY 2026-10-08] INICIO: normalizeIncoming (agregada hoy).
// Deja idProducto / idBodega / idCarrito en el nivel superior del mensaje de stock, vengan como
// idProducto, id_producto o dentro de carrito. No toca `listado` (puede ser string o mapa por producto).
function normalizeIncoming(message) {
  if (!isProductStockMessage(message)) return message
  const line = message.carrito && typeof message.carrito === 'object' && !Array.isArray(message.carrito)
    ? message.carrito
    : null
  const pick = (...values) => values.find((value) => value != null && value !== '')
  const idProducto = pick(message.idProducto, message.id_producto, line?.id_producto)
  const idBodega = pick(message.idBodega, message.id_bodega, line?.id_bodega)
  const idCarrito = pick(message.idCarrito, message.id_carrito, line?.id_carrito)
  const next = { ...message }
  if (idProducto != null) next.idProducto = idProducto
  if (idBodega != null) next.idBodega = idBodega
  if (idCarrito != null) next.idCarrito = idCarrito
  return next
}
// [WS-HOY 2026-10-08] FIN

// [WS-HOY 2026-10-08] Único punto de entrada: muestra en consola el mensaje escuchado y lo notifica.
function dispatchIncoming(message) {
  console.log(`[ws] recibido: ${message.tipo}`, message)
  notify(message)
}

function parseMessage(raw) {
  let value = raw
  for (let depth = 0; depth < 4 && typeof value === 'string'; depth += 1) {
    try {
      value = JSON.parse(value)
    } catch {
      console.log('[ws] ignorado (no es JSON):', raw)
      return null
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item) => {
      const message = parseMessage(item)
      if (message) dispatchIncoming(message)
    })
    return null
  }
  if (!value || typeof value !== 'object') {
    console.log('[ws] ignorado (no es objeto):', raw)
    return null
  }
  if (value.tipo) return normalizeIncoming(value) // [WS-HOY 2026-10-08]
  for (const key of ['data', 'message', 'mensaje', 'payload', 'body']) {
    if (value[key] != null) return parseMessage(value[key])
  }
  console.log('[ws] ignorado (sin tipo):', value)
  return null
}

function connectWebSocket() {
  if (!shouldConnect || !WS_URL || typeof WebSocket === 'undefined') return
  if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return

  let current
  try {
    current = new WebSocket(WS_URL)
    socket = current
  } catch (error) {
    console.error('[ws] No se pudo abrir la conexión', error)
    reconnect()
    return
  }

  current.addEventListener('open', () => {
    if (socket !== current) return
    reconnectAttempt = 0
    console.info('[ws] conectado')
    flushPending(current)
  })
  current.addEventListener('message', ({ data }) => {
    if (socket !== current) return
    // [WS-HOY 2026-10-08] antes se llamaba notify dos veces y message.tipo fallaba con null.
    const message = parseMessage(data)
    if (!message) return
    dispatchIncoming(message)
  })
  current.addEventListener('error', () => {
    if (socket === current) console.error('[ws] ERROR DE CONEXIÓN')
  })
  current.addEventListener('close', () => {
    if (socket !== current) return
    socket = null
    reconnect()
  })
}

export function startWebSocket() {
  if (!WS_URL) {
    console.error('[ws] VITE_WS_URL no está configurada')
    return
  }
  shouldConnect = true
  bindLifecycle()
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  connectWebSocket()
}

export function stopWebSocket() {
  shouldConnect = false
  reconnectAttempt = 0
  pendingMessages.length = 0
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  const current = socket
  socket = null
  if (!current) return
  const close = () => {
    if (current.readyState === WebSocket.OPEN) current.close(1000, 'app disconnected')
  }
  if (current.readyState === WebSocket.CONNECTING) {
    current.addEventListener('open', close, { once: true })
  } else {
    close()
  }
}

export function subscribeWebSocket(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sendWebSocketMessage(message) {
  try {
    if (!isProductStockMessage(message)) {
      throw new TypeError('Solo se pueden enviar eventos de stock de productos')
    }
    if (!WS_URL) {
      throw new Error('VITE_WS_URL no está configurada')
    }
    const payload = JSON.stringify(message)
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingMessages.push(payload)
      startWebSocket()
      return true
    }
    logOutgoing(message)
    socket.send(payload)
    return true
  } catch (error) {
    console.error(`[ws ${message?.tipo} fail]`, message, error)
    return false
  }
}
