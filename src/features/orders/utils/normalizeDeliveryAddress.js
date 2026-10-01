const ADDRESS_PREFIXES = {
  cr: 'Carrera',
  cra: 'Carrera',
  kra: 'Carrera',
  kr: 'Carrera',
  cl: 'Calle',
  cll: 'Calle',
  calle: 'Calle',
  av: 'Avenida',
  avd: 'Avenida',
  avenida: 'Avenida',
  trans: 'Transversal',
  transv: 'Transversal',
  tv: 'Transversal',
  diagonal: 'Diagonal',
  diag: 'Diagonal',
}

function toTitleCase(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\b[a-záéíóúüñ]+\b/g, (word) => {
      const mapped = word === 'de' || word === 'del' || word === 'la' || word === 'las' || word === 'los'
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
      return mapped
    })
    .replace(/\bDe\b/g, 'de')
    .replace(/\bDel\b/g, 'del')
    .replace(/\bLa\b/g, 'la')
    .replace(/\bLas\b/g, 'las')
    .replace(/\bLos\b/g, 'los')
}

function normalizeSegment(segment = '') {
  const raw = String(segment ?? '').trim()
  if (!raw) {
    return ''
  }

  const replaced = raw.replace(/^(cr|cra|kra|kr|cl|cll|calle|av|avd|avenida|trans|transv|tv|diag|diagonal)\b/i, (match) => {
    const key = match.toLowerCase()
    return ADDRESS_PREFIXES[key] || match
  })

  return toTitleCase(replaced)
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeDeliveryAddressForApi(value) {
  const text = String(value ?? '').trim()
  if (!text) {
    return ''
  }

  const parts = text
    .split(',')
    .map((segment) => normalizeSegment(segment))
    .filter(Boolean)

  if (parts.length === 0) {
    return text
  }

  const [street, ...rest] = parts
  const normalizedStreet = street
    .replace(/\s*#\s*/g, ' #')
    .replace(/\s+/g, ' ')
    .trim()

  const normalizedRest = rest.map((segment) => segment.trim()).filter(Boolean)
  const combined = [normalizedStreet, ...normalizedRest]
  return combined.join(', ')
}
