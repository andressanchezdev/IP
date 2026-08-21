import { useEffect } from 'react'
import {
  connectStockSocket,
  subscribeStockSocket,
} from '@/shared/ws'
import { applyOrderFlowFromWsMessage } from './applyOrderFlowFromWs'

/**
 * Escucha el mismo WS de la app y avanza el flow de las cards de Historial.
 * Comparte conexión singleton con el WS de stock.
 */
export function useOrderFlowWebSocket({ enabled = false, setPendingOrders }) {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    connectStockSocket()

    const unsubscribe = subscribeStockSocket((event) => {
      if (event.type !== 'ws:message' || !event.message) {
        return
      }
      applyOrderFlowFromWsMessage(event.message, { setPendingOrders })
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, setPendingOrders])
}
