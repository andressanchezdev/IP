import { stripAccents } from './normalizeText'
import { liveLexiconList, liveLexiconMap } from './botip/liveData'

export const VEHICLE_ALIASES: Record<string, string> = {
  auto: 'carro',
  autos: 'carro',
  automovil: 'carro',
  bici: 'bicicleta',
  bicicleta: 'bicicleta',
  bicicletas: 'bicicleta',
  bus: 'bus',
  buses: 'bus',
  buseta: 'buseta',
  busetas: 'buseta',
  camion: 'camion',
  camiones: 'camion',
  camioneta: 'camioneta',
  camionetas: 'camioneta',
  campero: 'camioneta',
  carro: 'carro',
  carros: 'carro',
  chiva: 'bus',
  cicla: 'bicicleta',
  coches: 'carro',
  coche: 'carro',
  cuatrimoto: 'cuatrimoto',
  cuatrimotos: 'cuatrimoto',
  furgon: 'furgon',
  furgoneta: 'furgon',
  lancha: 'lancha',
  lanchas: 'lancha',
  moto: 'moto',
  motico: 'moto',
  motocarro: 'motocarro',
  motocarros: 'motocarro',
  motocicleta: 'moto',
  motocicletas: 'moto',
  motoneta: 'scooter',
  motos: 'moto',
  mula: 'tractomula',
  patineta: 'patineta',
  patinetas: 'patineta',
  pickup: 'camioneta',
  picop: 'camioneta',
  scooter: 'scooter',
  scooters: 'scooter',
  taxi: 'taxi',
  taxis: 'taxi',
  tractor: 'tractor',
  tractores: 'tractor',
  tractomula: 'tractomula',
  tractomulas: 'tractomula',
  volqueta: 'volqueta',
  volquetas: 'volqueta',
}

export const VEHICLE_TERMS = [
  'avion',
  'barco',
  'bicicleta',
  'bus',
  'buseta',
  'camion',
  'camioneta',
  'carro',
  'cuatrimoto',
  'furgon',
  'lancha',
  'moto',
  'motocarro',
  'patineta',
  'pickup',
  'scooter',
  'taxi',
  'tractomula',
  'tractor',
  'tren',
  'volqueta',
] as const

export function liveVehicleTerms(): readonly string[] {
  return liveLexiconList('vehicles', VEHICLE_TERMS)
}

export function liveVehicleAliases() {
  return liveLexiconMap('vehicleAliases', VEHICLE_ALIASES)
}

export function livePersonNames() {
  return liveLexiconList('personNames', PERSON_NAMES)
}

export function liveInsultStems() {
  return liveLexiconList('insultStems', INSULT_STEMS)
}

export function liveSexualStems() {
  return liveLexiconList('sexualStems', SEXUAL_STEMS)
}

export function liveViolenceTerms() {
  return liveLexiconList('violenceTerms', VIOLENCE_TERMS)
}

export function liveFoodTerms() {
  return liveLexiconList('foodTerms', FOOD_TERMS)
}

export function liveCreatureTerms() {
  return liveLexiconList('creatureTerms', CREATURE_TERMS)
}

export function liveProtectedTokens() {
  return new Set<string>([
    'marcos',
    ...liveVehicleTerms(),
    ...livePersonNames(),
    ...Object.keys(liveVehicleAliases()),
    ...liveViolenceTerms(),
    ...liveFoodTerms(),
    ...liveCreatureTerms(),
    ...liveInsultStems(),
    ...liveSexualStems(),
  ])
}

/** Nombres de pila frecuentes. No son productos del catálogo. */
export const PERSON_NAMES = [
  'adriana',
  'alberto',
  'alejandra',
  'alejandro',
  'alvaro',
  'ana',
  'andrea',
  'andres',
  'antonio',
  'camila',
  'camilo',
  'carlos',
  'carolina',
  'catalina',
  'cristian',
  'daniel',
  'daniela',
  'david',
  'diana',
  'diego',
  'esteban',
  'fabio',
  'felipe',
  'fernando',
  'gabriel',
  'gabriela',
  'gloria',
  'hernan',
  'hugo',
  'isabella',
  'ivan',
  'jaime',
  'javier',
  'jorge',
  'jose',
  'juan',
  'julian',
  'juliana',
  'laura',
  'leidy',
  'lina',
  'lucia',
  'luis',
  'manuel',
  'manuela',
  'maria',
  'mariana',
  'marta',
  'martha',
  'mateo',
  'mauricio',
  'miguel',
  'monica',
  'natalia',
  'nicolas',
  'oscar',
  'patricia',
  'paula',
  'pedro',
  'ricardo',
  'samuel',
  'sandra',
  'santiago',
  'sebastian',
  'sofia',
  'tatiana',
  'valentina',
] as const

/** Raíces de insulto. No se repite la palabra en la respuesta. */
export const INSULT_STEMS = [
  'babos',
  'bobo',
  'boba',
  'cabron',
  'carechimba',
  'carajo',
  'estupid',
  'gonorre',
  'hijuep',
  'hp',
  'huevon',
  'idiota',
  'imbecil',
  'maldit',
  'malparid',
  'maricon',
  'mierda',
  'pendej',
  'puta',
  'puto',
  'tarad',
  'webon',
]

/** Raíces sexuales explícitas. No se repite la palabra en la respuesta. */
export const SEXUAL_STEMS = [
  'desnudo',
  'erotic',
  'follar',
  'hentai',
  'masturb',
  'nude',
  'orgasmo',
  'pene',
  'porn',
  'prostitut',
  'sexo',
  'sexual',
  'tetas',
  'vagina',
  'xxx',
]

export const VIOLENCE_TERMS = [
  'amenaza',
  'arma',
  'armas',
  'asesinato',
  'asesinar',
  'asesinaron',
  'asesinado',
  'asesinados',
  'asesinadas',
  'atraco',
  'balacera',
  'cuchillo',
  'disparo',
  'droga',
  'drogas',
  'extorsion',
  'golpear',
  'guerra',
  'homicidio',
  'matar',
  'pelea',
  'pistola',
  'robar',
  'robo',
  'secuestro',
  'secuestrar',
  'terrorismo',
  'violencia',
]

export const FOOD_TERMS = [
  'almuerzo',
  'arepa',
  'arroz',
  'bocadillo',
  'bunuelo',
  'cafe',
  'carne',
  'cena',
  'cerveza',
  'chocolate',
  'chorizo',
  'comida',
  'desayuno',
  'empanada',
  'frijoles',
  'galleta',
  'gaseosa',
  'hamburguesa',
  'helado',
  'jugo',
  'pan',
  'pizza',
  'pollo',
  'salchipapa',
  'sancocho',
  'sopa',
  'taco',
  'tamal',
  'torta',
]

export const CREATURE_TERMS = [
  'aguila',
  'arana',
  'burro',
  'caballo',
  'cabra',
  'carnotauro',
  'carnotaurus',
  'conejo',
  'culebra',
  'dinosaurio',
  'dragon',
  'elefante',
  'gallina',
  'gato',
  'hamster',
  'iguana',
  'leon',
  'lobo',
  'mariposa',
  'mono',
  'oso',
  'pajaro',
  'pato',
  'perro',
  'pez',
  'raton',
  'serpiente',
  'tiburon',
  'tigre',
  'vaca',
  'zorro',
]

export const PROTECTED_TOKENS = new Set<string>([
  'marcos',
  ...VEHICLE_TERMS,
  ...PERSON_NAMES,
  ...Object.keys(VEHICLE_ALIASES),
  ...VIOLENCE_TERMS,
  ...FOOD_TERMS,
  ...CREATURE_TERMS,
  ...INSULT_STEMS,
  ...SEXUAL_STEMS,
])

const COMPANY_HINTS = new Set([
  'importacion',
  'importador',
  'importadora',
  'importadoras',
  'importadores',
  'importar',
  'premium',
])

export type UnmatchedKind = 'insult' | 'sexual' | 'violence' | 'food' | 'creature' | 'vehicle' | 'person' | 'unknown'

function plain(token: string) {
  return stripAccents(token.toLowerCase())
}

function hasStem(token: string, stems: readonly string[]) {
  return stems.some((stem) => token === stem || token.startsWith(stem))
}

function findListed(tokens: readonly string[], terms: readonly string[]) {
  return tokens.find((token) => terms.includes(token)) || ''
}

export function companyHintWord(tokens: readonly string[]) {
  return tokens.map(plain).find((token) => COMPANY_HINTS.has(token) || token.includes('importadora')) || ''
}

export function classifyUnmatched(tokens: readonly string[]): { kind: UnmatchedKind; word: string } {
  const cleaned = tokens.map(plain).filter(Boolean)

  if (cleaned.some((token) => hasStem(token, liveInsultStems()))) return { kind: 'insult', word: '' }
  if (cleaned.some((token) => hasStem(token, liveSexualStems()))) return { kind: 'sexual', word: '' }

  const violence = findListed(cleaned, liveViolenceTerms())
  if (violence) return { kind: 'violence', word: violence }

  const food = findListed(cleaned, liveFoodTerms())
  if (food) return { kind: 'food', word: food }

  const creature = findListed(cleaned, liveCreatureTerms())
  if (creature) return { kind: 'creature', word: creature }

  const vehicles = liveVehicleTerms()
  const aliases = liveVehicleAliases()
  const vehicle = cleaned.find((token) => aliases[token] || vehicles.includes(token))
  if (vehicle) return { kind: 'vehicle', word: aliases[vehicle] || vehicle }

  const person = cleaned.find((token) => livePersonNames().includes(token))
  if (person) return { kind: 'person', word: person }

  return { kind: 'unknown', word: cleaned.join(' ') }
}
