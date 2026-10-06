import { useEffect } from 'react'
import {
  connectStockSocket,
  subscribeStockSocket,
} from '@/shared/ws'
import { applyOrderFlowFromWsMessage } from './applyOrderFlowFromWs'
import { applyAbonoFromWsMessage } from './applyAbonoFromWs'

/**
 * Escucha el mismo WS de la app y avanza el flow de las cards de Historial.
 * Comparte conexión singleton con el WS de stock.
 */
export function useOrderFlowWebSocket({
  enabled = false,
  userId = null,
  setPendingOrders,
  setHistoryOrders,
}) {
  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    connectStockSocket()

    const unsubscribe = subscribeStockSocket((event) => {
      if (event.type !== 'ws:message' || !event.message) {
        return
      }
      applyOrderFlowFromWsMessage(event.message, { setPendingOrders, setHistoryOrders })
      applyAbonoFromWsMessage(event.message, { userId, setPendingOrders, setHistoryOrders })
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, setHistoryOrders, setPendingOrders, userId])
}
