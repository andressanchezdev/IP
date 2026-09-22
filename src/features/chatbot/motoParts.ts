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
  'bieleta',
  'bobina',
  'bomba',
  'botella',
  'bujia',
  'cable',
  'cadena',
  'campana',
  'carburador',
  'carenado',
  'cdi',
  'chiclero',
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
  'espiral',
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
  'manguera',
  'manillar',
  'motor',
  'pedal',
  'piston',
  'radiador',
  'refrigerante',
  'regulador',
  'relay',
  'resorte',
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
  amortiguacion: 'amortiguador',
  amortiguadro: 'amortiguador',
  aceitico: 'aceite',
  bacheador: 'amortiguador',
  bacheadores: 'amortiguador',
  bacheadro: 'amortiguador',
  monoshock: 'amortiguador',
  shocks: 'amortiguador',
  shock: 'amortiguador',
  balatas: 'balata',
  banda: 'banda',
  bandas: 'banda',
  baterias: 'bateria',
  cachucha: 'casco',
  chiclero: 'carburador',
  chicleros: 'carburador',
  caliper: 'mordaza',
  calipers: 'mordaza',
  campanas: 'campana',
  campana: 'campana',
  tambores: 'banda',
  resortes: 'resorte',
  espirales: 'espiral',
  botellas: 'botella',
  bieletas: 'bieleta',
  mangueras: 'manguera',
  retenes: 'reten',
  bujias: 'bujia',
  cadenas: 'cadena',
  candados: 'candado',
  casci: 'casco',
  cascos: 'casco',
  casko: 'casco',
  carena: 'carenado',
  carenaje: 'carenado',
  carenajes: 'carenado',
  carenados: 'carenado',
  carenage: 'carenado',
  carenajez: 'carenado',
  coronas: 'corona',
  ejes: 'eje',
  filtros: 'filtro',
  frenos: 'freno',
  guantes: 'guante',
  llantas: 'llanta',
  llantica: 'llanta',
  llanticas: 'llanta',
  guaya: 'banda',
  guayas: 'banda',
  pasta: 'pastilla',
  pastas: 'pastilla',
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
  tijeras: 'barras',
  tijera: 'barras',
  repuesto: 'repuesto',
  repuestos: 'repuesto',
  ripuesto: 'repuesto',
  rines: 'rin',
  rinspa: 'rin',
  rinaspa: 'rin',
  tambor: 'banda',
  zapatas: 'zapata',
  suspencion: 'suspension',
  suspencionn: 'suspension',
  yanta: 'llanta',
  yantas: 'llanta',
  llantra: 'llanta',
  llantras: 'llanta',
  neumatico: 'llanta',
  caucho: 'llanta',
  pila: 'bateria',
  suiche: 'switch',
  suiches: 'switch',
  pad: 'pastilla',
  pads: 'pastilla',
  rotor: 'disco',
  pinza: 'mordaza',
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
  return { ...PART_ALIASES, ...liveLexiconMap('partAliases', PART_ALIASES) }
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
    const folded = foldWord(token)
    const hit = terms.find((term) => matchesTerm(folded, term) || matchesTerm(token, term))
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

export const POSITION_WORDS = new Set([
  'trasero',
  'trasera',
  'traseros',
  'traseras',
  'delantero',
  'delantera',
  'delanteros',
  'delanteras',
  'izquierdo',
  'izquierda',
  'derecho',
  'derecha',
  'superior',
  'inferior',
  'adelante',
  'atras',
  'arriba',
  'abajo',
])

const FRONT_POSITION = new Set(['delantero', 'delantera', 'delanteros', 'delanteras', 'adelante'])
const REAR_POSITION = new Set(['trasero', 'trasera', 'traseros', 'traseras', 'atras'])
const LEFT_POSITION = new Set(['izquierdo', 'izquierda'])
const RIGHT_POSITION = new Set(['derecho', 'derecha'])

const POSITION_VARIANT_STEMS = new Set([
  'campana',
  'amortiguador',
  'pastilla',
  'banda',
  'disco',
  'faro',
  'direccional',
  'espejo',
  'mordaza',
  'pinza',
  'manguera',
  'guaya',
  'reten',
  'llanta',
  'rin',
  'guardafango',
  'bomba',
  'barra',
  'botella',
])

const LATERAL_POSITION_STEMS = new Set(['espejo', 'direccional'])

export const PURCHASE_VERBS = new Set([
  'comprar',
  'compra',
  'compro',
  'compramos',
  'pedir',
  'pido',
  'pide',
  'pedimos',
  'necesito',
  'necesita',
  'necesitamos',
  'busco',
  'busca',
  'buscar',
  'buscando',
  'tienen',
  'venden',
  'vendo',
  'manejan',
  'consigo',
  'consigues',
  'consigue',
  'conseguir',
  'quiero',
  'queremos',
  'quisiera',
  'adquirir',
  'adquiero',
  'cotizar',
  'cotizo',
  'cotizas',
  'interesa',
  'interesado',
  'interesada',
  'gustaria',
  'muestras',
  'mostrar',
  'muestrame',
])

const MODEL_BLOCK = new Set([
  'mono',
  'shock',
  'shocks',
  'moto',
  'motos',
  'motocicleta',
  'motocicletas',
  'carro',
  'carros',
  'vehiculo',
  'vehiculos',
  'para',
  'par',
  'una',
  'uno',
  'unos',
  'unas',
  ...POSITION_WORDS,
  ...PURCHASE_VERBS,
])

export function isPositionToken(token: string) {
  return POSITION_WORDS.has(foldWord(token))
}

export function isPurchaseVerbToken(token: string) {
  return PURCHASE_VERBS.has(foldWord(token))
}

export function isModelBlockToken(token: string) {
  return MODEL_BLOCK.has(foldWord(token))
}

export function hasProductObject(tokens: readonly string[]) {
  if (resolvePartFamily(tokens)) return true
  return tokens.some((token) => {
    const folded = foldWord(token)
    if (folded.length < 3) return false
    if (isPurchaseVerbToken(folded) || isPositionToken(folded) || isModelBlockToken(folded)) return false
    if (liveWeakLexemes().has(folded)) return false
    return true
  })
}

export function hasPurchaseOrPartIntent(tokens: readonly string[], raw = '') {
  if (resolvePartFamily(tokens)) return true
  if (listPartFamilies(tokens).length) return true
  if (tokens.some((token) => isPurchaseVerbToken(token))) return true
  const blob = foldWord(`${tokens.join(' ')} ${raw}`)
  if (/\bcampana/.test(blob) || /\bmonoshock\b|\bmono[\s-]?shock\b/.test(blob)) return true
  return false
}

export function positionsInText(raw: string) {
  const blob = foldWord(raw)
  const words = blob.split(/[^a-z0-9]+/).filter(Boolean)
  const found: string[] = []
  const push = (word: string) => {
    if (!word || found.includes(word)) return
    found.push(word)
  }
  for (const word of words) {
    if (POSITION_WORDS.has(word)) push(word)
  }
  if (/\bde adelante\b/.test(blob) || /\badelante\b/.test(blob)) push('delantero')
  if (/\bde atras\b/.test(blob) || /\batras\b/.test(blob)) push('trasero')
  if (/\bde arriba\b/.test(blob)) push('superior')
  if (/\bde abajo\b/.test(blob)) push('inferior')
  if (/\bdel lado izquierdo\b/.test(blob)) push('izquierdo')
  if (/\bdel lado derecho\b/.test(blob)) push('derecho')
  return found
}

export function oppositePositionPair(raw: string): { left: string; right: string; axis: 'frontRear' | 'leftRight' } | null {
  const pos = positionsInText(raw)
  const hasFront = pos.some((word) => FRONT_POSITION.has(word))
  const hasRear = pos.some((word) => REAR_POSITION.has(word))
  if (hasFront && hasRear) return { left: 'delantera', right: 'trasera', axis: 'frontRear' }
  const hasLeft = pos.some((word) => LEFT_POSITION.has(word))
  const hasRight = pos.some((word) => RIGHT_POSITION.has(word))
  if (hasLeft && hasRight) return { left: 'izquierdo', right: 'derecho', axis: 'leftRight' }
  return null
}

export function oppositePositionTokens(word: string): readonly string[] {
  const folded = foldWord(word)
  if (FRONT_POSITION.has(folded)) return [...REAR_POSITION]
  if (REAR_POSITION.has(folded)) return [...FRONT_POSITION]
  if (LEFT_POSITION.has(folded)) return [...RIGHT_POSITION]
  if (RIGHT_POSITION.has(folded)) return [...LEFT_POSITION]
  return []
}

export function familyNeedsPosition(family: { id: string; label: string } | null | undefined) {
  if (!family || family.ambiguous) return false
  const idStem = partStem(family.id)
  const labelStem = partStem(family.label)
  return POSITION_VARIANT_STEMS.has(idStem) || POSITION_VARIANT_STEMS.has(labelStem)
}

export function positionAxisForFamily(family: { id: string; label: string }): 'frontRear' | 'leftRight' {
  const stem = partStem(family.id) || partStem(family.label)
  return LATERAL_POSITION_STEMS.has(stem) ? 'leftRight' : 'frontRear'
}

export function productPositionAlignment(text: string, asked: readonly string[]): 'match' | 'opposite' | 'unknown' {
  const blob = foldWord(text)
  const askedFolded = asked.map(foldWord).filter(Boolean)
  if (!askedFolded.length) return 'unknown'
  const hasAsked = askedFolded.some((word) => blob.includes(word) || [...positionAliases(word)].some((alias) => blob.includes(alias)))
  const hasOpposite = askedFolded.some((word) => oppositePositionTokens(word).some((opp) => blob.includes(opp)))
  if (hasAsked) return 'match'
  if (hasOpposite) return 'opposite'
  return 'unknown'
}

function positionAliases(word: string) {
  const folded = foldWord(word)
  if (FRONT_POSITION.has(folded)) return FRONT_POSITION
  if (REAR_POSITION.has(folded)) return REAR_POSITION
  if (LEFT_POSITION.has(folded)) return LEFT_POSITION
  if (RIGHT_POSITION.has(folded)) return RIGHT_POSITION
  return new Set([folded])
}

export function positionForFamily(raw: string, familyLabel: string) {
  const words = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word) => foldWord(word))
  const familyParts = foldWord(familyLabel).split(/[^a-z0-9]+/).filter((part) => part.length > 2)
  const index = words.findIndex((word) => familyParts.some((part) => matchesTerm(word, part) || word === part))
  if (index >= 0) {
    const window = words.slice(Math.max(0, index - 2), index + 6)
    const near = window.find((word) => POSITION_WORDS.has(word))
    if (near) return near
  }
  const all = positionsInText(raw)
  if (!all.length) return ''
  if (oppositePositionPair(raw)) return ''
  return all[0] || ''
}

/** Familia concreta: pastilla ≠ banda ≠ disco, aunque todas lleven “freno”. */
export function resolvePartFamily(tokens: readonly string[]): ResolvedPart | null {
  const useful = tokens.map(foldWord).filter((token) => token.length > 2 && !liveWeakLexemes().has(token) && !liveGenericTokens().has(token))
  if (!useful.length) return null

  const has = (term: string) => hasWord(useful, term)
  const brakeCue = has('freno')
  const tireCue = has('llanta') || has('rodadura')
  const motorCue = has('motor') || has('correa') || has('distribucion')

  if (has('campana')) {
    return { id: 'campana', label: 'campana', ambiguous: false }
  }
  if (has('pastilla') || has('pasta') || has('pastas')) {
    return { id: 'pastilla_freno', label: 'pastillas de freno', ambiguous: false }
  }
  if (has('guaya') && brakeCue) {
    return { id: 'banda_freno', label: 'bandas de freno', ambiguous: false }
  }
  if ((has('banda') || has('guaya')) && motorCue && !brakeCue) {
    return { id: 'correa', label: 'correa', ambiguous: false }
  }
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
    if (isPositionToken(token) || isPurchaseVerbToken(token)) continue
    const hit = resolvePartFamily([token])
    if (!hit || hit.ambiguous || seen.has(hit.id)) continue
    seen.add(hit.id)
    found.push(hit)
  }
  if (found.some((item) => item.id === 'campana')) {
    return found.filter((item) => item.id !== 'llanta')
  }
  if (found.some((item) => item.id === 'barras' || item.id === 'barra')) {
    return found.filter((item) => item.id !== 'suspension')
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
