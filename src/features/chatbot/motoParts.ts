import { liveLexiconList, liveLexiconMap, liveLexiconSet } from './botip/liveData'

/** Piezas publicadas en el catálogo del landing. */
export const CATALOG_PART_TERMS = [
  'aceite',
  'amortiguador',
  'barras',
  'correa',
  'corona',
  'disco',
  'eje',
  'freno',
  'llanta',
  'mordaza',
  'pastilla',
  'pastillas',
  'pinon',
  'ramal',
  'rin',
  'rinaspa',
  'suspension',
  'transmision',
] as const

/** Repuestos habituales de moto que no tienen ficha en el catálogo publicado. */
export const OTHER_PART_TERMS = [
  'alternador',
  'arbol',
  'arrastre',
  'asiento',
  'balata',
  'banda',
  'bandas',
  'bateria',
  'biela',
  'bobina',
  'bomba',
  'bujia',
  'cable',
  'cadena',
  'carburador',
  'carenado',
  'cdi',
  'chicote',
  'ciguenal',
  'cilindro',
  'clutch',
  'culata',
  'direccional',
  'embrague',
  'empaque',
  'escape',
  'espejo',
  'estribo',
  'estator',
  'faro',
  'filtro',
  'fusible',
  'guardafango',
  'horquilla',
  'inyector',
  'junta',
  'leva',
  'liquido',
  'manillar',
  'motor',
  'pedal',
  'piston',
  'radiador',
  'refrigerante',
  'regulador',
  'relay',
  'reten',
  'rodamiento',
  'silenciador',
  'sillin',
  'sprocket',
  'switch',
  'tanque',
  'telescopio',
  'tensor',
  'valvula',
  'zapata',
] as const

export const ACCESSORY_TERMS = [
  'accesorio',
  'accesorios',
  'alforja',
  'antirrobo',
  'baul',
  'botas',
  'candado',
  'casco',
  'chamarra',
  'coderas',
  'funda',
  'grip',
  'guante',
  'guantes',
  'impermeable',
  'intercom',
  'intercomunicador',
  'llavero',
  'maletero',
  'parabrisas',
  'rodillera',
  'sliders',
  'soporte',
] as const

export const GENERIC_PART_TOKENS = ['repuesto', 'repuestos', 'pieza', 'piezas', 'accesorio', 'accesorios'] as const
const GENERIC = new Set<string>(GENERIC_PART_TOKENS)

/** Pronombres y posesivos: no deben casar con piezas (sus → suspensión). */
export const WEAK_LEXEMES = new Set([
  'su',
  'sus',
  'tu',
  'tus',
  'mi',
  'mis',
  'me',
  'te',
  'nos',
  'les',
  'nuestro',
  'nuestra',
  'nuestros',
  'nuestras',
  'vuestro',
  'vuestra',
  'con',
  'sin',
  'por',
  'para',
  'una',
  'uno',
  'unos',
  'unas',
  'las',
  'los',
  'del',
  'al',
])

export const PART_ALIASES: Record<string, string> = {
  acesorio: 'accesorio',
  accesorio: 'accesorio',
  accesorios: 'accesorio',
  acsesorio: 'accesorio',
  amortiguadores: 'amortiguador',
  balatas: 'balata',
  banda: 'banda',
  bandas: 'banda',
  baterias: 'bateria',
  caliper: 'mordaza',
  calipers: 'mordaza',
  bujias: 'bujia',
  cadenas: 'cadena',
  candados: 'candado',
  casci: 'casco',
  cascos: 'casco',
  casko: 'casco',
  coronas: 'corona',
  ejes: 'eje',
  filtros: 'filtro',
  frenos: 'freno',
  guantes: 'guante',
  llantas: 'llanta',
  pastiya: 'pastilla',
  pastiyas: 'pastilla',
  pinhon: 'pinon',
  pignon: 'pinon',
  pinones: 'pinon',
  ramales: 'ramal',
  barra: 'barras',
  barrras: 'barras',
  baraas: 'barras',
  barrrs: 'barras',
  barrs: 'barras',
  barrra: 'barras',
  repuesto: 'repuesto',
  repuestos: 'repuesto',
  ripuesto: 'repuesto',
  rines: 'rin',
  tambor: 'banda',
  zapatas: 'zapata',
  suspencion: 'suspension',
  yanta: 'llanta',
  yantas: 'llanta',
  llantra: 'llanta',
  llantras: 'llanta',
}

export const MOTO_TERMS = [...CATALOG_PART_TERMS, ...OTHER_PART_TERMS, ...ACCESSORY_TERMS, 'repuesto']

export function liveCatalogParts() {
  return liveLexiconList('catalogParts', CATALOG_PART_TERMS)
}

export function liveOtherParts() {
  return liveLexiconList('otherParts', OTHER_PART_TERMS)
}

export function liveAccessoryTerms() {
  return liveLexiconList('accessories', ACCESSORY_TERMS)
}

export function liveWeakLexemes() {
  return liveLexiconSet('weakLexemes', WEAK_LEXEMES)
}

export function livePartAliases() {
  return liveLexiconMap('partAliases', PART_ALIASES)
}

export function liveGenericTokens() {
  return liveLexiconSet('genericTokens', GENERIC)
}

export function liveMotoTerms() {
  return [...new Set([...liveCatalogParts(), ...liveOtherParts(), ...liveAccessoryTerms(), 'repuesto'])]
}

function matchesTerm(token: string, term: string) {
  if (token.length < 3 || liveWeakLexemes().has(token)) return false
  if (token === term) return true
  if (token === `${term}s` || term === `${token}s`) return true
  if (token === `${term}es` || term === `${token}es`) return true
  const shorter = token.length <= term.length ? token : term
  const longer = token.length <= term.length ? term : token
  const diff = Math.abs(token.length - term.length)
  if (shorter.length >= 5 && diff <= 1 && longer.startsWith(shorter)) return true
  return false
}

export function findTerm(tokens: readonly string[], terms: readonly string[]) {
  for (const token of tokens) {
    if (liveGenericTokens().has(token)) continue
    const hit = terms.find((term) => matchesTerm(token, term))
    if (hit) return hit
  }
  return ''
}

export function partStem(value: string) {
  const plain = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .find((word) => word.length > 3) || value.toLowerCase()
  if (plain.endsWith('s') && plain.length > 4) return plain.slice(0, -1)
  return plain
}

export type ResolvedPart = {
  id: string
  label: string
  ambiguous: boolean
}

function foldWord(value: string) {
  const plain = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return livePartAliases()[plain] || plain
}

function hasWord(tokens: readonly string[], term: string) {
  return tokens.some((token) => matchesTerm(foldWord(token), term) || foldWord(token) === term)
}

/** Familia concreta: pastilla ≠ banda ≠ disco, aunque todas lleven “freno”. */
export function resolvePartFamily(tokens: readonly string[]): ResolvedPart | null {
  const useful = tokens.map(foldWord).filter((token) => token.length > 2 && !liveWeakLexemes().has(token) && !liveGenericTokens().has(token))
  if (!useful.length) return null

  const has = (term: string) => hasWord(useful, term)
  const brakeCue = has('freno')
  const tireCue = has('llanta') || has('rodadura')

  if (has('pastilla')) return { id: 'pastilla_freno', label: 'pastillas de freno', ambiguous: false }
  if (has('zapata') || has('balata') || (has('banda') && (brakeCue || !tireCue) && !has('rodadura'))) {
    return { id: 'banda_freno', label: 'bandas de freno', ambiguous: false }
  }
  if (has('disco')) return { id: 'disco_freno', label: 'discos de freno', ambiguous: false }
  if (has('mordaza')) return { id: 'mordaza_freno', label: 'mordaza de freno', ambiguous: false }
  if (has('rin') || has('rinaspa')) return { id: 'rin', label: 'rines', ambiguous: false }
  if (brakeCue) return { id: 'freno', label: 'freno', ambiguous: true }

  const catalog = findTerm(useful, liveCatalogParts())
  if (catalog && catalog !== 'freno' && catalog !== 'disco' && catalog !== 'pastilla' && catalog !== 'pastillas' && catalog !== 'rin' && catalog !== 'rinaspa') {
    return { id: partStem(catalog), label: catalog, ambiguous: false }
  }
  const other = findTerm(useful, liveOtherParts())
  if (other && other !== 'banda' && other !== 'bandas' && other !== 'balata' && other !== 'zapata') {
    return { id: partStem(other), label: other, ambiguous: false }
  }
  const accessory = findTerm(useful, liveAccessoryTerms())
  if (accessory) return { id: partStem(accessory), label: accessory, ambiguous: false }
  return catalog ? { id: partStem(catalog), label: catalog, ambiguous: catalog === 'freno' } : null
}

export function listPartFamilies(tokens: readonly string[]): ResolvedPart[] {
  const found: ResolvedPart[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    const hit = resolvePartFamily([token])
    if (!hit || hit.ambiguous || seen.has(hit.id)) continue
    seen.add(hit.id)
    found.push(hit)
  }
  if (found.some((item) => item.id.endsWith('_freno'))) {
    return found.filter((item) => item.id !== 'freno')
  }
  return found
}

export function familyOfText(text: string) {
  const tokens = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return resolvePartFamily(tokens)
}
