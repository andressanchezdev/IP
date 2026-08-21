import { useEffect } from 'react'
import { persistUserWorkspace } from '@/features/auth/utils/userWorkspace'

export function usePersistUserWorkspace(userId, profileSettings) {
  useEffect(() => {
    if (!userId) {
      return
    }

    persistUserWorkspace(userId, { profileSettings })
  }, [userId, profileSettings])
}
