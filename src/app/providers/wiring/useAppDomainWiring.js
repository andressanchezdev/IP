import { useEffect, useRef } from 'react'
import { APP_EVENTS } from '../appEvents'
import { createAuthWiring } from './createAuthWiring'
import { createOrdersWiring } from './createOrdersWiring'
import { createUiWiring } from './createUiWiring'
import { createCacheWiring } from './createCacheWiring'

/**
 * Registra el bus de eventos: cada dominio aporta sus handlers;
 * AppProvider solo compone slices y no concentra el acoplamiento.
 */
export function useAppDomainWiring({
  events,
  auth,
  profile,
  orders,
  cart,
  catalog,
  ui,
}) {
  const wiringRef = useRef({})

  wiringRef.current = {
    ...createAuthWiring({ auth, profile, orders, cart, catalog, ui }),
    ...createOrdersWiring({ orders, ui }),
    ...createUiWiring({ orders, cart, catalog, profile, ui }),
    ...createCacheWiring({ catalog, cart, orders }),
  }

  useEffect(() => {
    const unsubscribes = Object.values(APP_EVENTS).map((event) => (
      events.on(event, (payload) => wiringRef.current[event]?.(payload))
    ))

    return () => {
      unsubscribes.forEach((off) => off())
    }
  }, [events])
}
