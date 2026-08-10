import profileAvatar from '../../../assets/logos/icon.ico'

export const defaultProfileSettings = {
  personal: {
    fullName: 'Carlos Mendoza Ruiz',
    documentId: '1012345678',
    phone: '3001234567',
    email: 'carlos.mendoza@importadorapremium.com',
    userId: 'USR-10482',
  },
  company: {
    name: 'Importadora Premium SAS',
    nit: '900123456-1',
    phone: '6011234567',
    email: 'contacto@importadorapremium.com',
    address: 'Calle 45 #12-34, Bogotá',
  },
  access: {
    email: 'carlos.mendoza@importadorapremium.com',
    password: 'Premium2026',
  },
  notificationsEnabled: true,
}

export const mockProfile = {
  id: defaultProfileSettings.personal.userId,
  fullName: defaultProfileSettings.personal.fullName,
  avatar: profileAvatar,
  status: 'VIP',
  priceList: [
    { label: 'Lista general', items: 128 },
    { label: 'Lista mayorista', items: 86 },
    { label: 'Lista promocional', items: 42 },
  ],
  adeudos: 125000,
  credito: 500000,
  descuentos: 15000,
  compras: 24,
  saldoFavor: 45000,
  addresses: [
    { id: 'DIR-01', label: 'Principal', address: 'Calle 45 #12-34, Bogotá' },
    { id: 'DIR-02', label: 'Bodega', address: 'Av. Industrial 88, Funza' },
  ],
}

export const PROFILE_LEGAL_LINKS = {
  terms: 'https://www.importadorapremium.com/assets/content/docs/Terminos%20y%20Condiciones.pdf',
  privacy: 'https://www.importadorapremium.com/assets/content/docs/Privacidad%20y%20Proteccion%20de%20datos.pdf',
}
