import { useEffect, useState } from 'react'
import { subscribeApiActivity } from '@/shared/api'
import './ApiLoadingIndicator.css'

const SHOW_DELAY_MS = 500

export function ApiLoadingIndicator() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    let activeCount = 0
    let hasShown = false
    let timerId = null

    const unsubscribe = subscribeApiActivity((count) => {
      activeCount = count

      
      if (count === 0) {
        if (timerId !== null) {
          window.clearTimeout(timerId)
          timerId = null
        }
        hasShown = false
        setIsVisible(false)
        return
      }

      if (!hasShown && timerId === null) {
        timerId = window.setTimeout(() => {
          timerId = null
          if (activeCount > 0) {
            hasShown = true
            setIsVisible(true)
          }
        }, SHOW_DELAY_MS)
      }
    })

    return () => {
      unsubscribe()
      if (timerId !== null) window.clearTimeout(timerId)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="api-loading-indicator" role="status" aria-live="polite">
      <span className="api-loading-indicator__spinner" aria-hidden="true" />
      <span>Cargando...</span>
    </div>
  )
}
