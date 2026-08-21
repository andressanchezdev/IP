import { useEffect } from 'react'
import { clearExpiredStorage } from '@/shared/lib/storage'

const CLEAN_INTERVAL_MS = 60_000

export function useExpiredStorageCleaner() {
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      clearExpiredStorage()
    }, CLEAN_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [])
}
