import { useCallback, useRef, useState } from 'react'

/**
 * Candado para acciones async: evita doble clic / multi-tap
 * (misma petición en paralelo) en web y móvil.
 */
export function useActionLock() {
  const lockRef = useRef(false)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (fn) => {
    if (lockRef.current) {
      return { skipped: true }
    }
    lockRef.current = true
    setBusy(true)
    try {
      return await fn()
    } finally {
      lockRef.current = false
      setBusy(false)
    }
  }, [])

  return { busy, run, isLocked: () => lockRef.current }
}

/**
 * Candado por clave (p. ej. productId) sin re-renderes por cada tecla.
 */
export function createKeyedActionLock() {
  const locks = new Set()

  return {
    has(key) {
      return locks.has(String(key))
    },
    async run(key, fn) {
      const id = String(key)
      if (locks.has(id)) {
        return { skipped: true, duplicate: true }
      }
      locks.add(id)
      try {
        return await fn()
      } finally {
        locks.delete(id)
      }
    },
  }
}
