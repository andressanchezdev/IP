import { useEffect, useRef } from 'react'
import { bindRealtimeSlot } from './slots'

/** Publica un setter de React. No conecta ni desconecta el socket. */
export function useRealtimeSlot(name, setter) {
  useEffect(() => {
    if (typeof setter !== 'function') return undefined
    return bindRealtimeSlot(name, setter)
  }, [name, setter])
}

/** Publica un ref que el dispatcher puede leer (p. ej. las líneas actuales del carrito). */
export function useRealtimeRef(name, ref) {
  const stable = useRef(ref)
  stable.current = ref
  useEffect(() => bindRealtimeSlot(name, stable.current), [name])
}
