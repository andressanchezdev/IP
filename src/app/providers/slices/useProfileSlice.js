import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { savePersistedState, clearAppCache } from '@/shared/lib/storage'
import {
  createEmptyProfileView,
  defaultProfileSettings,
} from '@/features/profile/data/profileDefaults'
import { clearApiAuthToken } from '@/shared/api'
import { clearAuthSession } from '@/features/auth/utils/authStorage'
import { APP_EVENTS } from '../appEvents'
import { PROFILE_SETTINGS_TTL, sanitizeProfileSettings } from '../helpers'

export function useProfileSlice({
  events,
  initialProfileSettings,
}) {
  const [profileSettings, setProfileSettings] = useState(() => initialProfileSettings)
  const warehouseIdRef = useRef(null)
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

  const releaseAppCache = useCallback(() => {
    clearAppCache()
    events.emit(APP_EVENTS.CACHE_RELEASED)
  }, [events])

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
    releaseAppCache,
    deleteAccount,
  }), [
    profile,
    profileSettings,
    saveProfilePersonal,
    saveProfileCompany,
    saveProfileAccess,
    setNotificationsEnabled,
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
    releaseAppCache,
    deleteAccount,
    value,
  }
}
