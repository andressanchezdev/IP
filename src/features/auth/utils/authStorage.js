import { loadPersistedState, savePersistedState } from '../../../utils/storage'
import { defaultProfileSettings } from '../../landing/data/mockProfile'

const AUTH_SESSION_TTL = 30 * 24 * 60 * 60 * 1000
const AUTH_SESSION_SHORT_TTL = 8 * 60 * 60 * 1000
const REGISTERED_USERS_TTL = 365 * 24 * 60 * 60 * 1000

const DEFAULT_USER = {
  username: defaultProfileSettings.access.email,
  password: defaultProfileSettings.access.password,
  profile: defaultProfileSettings,
}

function normalizeUsername(value) {
  return value.trim().toLowerCase()
}

function createNextUserId(users) {
  const ids = [
    defaultProfileSettings.personal.userId,
    ...users.map((entry) => entry.profile?.personal?.userId),
  ]
  const highestId = ids.reduce((highest, id) => {
    const numericId = Number(String(id ?? '').replace(/\D/g, ''))
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest
  }, 0)

  return `USR-${String(highestId + 1).padStart(5, '0')}`
}

export function loadAuthSession() {
  const session = loadPersistedState('authSession', null)

  if (!session?.username) {
    return null
  }

  if (session.userId) {
    return session
  }

  const credentials = findUserCredentials(session.username)
  if (!credentials?.profile?.personal?.userId) {
    return session
  }

  return {
    ...session,
    userId: credentials.profile.personal.userId,
  }
}

export function saveAuthSession(session, rememberMe = false) {
  const ttl = rememberMe ? AUTH_SESSION_TTL : AUTH_SESSION_SHORT_TTL
  savePersistedState('authSession', session, ttl)
}

export function clearAuthSession() {
  savePersistedState('authSession', null, 1000)
}

export function loadRegisteredUsers() {
  return loadPersistedState('registeredUsers', [])
}

export function saveRegisteredUsers(users) {
  savePersistedState('registeredUsers', users, REGISTERED_USERS_TTL)
}

export function findUserCredentials(username) {
  const normalized = normalizeUsername(username)
  const registered = loadRegisteredUsers().find(
    (entry) => normalizeUsername(entry.username) === normalized,
  )

  if (registered) {
    return registered
  }

  if (normalizeUsername(DEFAULT_USER.username) === normalized) {
    return DEFAULT_USER
  }

  return null
}

export function registerUser(userData) {
  const users = loadRegisteredUsers()
  const normalized = normalizeUsername(userData.email)

  if (users.some((entry) => normalizeUsername(entry.username) === normalized)) {
    return { success: false, error: 'El correo ya está registrado' }
  }

  const isCompany = userData.accountType === 'company'
  const userId = createNextUserId(users)

  const profile = {
    accountType: isCompany ? 'company' : 'natural',
    personal: {
      fullName: userData.fullName.trim(),
      documentId: userData.documentId.trim(),
      phone: userData.phone.trim(),
      email: userData.email.trim(),
      userId,
    },
    company: {
      name: isCompany ? userData.companyName.trim() : '',
      nit: isCompany ? userData.nit.trim() : '',
      phone: isCompany ? userData.phone.trim() : '',
      email: isCompany ? userData.email.trim() : '',
      address: '',
    },
    access: {
      email: userData.email.trim(),
      password: userData.password,
    },
    notificationsEnabled: true,
  }

  const entry = {
    username: userData.email.trim(),
    password: userData.password,
    profile,
  }

  saveRegisteredUsers([...users, entry])
  return { success: true, user: entry }
}
