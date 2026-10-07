import { WS_RETRY_MAX_MS, WS_RETRY_MIN_MS, WS_URL } from './config'
import { isProductStockMessage } from './messageTypes'

let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
let shouldConnect = false
const listeners = new Set()
const pendingMessages = []

function notify(message) {
  listeners.forEach((listener) => {
    try {
      listener(message)
    } catch (error) {
      console.error('[ws] No se pudo aplicar el mensaje recibido', error)
    }
  })
}

function flushPending(current) {
  while (socket === current && current.readyState === WebSocket.OPEN && pendingMessages.length > 0) {
    const payload = pendingMessages.shift()
    try {
      current.send(payload)
      const message = JSON.parse(payload)
      console.info(`[ws] POST ${message.tipo}`)
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
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectWebSocket()
  }, delay)
}

function parseMessage(raw) {
  let value = raw
  for (let depth = 0; depth < 4 && typeof value === 'string'; depth += 1) {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (Array.isArray(value)) {
    value.forEach((item) => notify(item))
    return null
  }
  if (!value || typeof value !== 'object') return null
  if (value.tipo) return value
  for (const key of ['data', 'message', 'mensaje', 'payload', 'body']) {
    if (value[key] != null) return parseMessage(value[key])
  }
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
    const message = parseMessage(data)
    if (message) notify(message)
  })
  current.addEventListener('error', () => {
    if (socket === current) console.error('[ws] error de conexión')
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
    socket.send(payload)
    console.info(`[ws] POST ${message?.tipo}`)
    return true
  } catch (error) {
    console.error(`[ws POST ${message?.tipo} fail]`, error)
    return false
  }
}
