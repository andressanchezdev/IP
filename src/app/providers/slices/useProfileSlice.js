import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { savePersistedState, clearAppCache } from '@/shared/lib/storage'
import {
  createEmptyProfileView,
  defaultProfileSettings,
} from '@/features/profile/data/profileDefaults'
import { getUserAbout } from '@/features/profile/api/profileApi'
import {
  mapAboutUserToProfileSettings,
  mergeApiProfileWithWorkspace,
} from '@/features/auth/utils/mapLoginUserToProfile'
import { clearApiAuthToken } from '@/shared/api'
import { clearAuthSession } from '@/features/auth/utils/authStorage'
import { APP_EVENTS } from '../appEvents'
import { PROFILE_SETTINGS_TTL, sanitizeProfileSettings } from '../helpers'

export function useProfileSlice({
  events,
  initialProfileSettings,
  tokenAccess,
  authEmail,
}) {
  const [profileSettings, setProfileSettings] = useState(() => initialProfileSettings)
  const [isLoadingAbout, setIsLoadingAbout] = useState(false)
  const [aboutError, setAboutError] = useState('')
  const warehouseIdRef = useRef(null)
  const aboutRequestRef = useRef(0)
  const aboutAbortRef = useRef(null)
  warehouseIdRef.current = profileSettings?.personal?.warehouseId ?? null

  useEffect(() => {
    savePersistedState(
      'profileSettings',
      sanitizeProfileSettings(profileSettings),
      PROFILE_SETTINGS_TTL,
    )
  }, [profileSettings])

  const profile = useMemo(() => ({
    ...createEmptyProfileView(profileSettings),
    id: profileSettings.personal.userId,
    fullName: profileSettings.personal.fullName,
    documentId: profileSettings.personal.documentId,
    email: profileSettings.personal.email || profileSettings.access?.email || '',
    phone: profileSettings.personal.phone || profileSettings.personal.mobile || '',
    mobile: profileSettings.personal.mobile || profileSettings.personal.phone || '',
    status: profileSettings.personal.role || '',
    addresses: profileSettings.addresses ?? [],
  }), [profileSettings])

  const saveProfilePersonal = useCallback((personal) => {
    setProfileSettings((current) => ({ ...current, personal }))
  }, [])

  const saveProfileCompany = useCallback((company) => {
    setProfileSettings((current) => ({ ...current, company }))
  }, [])

  const saveProfileAccess = useCallback((access) => {
    setProfileSettings((current) => ({ ...current, access }))
  }, [])

  const setNotificationsEnabled = useCallback((notificationsEnabled) => {
    setProfileSettings((current) => ({ ...current, notificationsEnabled }))
  }, [])

  const loadProfileFromAboutApi = useCallback(async () => {
    const token = tokenAccess
    if (!token) {
      return { success: false, error: 'Sesión requerida', needsAuth: true }
    }

    const requestId = aboutRequestRef.current + 1
    aboutRequestRef.current = requestId
    aboutAbortRef.current?.abort()
    const controller = new AbortController()
    aboutAbortRef.current = controller
    setIsLoadingAbout(true)
    setAboutError('')

    try {
      const response = await getUserAbout({ token, signal: controller.signal })
      if (aboutRequestRef.current !== requestId) {
        return { success: false, stale: true }
      }
      const apiProfile = mapAboutUserToProfileSettings(response.data, authEmail || '')
      setProfileSettings((current) => mergeApiProfileWithWorkspace(apiProfile, current))
      return { success: true, profileSettings: apiProfile }
    } catch (error) {
      if (controller.signal.aborted) {
        return { success: false, aborted: true }
      }
      const message = error?.message || 'No se pudo cargar el perfil'
      if (aboutRequestRef.current === requestId) {
        setAboutError(message)
      }
      return { success: false, error: message }
    } finally {
      if (aboutRequestRef.current === requestId) {
        setIsLoadingAbout(false)
      }
      if (aboutAbortRef.current === controller) {
        aboutAbortRef.current = null
      }
    }
  }, [tokenAccess, authEmail])

  const releaseAppCache = useCallback(() => {
    clearAppCache()
    events.emit(APP_EVENTS.CACHE_RELEASED)
  }, [events])

  const MAX_ADDRESSES = 3

  const addAddress = useCallback((address) => {
    setProfileSettings((current) => {
      const list = current.addresses ?? []
      if (list.length >= MAX_ADDRESSES) {
        return current
      }
      return { ...current, addresses: [...list, address] }
    })
  }, [])

  const removeAddress = useCallback((index) => {
    setProfileSettings((current) => {
      const list = current.addresses ?? []
      return { ...current, addresses: list.filter((_, i) => i !== index) }
    })
  }, [])

  const deleteAccount = useCallback(() => {
    clearAppCache()
    clearApiAuthToken()
    clearAuthSession()
    savePersistedState('profileSettings', defaultProfileSettings, PROFILE_SETTINGS_TTL)
    setProfileSettings(defaultProfileSettings)
    events.emit(APP_EVENTS.ACCOUNT_DELETED)
  }, [events])

  const value = useMemo(() => ({
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    isLoadingAbout,
    aboutError,
    loadProfileFromAboutApi,
    addAddress,
    removeAddress,
    releaseAppCache,
    deleteAccount,
  }), [
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    isLoadingAbout,
    aboutError,
    loadProfileFromAboutApi,
    addAddress,
    removeAddress,
    releaseAppCache,
    deleteAccount,
  ])

  return {
    profile,
    profileSettings,
    setProfileSettings,
    warehouseIdRef,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
    isLoadingAbout,
    aboutError,
    loadProfileFromAboutApi,
    addAddress,
    removeAddress,
    releaseAppCache,
    deleteAccount,
    value,
  }
}
