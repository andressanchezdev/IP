const NOISE = new Set([
  'a',
  'al',
  'con',
  'como',
  'cual',
  'cuando',
  'de',
  'del',
  'el',
  'en',
  'es',
  'esta',
  'este',
  'hay',
  'la',
  'las',
  'lo',
  'los',
  'mas',
  'me',
  'mi',
  'muy',
  'o',
  'para',
  'por',
  'puedo',
  'que',
  'se',
  'su',
  'te',
  'un',
  'una',
  'y',
  'yo',
  'informacion',
  'info',
  'quiero',
  'necesito',
  'muestrame',
  'muestra',
  'ver',
  'dame',
  'sobre',
  'favor',
])

export function stripAccents(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeQuery(raw: string) {
  const cleaned = stripAccents(raw.toLowerCase())
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return []

  return cleaned.split(' ').filter((token) => token.length > 1 && !NOISE.has(token))
}
