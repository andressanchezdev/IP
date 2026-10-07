import { applyWebSocketMessage } from './applyMessage'
import { sendWebSocketMessage } from './socket'

export function publishProductMessage(message, userId) {
  const queued = sendWebSocketMessage(message)
  if (queued) applyWebSocketMessage(message, userId)
  return queued
}
