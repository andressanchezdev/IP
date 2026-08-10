import { useEffect, useState } from 'react'

/** Valor con debounce: útil para búsqueda sin disparar trabajo en cada tecla. */
export function useDebouncedValue(value, delayMs = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [value, delayMs])

  return debouncedValue
}
