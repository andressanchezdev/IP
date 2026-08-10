import profileAvatar from '@/assets/logos/icon.ico'

/** Empty profile shape — campos alineados a POST /auth/login → data.user (+ usuario JSON). */
export const defaultProfileSettings = {
  personal: {
    fullName: '',
    documentId: '',
    phone: '',
    mobile: '',
    email: '',
    userId: '',
    role: '',
    warehouseId: '',
    birthDate: '',
    gender: '',
    additional: '',
    address: '',
    neighborhood: '',
    city: '',
    department: '',
    country: '',
  },
  company: {
    name: '',
    nit: '',
    phone: '',
    email: '',
    address: '',
  },
  access: {
    email: '',
    password: '',
  },
  notificationsEnabled: true,
  addresses: [],
}

export function createEmptyProfileView(profileSettings = defaultProfileSettings) {
  const personal = profileSettings.personal ?? defaultProfileSettings.personal

  return {
    id: personal.userId || '',
    fullName: personal.fullName || '',
    documentId: personal.documentId || '',
    mobile: personal.mobile || personal.phone || '',
    phone: personal.phone || '',
    avatar: profileAvatar,
    status: personal.role || '',
    priceList: [],
    adeudos: 0,
    credito: 0,
    descuentos: 0,
    compras: 0,
    saldoFavor: 0,
    addresses: profileSettings.addresses ?? [],
  }
}

export const PROFILE_LEGAL_LINKS = {
  terms: 'https://www.importadorapremium.com/assets/content/docs/Terminos%20y%20Condiciones.pdf',
  privacy: 'https://www.importadorapremium.com/assets/content/docs/Privacidad%20y%20Proteccion%20de%20datos.pdf',
}
