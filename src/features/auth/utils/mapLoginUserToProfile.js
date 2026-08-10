import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'

function text(value) {
  if (value == null) {
    return ''
  }
  return String(value).trim()
}

/** `user.usuario` viene como JSON string en POST /api/v1/auth/login. */
export function parseUsuarioDetails(usuario) {
  if (!usuario) {
    return {}
  }

  if (typeof usuario === 'object' && !Array.isArray(usuario)) {
    return usuario
  }

  if (typeof usuario !== 'string') {
    return {}
  }

  const trimmed = usuario.trim()
  if (!trimmed) {
    return {}
  }

  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function buildAddressLine(personal) {
  return [
    personal.address,
    personal.neighborhood,
    personal.city,
    personal.department,
    personal.country,
  ]
    .map(text)
    .filter(Boolean)
    .join(', ')
}

/**
 * Normaliza data.user del login a un objeto de cliente estable para la UI.
 */
export function mapLoginUserToClient(loginEmail, user) {
  const details = parseUsuarioDetails(user?.usuario)
  const email = text(user?.email) || text(loginEmail)
  const userId = text(user?.id_usuario ?? user?.id ?? user?.userId ?? details.token) || email
  const fullName = text(details.nombre) || text(user?.nombre) || email
  const documentId = text(details.cedula) || text(user?.cedula) || text(user?.documento)
  const phone = text(details.telefono) || text(user?.telefono)
  const mobile = text(details.celular) || text(user?.celular) || phone
  const role = text(user?.perfil) || text(user?.role)
  const warehouseId = text(user?.id_bodega ?? user?.warehouseId)

  return {
    userId,
    email,
    fullName,
    documentId,
    phone,
    mobile,
    role,
    warehouseId,
    birthDate: text(details.fecha),
    gender: text(details.genero),
    additional: text(details.adicional),
    address: text(details.direccion),
    neighborhood: text(details.barrio),
    city: text(details.ciudad),
    department: text(details.departamento),
    country: text(details.pais),
  }
}

/**
 * Cliente normalizado → profileSettings de la app.
 */
export function mapLoginUserToProfileSettings(loginEmail, user) {
  const client = mapLoginUserToClient(loginEmail, user)

  const personal = {
    ...defaultProfileSettings.personal,
    fullName: client.fullName,
    documentId: client.documentId,
    phone: client.phone,
    mobile: client.mobile,
    email: client.email,
    userId: client.userId,
    role: client.role,
    warehouseId: client.warehouseId,
    birthDate: client.birthDate,
    gender: client.gender,
    additional: client.additional,
    address: client.address,
    neighborhood: client.neighborhood,
    city: client.city,
    department: client.department,
    country: client.country,
  }

  const addressLine = buildAddressLine(personal)

  return {
    ...defaultProfileSettings,
    personal,
    company: {
      ...defaultProfileSettings.company,
      email: client.email,
      phone: client.mobile || client.phone,
      address: addressLine,
    },
    access: {
      email: client.email,
      password: '',
    },
    addresses: addressLine
      ? [{
          id: 'principal',
          label: 'Dirección principal',
          address: addressLine,
        }]
      : [],
  }
}

/** Une perfil API con workspace local: datos personales siempre desde login. */
export function mergeApiProfileWithWorkspace(apiProfile, workspaceProfile) {
  const previous = workspaceProfile && typeof workspaceProfile === 'object'
    ? workspaceProfile
    : defaultProfileSettings

  return {
    ...previous,
    ...apiProfile,
    personal: {
      ...defaultProfileSettings.personal,
      ...previous.personal,
      ...apiProfile.personal,
    },
    company: {
      ...previous.company,
      ...apiProfile.company,
      name: text(previous.company?.name) || text(apiProfile.company?.name),
      nit: text(previous.company?.nit) || text(apiProfile.company?.nit),
      address: text(apiProfile.company?.address) || text(previous.company?.address),
      phone: text(apiProfile.company?.phone) || text(previous.company?.phone),
      email: text(apiProfile.company?.email) || text(previous.company?.email),
    },
    access: {
      ...previous.access,
      email: apiProfile.access?.email || previous.access?.email || '',
      password: previous.access?.password || '',
    },
    addresses: Array.isArray(apiProfile.addresses) && apiProfile.addresses.length > 0
      ? apiProfile.addresses
      : (Array.isArray(previous.addresses) ? previous.addresses : []),
    notificationsEnabled: previous.notificationsEnabled ?? apiProfile.notificationsEnabled,
  }
}

/** Resumen liviano para authSession / useAuth.user */
export function toAuthUserSummary(profileSettings) {
  const personal = {
    ...defaultProfileSettings.personal,
    ...(profileSettings?.personal || {}),
  }

  return {
    id: personal.userId,
    userId: personal.userId,
    email: personal.email,
    fullName: personal.fullName,
    documentId: personal.documentId,
    phone: personal.phone,
    mobile: personal.mobile || personal.phone,
    role: personal.role,
    warehouseId: personal.warehouseId,
  }
}
