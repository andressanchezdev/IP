import {
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  WS_URL,
} from './config'
import { normalizeWsMessage } from './normalizeMessage'

/** @typedef {'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'} WsStatus */

let socket = null
/** @type {WsStatus} */
let status = 'idle'
let reconnectAttempt = 0
let reconnectTimerId = null
let intentionalClose = false
let activeUrl = WS_URL

const listeners = new Set()

function emit(event) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('[ws] Error en listener', error)
    }
  })
}

function setStatus(nextStatus) {
  if (status === nextStatus) {
    return
  }
  status = nextStatus
  emit({ type: 'ws:status', status: nextStatus })
}

function clearReconnectTimer() {
  if (reconnectTimerId != null) {
    window.clearTimeout(reconnectTimerId)
    reconnectTimerId = null
  }
}

function scheduleReconnect() {
  if (intentionalClose) {
    return
  }

  clearReconnectTimer()
  const delay = Math.min(
    WS_RECONNECT_BASE_MS * 2 ** reconnectAttempt,
    WS_RECONNECT_MAX_MS,
  )
  reconnectAttempt += 1

  if (import.meta.env.DEV) {
    console.info(`[ws] Reintento #${reconnectAttempt} en ${delay}ms`)
  }

  reconnectTimerId = window.setTimeout(() => {
    connectStockSocket({ url: activeUrl })
  }, delay)
}

function handleMessage(rawData) {
  const message = normalizeWsMessage(rawData)
  if (!message) {
    if (import.meta.env.DEV) {
      console.warn('[ws] Mensaje no parseable', rawData)
    }
    return
  }

  if (import.meta.env.DEV) {
    console.info('[ws] message', message.tipo, message)
  }

  emit({ type: 'ws:message', message })
}

/**
 * Conecta al canal WebSocket de stock (singleton).
 * Confirma conexión vía status `connected` + evento `ws:connected`.
 */
export function connectStockSocket({ url = WS_URL } = {}) {
  activeUrl = url || WS_URL
  intentionalClose = false
  clearReconnectTimer()

  if (
    socket
    && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket
  }

  if (typeof WebSocket === 'undefined') {
    setStatus('error')
    emit({ type: 'ws:error', error: new Error('WebSocket no disponible') })
    return null
  }

  setStatus('connecting')

  try {
    socket = new WebSocket(activeUrl)
  } catch (error) {
    setStatus('error')
    emit({ type: 'ws:error', error })
    scheduleReconnect()
    return null
  }

  socket.addEventListener('open', () => {
    reconnectAttempt = 0
    setStatus('connected')
    if (import.meta.env.DEV) {
      console.info('[ws] connected', activeUrl)
    }
    emit({ type: 'ws:connected', url: activeUrl })
  })

  socket.addEventListener('message', (event) => {
    handleMessage(event.data)
  })

  socket.addEventListener('error', () => {
    setStatus('error')
    emit({ type: 'ws:error' })
  })

  socket.addEventListener('close', (event) => {
    socket = null
    setStatus('disconnected')
    if (import.meta.env.DEV) {
      console.info('[ws] closed', event.code, event.reason)
    }
    emit({ type: 'ws:disconnected', code: event.code, reason: event.reason })

    if (!intentionalClose) {
      scheduleReconnect()
    }
  })

  return socket
}

export function disconnectStockSocket() {
  intentionalClose = true
  clearReconnectTimer()
  reconnectAttempt = 0

  if (socket) {
    try {
      socket.close(1000, 'client disconnect')
    } catch {
      // ignore
    }
    socket = null
  }

  setStatus('disconnected')
  if (import.meta.env.DEV) {
    console.info('[ws] disconnected (intentional)')
  }
}

export function reconnectStockSocket() {
  disconnectStockSocket()
  intentionalClose = false
  return connectStockSocket({ url: activeUrl })
}

export function getStockSocketStatus() {
  return status
}

export function getStockSocketUrl() {
  return activeUrl
}

/**
 * @param {(event: { type: string, [key: string]: unknown }) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeStockSocket(listener) {
  listeners.add(listener)
  listener({ type: 'ws:status', status })
  return () => {
    listeners.delete(listener)
  }
}

export function isStockSocketConnected() {
  return status === 'connected' && socket?.readyState === WebSocket.OPEN
}

/**
 * Envía un payload JSON por el canal WebSocket (acciones de producto/carrito).
 * @returns {boolean} true si se encoló/envió
 */
export function sendStockSocketMessage(payload) {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    if (import.meta.env.DEV) {
      console.warn('[ws] send omitido: socket no conectado', payload)
    }
    emit({
      type: 'ws:send-failed',
      payload,
      reason: 'not-connected',
    })
    return false
  }

  try {
    const body = JSON.stringify(payload)
    socket.send(body)
    if (import.meta.env.DEV) {
      console.info('[ws] send', payload.tipo, payload)
    }
    emit({
      type: 'ws:send',
      payload,
      sentAt: new Date().toISOString(),
    })
    return true
  } catch (error) {
    console.error('[ws] Error al enviar', error)
    emit({
      type: 'ws:send-failed',
      payload,
      error,
    })
    return false
  }
}
