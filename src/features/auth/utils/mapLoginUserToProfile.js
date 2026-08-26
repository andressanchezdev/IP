import { defaultProfileSettings } from '@/features/profile/data/profileDefaults'
import { formatAddressDisplay, mapAboutAddresses } from './mapAboutAddresses'
import { mapAboutCredit } from './mapAboutCredit'

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

/**
 * Normaliza data.user del login a un objeto de cliente estable para la UI.
 */
export function mapLoginUserToClient(loginEmail, user) {
  const details = parseUsuarioDetails(user?.usuario)
  const email = text(user?.email) || text(loginEmail)
  const userId = text(user?.id_usuario ?? user?.id ?? user?.userId ?? details.token) || email
  const fullName = text(details.nombre) || text(user?.nombre) || email
  const documentId = text(details.cedula)
    || text(user?.cedula)
    || text(user?.documento)
    || text(details.documento)
  const phone = text(details.telefono)
    || text(details.tel)
    || text(details.phone)
    || text(user?.telefono)
    || text(user?.phone)
  const mobile = text(details.celular)
    || text(details.mobile)
    || text(user?.celular)
    || text(user?.mobile)
    || phone
  const role = text(user?.perfil) || text(user?.role)
  const warehouseId = text(user?.id_bodega ?? user?.warehouseId)
  const address = text(details.direccion)
    || text(details.address)
    || text(details.dir)
    || text(user?.direccion)
    || text(user?.address)

  return {
    userId,
    email,
    fullName,
    documentId,
    phone: phone || mobile,
    mobile: mobile || phone,
    role,
    warehouseId,
    birthDate: text(details.fecha),
    gender: text(details.genero),
    additional: text(details.adicional),
    address,
    neighborhood: text(details.barrio) || text(details.neighborhood),
    city: text(details.ciudad) || text(details.city),
    department: text(details.departamento) || text(details.department),
    country: text(details.pais) || text(details.country),
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
    // Direcciones siempre desde /users/about (no mezclar mocks ni lista local vieja).
    addresses: Array.isArray(apiProfile.addresses) ? apiProfile.addresses : [],
    credit: apiProfile.credit && typeof apiProfile.credit === 'object'
      ? apiProfile.credit
      : (previous.credit ?? defaultProfileSettings.credit),
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
    phone: personal.phone || personal.mobile,
    mobile: personal.mobile || personal.phone,
    role: personal.role,
    warehouseId: personal.warehouseId,
  }
}

/**
 * Respuesta de GET /api/v1/managment/users/about -> cliente UI.
 */
export function mapAboutUserToClient(aboutData, fallbackEmail = '') {
  const user = aboutData && typeof aboutData === 'object' ? aboutData : {}
  const usuario = parseUsuarioDetails(user?.usuario)
  const empresa = user?.empresa && typeof user.empresa === 'object' ? user.empresa : {}

  const email = text(user?.email) || text(fallbackEmail)
  const userId = text(user?.id_usuario ?? user?.id) || email
  const phone = text(usuario.telefono) || text(usuario.tel) || text(usuario.phone)
  const mobile = text(usuario.celular) || text(usuario.mobile) || phone
  const addresses = mapAboutAddresses(user, usuario)
  const primaryAddress = addresses[0]
  const credit = mapAboutCredit(user?.credito)
  const address = text(typeof usuario.direccion === 'string' ? usuario.direccion : '')
    || text(typeof user?.direccion === 'string' ? user.direccion : '')
    || formatAddressDisplay(primaryAddress)

  return {
    userId,
    email,
    fullName: text(usuario.nombre) || text(user?.nombre) || email,
    documentId: text(usuario.cedula) || text(usuario.documento) || text(user?.cedula),
    phone: phone || mobile,
    mobile: mobile || phone,
    role: text(user?.estado) || text(user?.perfil) || text(user?.role),
    warehouseId: text(user?.id_bodega ?? user?.warehouseId),
    birthDate: text(usuario.fecha),
    gender: text(usuario.genero),
    additional: text(usuario.adicional) || text(primaryAddress?.notes),
    address,
    neighborhood: text(usuario.barrio) || text(primaryAddress?.neighborhood),
    city: text(usuario.ciudad) || text(primaryAddress?.city),
    department: text(usuario.departamento) || text(primaryAddress?.department),
    country: text(usuario.pais) || text(primaryAddress?.country),
    companyName: text(empresa?.razon) || text(empresa?.nombre),
    companyNit: text(empresa?.nit),
    companyPhone: text(empresa?.celular) || text(empresa?.telefono) || text(empresa?.phone),
    companyAddress: text(empresa?.direccion) || text(empresa?.address),
    addresses,
    creditAvailable: credit.available,
    creditPaymentLimitDays: credit.paymentLimitDays,
    hasCredit: credit.hasCredit,
  }
}

/**
 * Cliente de /managment/users/about -> profileSettings.
 */
export function mapAboutUserToProfileSettings(aboutData, fallbackEmail = '') {
  const client = mapAboutUserToClient(aboutData, fallbackEmail)

  const personal = {
    ...defaultProfileSettings.personal,
    fullName: client.fullName,
    documentId: client.documentId,
    email: client.email,
    userId: client.userId,
    role: client.role,
    warehouseId: client.warehouseId,
    phone: client.phone,
    mobile: client.mobile,
    birthDate: client.birthDate,
    gender: client.gender,
    additional: client.additional,
    address: client.address,
    neighborhood: client.neighborhood,
    city: client.city,
    department: client.department,
    country: client.country,
  }

  return {
    ...defaultProfileSettings,
    personal,
    company: {
      ...defaultProfileSettings.company,
      name: client.companyName,
      nit: client.companyNit,
      email: client.email,
      phone: client.companyPhone,
      address: client.companyAddress,
    },
    access: {
      email: client.email,
      password: '',
    },
    addresses: client.addresses,
    credit: {
      available: client.creditAvailable,
      paymentLimitDays: client.creditPaymentLimitDays,
      hasCredit: client.hasCredit,
    },
  }
}
