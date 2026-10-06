import {
  REALTIME_CONNECT_TIMEOUT_MS,
  REALTIME_IDLE_RECYCLE_MS,
  REALTIME_RETRY_MS,
  REALTIME_URL,
  REALTIME_WAKE_SILENCE_MS,
} from './config'
import { parseRealtimeFrame } from './parseFrame'

/** @typedef {'idle' | 'connecting' | 'ready' | 'disconnected' | 'error'} RealtimeStatus */

let socket = null
/** @type {RealtimeStatus} */
let status = 'idle'
let reconnectTimerId = null
let intentionalClose = false
let activeUrl = REALTIME_URL
let wantConnected = false
let lastActivityAt = 0
let connectingSince = 0
let hadConnection = false
let healthTimerId = null
let browserHooksInstalled = false
let connectedAt = 0
let disconnectedMs = 0
let disconnectedSince = 0

const listeners = new Set()
const stats = {
  frames: 0,
  messages: 0,
  ignoredEmpty: 0,
  ignoredHeartbeat: 0,
  unreadable: 0,
  reconnects: 0,
  byTipo: {},
}

function emit(event) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      console.error('[realtime] Error en listener', error)
    }
  })
}

function setStatus(nextStatus) {
  if (status === nextStatus) return
  if (nextStatus === 'ready') {
    if (disconnectedSince > 0) {
      disconnectedMs += Date.now() - disconnectedSince
      disconnectedSince = 0
    }
    connectedAt = Date.now()
  } else if (status === 'ready' && disconnectedSince === 0) {
    disconnectedSince = Date.now()
  }
  status = nextStatus
  emit({ type: 'realtime:status', status: nextStatus })
}

function clearReconnectTimer() {
  if (reconnectTimerId != null) {
    window.clearTimeout(reconnectTimerId)
    reconnectTimerId = null
  }
}

function scheduleReconnect() {
  if (intentionalClose || !wantConnected) return
  clearReconnectTimer()
  stats.reconnects += 1
  if (import.meta.env.DEV) {
    console.info(`[realtime] Reintento en ${REALTIME_RETRY_MS}ms`)
  }
  reconnectTimerId = window.setTimeout(() => {
    reconnectTimerId = null
    connectRealtime({ url: activeUrl })
  }, REALTIME_RETRY_MS)
}

function handleMessage(rawData) {
  lastActivityAt = Date.now()
  stats.frames += 1
  const frame = parseRealtimeFrame(rawData)
  if (frame.ignored === 'latido') {
    stats.ignoredHeartbeat += 1
    return
  }
  if (frame.ignored === 'vacio') {
    stats.ignoredEmpty += 1
    return
  }
  if (frame.errors.length > 0) {
    stats.unreadable += 1
    if (import.meta.env.DEV) {
      console.warn('[realtime] Mensaje no legible', frame.errors)
    }
  }
  frame.messages.forEach((message) => {
    stats.messages += 1
    stats.byTipo[message.tipo] = (stats.byTipo[message.tipo] || 0) + 1
    if (import.meta.env.DEV) {
      console.info('[realtime] message', message.tipo, message)
    }
    emit({ type: 'realtime:message', message })
  })
}

function recycleSocket(reason) {
  if (!wantConnected) return
  const old = socket
  socket = null
  if (old) {
    try {
      old.close(4000, `recycle:${reason}`)
    } catch {
      // El cierre tardío del socket viejo no debe tumbar el nuevo.
    }
  }
  clearReconnectTimer()
  if (import.meta.env.DEV) {
    console.info('[realtime] reciclando socket', reason)
  }
  connectRealtime({ url: activeUrl })
}

function probeConnection(reason) {
  if (!wantConnected || typeof WebSocket === 'undefined') return
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    clearReconnectTimer()
    connectRealtime({ url: activeUrl })
    return
  }
  if (socket.readyState === WebSocket.OPEN && Date.now() - lastActivityAt > REALTIME_WAKE_SILENCE_MS) {
    recycleSocket(reason)
  }
}

function healthTick() {
  if (!wantConnected || typeof WebSocket === 'undefined') return
  const now = Date.now()
  if (!socket) {
    if (reconnectTimerId == null) connectRealtime({ url: activeUrl })
    return
  }
  if (
    (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING)
    && reconnectTimerId == null
  ) {
    recycleSocket('closed')
    return
  }
  if (socket.readyState === WebSocket.CONNECTING && now - connectingSince > REALTIME_CONNECT_TIMEOUT_MS) {
    recycleSocket('connect-timeout')
    return
  }
  if (socket.readyState === WebSocket.OPEN && now - lastActivityAt > REALTIME_IDLE_RECYCLE_MS) {
    recycleSocket('idle')
  }
}

function startHealthWatch() {
  if (typeof window === 'undefined') return
  if (healthTimerId == null) {
    healthTimerId = window.setInterval(healthTick, REALTIME_RETRY_MS)
  }
  if (!browserHooksInstalled) {
    browserHooksInstalled = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') probeConnection('visible')
    })
    window.addEventListener('online', () => probeConnection('online'))
    window.addEventListener('focus', () => probeConnection('focus'))
    window.addEventListener('pageshow', () => probeConnection('pageshow'))
  }
}

function stopHealthWatch() {
  if (healthTimerId != null) {
    window.clearInterval(healthTimerId)
    healthTimerId = null
  }
}

/**
 * Una sola conexión mientras haya sesión. Los features se suscriben; ninguno la cierra.
 * Si se cae, reintenta cada 1,5 s. No se abre después de cada HTTP: ya está abierta antes de la acción.
 */
export function connectRealtime({ url = REALTIME_URL } = {}) {
  activeUrl = url || REALTIME_URL
  intentionalClose = false
  wantConnected = true
  clearReconnectTimer()
  startHealthWatch()

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket
  }
  if (typeof WebSocket === 'undefined') {
    setStatus('error')
    emit({ type: 'realtime:error', error: new Error('WebSocket no disponible') })
    return null
  }

  setStatus('connecting')
  connectingSince = Date.now()

  let current
  try {
    current = new WebSocket(activeUrl)
    current.binaryType = 'arraybuffer'
    socket = current
  } catch (error) {
    setStatus('error')
    emit({ type: 'realtime:error', error })
    scheduleReconnect()
    return null
  }

  const isCurrent = () => socket === current

  current.addEventListener('open', () => {
    if (!isCurrent()) return
    const openedAt = Date.now()
    const isReconnection = hadConnection
    hadConnection = true
    lastActivityAt = openedAt
    setStatus('ready')
    if (import.meta.env.DEV) {
      console.info('[realtime] listo', activeUrl, isReconnection ? '(reconexión)' : '')
    }
    emit({ type: 'realtime:ready', url: activeUrl, reconnection: isReconnection })
  })

  current.addEventListener('message', (event) => {
    if (!isCurrent()) return
    handleMessage(event.data)
  })

  current.addEventListener('error', () => {
    if (!isCurrent()) return
    setStatus('error')
    emit({ type: 'realtime:error' })
  })

  current.addEventListener('close', (event) => {
    if (!isCurrent()) return
    socket = null
    setStatus('disconnected')
    if (import.meta.env.DEV) {
      console.info('[realtime] cerrado', event.code, event.reason)
    }
    emit({ type: 'realtime:disconnected', code: event.code, reason: event.reason })
    if (!intentionalClose) scheduleReconnect()
  })

  return socket
}

export function disconnectRealtime() {
  intentionalClose = true
  wantConnected = false
  hadConnection = false
  stopHealthWatch()
  clearReconnectTimer()
  if (socket) {
    try {
      socket.close(1000, 'client disconnect')
    } catch {
      // ignore
    }
    socket = null
  }
  setStatus('disconnected')
}

export function subscribeRealtime(listener) {
  listeners.add(listener)
  listener({ type: 'realtime:status', status })
  return () => {
    listeners.delete(listener)
  }
}

export function getRealtimeStatus() {
  return status
}

export function getRealtimeStats() {
  const now = Date.now()
  const down = disconnectedMs + (disconnectedSince > 0 ? now - disconnectedSince : 0)
  const up = connectedAt > 0 && status === 'ready' ? now - connectedAt : 0
  const span = up + down
  return {
    ...stats,
    byTipo: { ...stats.byTipo },
    status,
    url: activeUrl,
    ready: status === 'ready' && socket?.readyState === WebSocket.OPEN,
    disconnectedMs: down,
    readyRatio: span > 0 ? up / span : (status === 'ready' ? 1 : 0),
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__realtimeStats = getRealtimeStats
}
