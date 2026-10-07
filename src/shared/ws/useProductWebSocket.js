import { useEffect, useRef } from 'react'
import { applyWebSocketMessage } from './applyMessage'
import { startWebSocket, stopWebSocket, subscribeWebSocket } from './socket'

export function useProductWebSocket({ userId } = {}) {
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  useEffect(() => {
    const unsubscribe = subscribeWebSocket((message) => {
      applyWebSocketMessage(message, userIdRef.current)
    })
    startWebSocket()
    return () => {
      unsubscribe()
      stopWebSocket()
    }
  }, [])
}
