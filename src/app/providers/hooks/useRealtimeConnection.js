import { useEffect } from 'react'
import { applyRealtimeMessage } from '@/features/realtime/applyRealtimeMessage'
import { getRealtimeDiagnostics, setRealtimeSessionUser } from '@/features/realtime/pendingMutations'
import {
  connectRealtime,
  disconnectRealtime,
  getRealtimeStats,
  subscribeRealtime,
} from '@/shared/realtime/socket'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__realtimeStats = () => ({
    ...getRealtimeStats(),
    ...getRealtimeDiagnostics(),
  })
}

/**
 * Único dueño de la conexión. Se abre con la sesión y se mantiene;
 * cada HTTP 2xx solo anota qué evento debe confirmar, no abre otro socket.
 */
export function useRealtimeConnection({ enabled, userId }) {
  useEffect(() => {
    if (!enabled) {
      setRealtimeSessionUser(null)
      disconnectRealtime()
      return undefined
    }

    setRealtimeSessionUser(userId)
    connectRealtime()
    const unsubscribe = subscribeRealtime((event) => {
      if (event.type !== 'realtime:message' || !event.message) return
      applyRealtimeMessage(event.message)
    })

    return () => {
      unsubscribe()
      disconnectRealtime()
      setRealtimeSessionUser(null)
    }
  }, [enabled, userId])
}
