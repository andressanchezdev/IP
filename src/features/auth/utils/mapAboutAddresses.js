/**
 * Extrae direcciones registradas desde GET /api/v1/managment/users/about.
 * API real: data.direccion[] con { pais, departamento, ciudad, barrio, direccion, adicional }.
 */

function text(value) {
  if (value == null) {
    return ''
  }
  return String(value).trim()
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

/** Línea legible para UI (checkout, perfil, entrega). */
export function formatAddressDisplay(entry) {
  if (!entry || typeof entry !== 'object') {
    return ''
  }
  return [
    entry.address,
    entry.neighborhood,
    entry.city,
    entry.department,
    entry.country,
  ].map(text).filter(Boolean).join(', ')
}

function pickAddressList(root) {
  if (!root || typeof root !== 'object') {
    return []
  }

  const candidates = [
    root.direccion,
    root.direcciones,
    root.addresses,
    root.dirs,
    root.usuario?.direccion,
    root.usuario?.direcciones,
    root.usuario?.addresses,
    root.data?.direccion,
    root.data?.direcciones,
    root.data?.addresses,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate
    }
  }

  return []
}

function mapAddressEntry(entry, index) {
  const row = asObject(entry)
  if (!row) {
    const line = text(entry)
    if (!line) {
      return null
    }
    return {
      id: `about-addr-${index + 1}`,
      label: `Dirección ${index + 1}`,
      address: line,
      neighborhood: '',
      city: '',
      department: '',
      country: '',
      postalCode: '',
      notes: '',
      source: 'about',
    }
  }

  const address = text(row.direccion)
    || text(row.address)
    || text(row.dir)
    || text(row.ubicacion)
  if (!address) {
    return null
  }

  const id = text(row.id_direccion)
    || text(row.id)
    || text(row.idDireccion)
    || `about-addr-${index + 1}`

  return {
    id,
    label: text(row.nombre) || text(row.label) || text(row.alias) || `Dirección ${index + 1}`,
    address,
    neighborhood: text(row.barrio) || text(row.neighborhood),
    city: text(row.ciudad) || text(row.city),
    department: text(row.departamento) || text(row.department),
    country: text(row.pais) || text(row.country),
    postalCode: text(row.codigo_postal) || text(row.postalCode) || text(row.zip),
    notes: text(row.notas) || text(row.notes) || text(row.adicional),
    source: 'about',
  }
}

/**
 * @param {object} aboutData - payload.data de users/about
 * @param {object} [usuario] - usuario ya parseado
 * @returns {{ id: string, label: string, address: string }[]}
 */
export function mapAboutAddresses(aboutData, usuario = {}) {
  const root = asObject(aboutData) || {}
  const userDetails = asObject(usuario) || asObject(root.usuario) || {}

  const fromList = pickAddressList({ ...root, usuario: userDetails })
    .map(mapAddressEntry)
    .filter(Boolean)

  if (fromList.length > 0) {
    return fromList.slice(0, 3)
  }

  const singleSource = userDetails.direccion ?? root.direccion ?? root.address
  if (Array.isArray(singleSource)) {
    return []
  }

  const single = text(singleSource) || text(userDetails.address)

  if (!single) {
    return []
  }

  return [{
    id: text(userDetails.id_direccion) || text(root.id_direccion) || 'about-primary',
    label: text(userDetails.nombre_direccion) || 'Dirección registrada',
    address: single,
    neighborhood: text(userDetails.barrio) || text(userDetails.neighborhood),
    city: text(userDetails.ciudad) || text(userDetails.city),
    department: text(userDetails.departamento) || text(userDetails.department),
    country: text(userDetails.pais) || text(userDetails.country),
    postalCode: text(userDetails.codigo_postal) || text(userDetails.postalCode),
    notes: text(userDetails.adicional) || text(userDetails.notas),
    source: 'about',
  }]
}
