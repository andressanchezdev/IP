import { useEffect } from 'react'
import {
  connectStockSocket,
  disconnectStockSocket,
  subscribeStockSocket,
} from '@/shared/ws'
import { applyStockFromWsMessage } from './stockHandlers'

/**
 * WebSocket de stock — canal independiente del carrito API.
 *
 * Rol: mantener `products[].stock` / `stockByWarehouse` al día vía `listado`.
 * No envía peticiones HTTP ni muta el carrito.
 */
export function useStockWebSocket({
  enabled = false,
  setProducts,
  preferredWarehouseIdRef,
}) {
  useEffect(() => {
    if (!enabled) {
      disconnectStockSocket()
      return undefined
    }

    connectStockSocket()

    const unsubscribe = subscribeStockSocket((event) => {
      if (event.type !== 'ws:message' || !event.message) {
        return
      }

      applyStockFromWsMessage(event.message, {
        setProducts,
        preferredWarehouseId: preferredWarehouseIdRef?.current ?? null,
      })
    })

    return () => {
      unsubscribe()
      disconnectStockSocket()
    }
  }, [enabled, preferredWarehouseIdRef, setProducts])
}
