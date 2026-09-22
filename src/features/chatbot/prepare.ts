import { stripAccents } from './normalizeText'
import type { SessionLanguage } from './sessionContext'
import { DEFAULT_PIPELINE_CONFIG } from './pipelineConfig'

export type InputQuality = 'EMPTY' | 'EMOJI_ONLY' | 'VERY_SHORT' | 'OK' | 'VERY_LONG'

export type ChatToken = {
  value: string
  stop: boolean
}

export type PreparedInput = {
  text: string
  language: SessionLanguage
  quality: InputQuality
  hasQuestion: boolean
  allTokens: string[]
  tokens: ChatToken[]
  significant: string[]
}

const CONTRACTIONS: Record<string, string> = {
  q: 'que',
  xq: 'porque',
  x: 'por',
  d: 'de',
  tmb: 'tambien',
  bn: 'bien',
  k: 'que',
}

const STOP = new Set([
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
  'sus',
  'tus',
  'mis',
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
  'nuestro',
  'nuestra',
  'nuestros',
  'nuestras',
  'the',
  'is',
  'are',
  'you',
  'please',
  'can',
  'for',
  'and',
  'to',
  'of',
])

const ES_HINTS = ['hola', 'que', 'por', 'para', 'gracias', 'precio', 'catalogo', 'buenas', 'necesito']
const EN_HINTS = ['hello', 'hi', 'please', 'thanks', 'price', 'catalog', 'what', 'how', 'the', 'you']

const LETTER = /[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/

export function detectLanguage(text: string, previous: SessionLanguage = 'es'): SessionLanguage {
  const tokens = stripAccents(text.toLowerCase()).split(/[^a-z0-9]+/).filter(Boolean)
  let es = 0
  let en = 0
  for (const token of tokens) {
    if (ES_HINTS.includes(token)) es += 1
    if (EN_HINTS.includes(token)) en += 1
  }
  if (en > es && en >= 2) return 'en'
  if (es > en) return 'es'
  return previous
}

export function isStopToken(token: string) {
  return STOP.has(token)
}

export function isDefineQuestion(allTokens: readonly string[], raw: string) {
  const set = new Set(allTokens)
  if (set.has('que') && (set.has('es') || set.has('significa'))) return true
  return /\bque\s+es\b/.test(stripAccents(raw.toLowerCase()))
}

export function classifyQuality(text: string, tokenCount: number): InputQuality {
  if (!text.trim()) return 'EMPTY'
  const withoutMarks = text.replace(/[\s\p{P}\p{S}\p{N}]+/gu, '')
  if (!LETTER.test(text) && !/\d/.test(text)) return 'EMOJI_ONLY'
  if (!withoutMarks && !/\d/.test(text)) return 'EMOJI_ONLY'
  if (tokenCount <= 1) return 'VERY_SHORT'
  if (tokenCount > DEFAULT_PIPELINE_CONFIG.MAX_TOKENS) return 'VERY_LONG'
  return 'OK'
}

function expand(token: string) {
  return CONTRACTIONS[token] || token
}

export function tokenizeRaw(text: string) {
  const cleaned = stripAccents(text.toLowerCase())
    .replace(/[¿¡]/g, ' ')
    .replace(/[^a-z0-9?\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return [] as string[]
  return cleaned
    .split(' ')
    .map((item) => item.replace(/\?+/g, ''))
    .map(expand)
    .filter((item) => item.length > 1)
}

function foldedTalk(raw: string) {
  return stripAccents(raw.toLowerCase()).replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isHowAreYou(raw: string) {
  return /^(hola\s+|buenas?\s+|hey\s+)?(como\s+est[ae]s?|como\s+estats|como\s+stas|como\s+te\s+encuentras)$/.test(
    foldedTalk(raw),
  )
}

const GREETING_LEAD = new Set([
  'hola',
  'holas',
  'holaa',
  'holaaa',
  'holi',
  'holis',
  'holiwis',
  'holiwi',
  'ola',
  'buenas',
  'buen',
  'buenos',
  'hey',
  'heyy',
  'hello',
  'helo',
  'hi',
  'saludos',
  'saluditos',
  'saludo',
  'epa',
  'epale',
  'epaaa',
  'quiubo',
  'quihubo',
  'quiubole',
  'quiubas',
  'alo',
  'aloo',
  'alooo',
  'habla',
])

const GREETING_FILL = new Set([
  'dias',
  'dia',
  'tardes',
  'noches',
  'que',
  'tal',
  'mas',
  'hubo',
  'onda',
  'pex',
  'paso',
  'como',
  'vas',
  'va',
  'estan',
  'estas',
  'estas',
  'andas',
  'andan',
  'todo',
  'bien',
  'parce',
  'parcero',
  'pana',
  'socio',
  'amigo',
  'amiga',
  'companero',
  'companera',
  'jefe',
  'llave',
  'gente',
  'equipo',
  'bot',
  'asistente',
  'asesor',
  'vendedora',
  'vendedor',
  'maquina',
  'sistema',
  'me',
  'ayudas',
  'ayuda',
  'colaboras',
  'pregunta',
  'duda',
  'tengo',
  'quien',
  'atiende',
  'alguien',
  'ahi',
  'cordiales',
  'un',
  'una',
  'se',
  'cuenta',
  'cuentas',
  'hay',
  'le',
  'te',
  'les',
  'buen',
  'santas',
  'orden',
  'a',
  'la',
  'de',
])

export function isGreetingToken(token: string) {
  const folded = stripAccents(token.toLowerCase())
  return GREETING_LEAD.has(folded)
}

const GREETING_PHRASES = new Set([
  'que tal',
  'que mas',
  'que hubo',
  'que onda',
  'que pex',
  'que paso',
  'todo bien',
  'como vas',
  'como te va',
  'como esta',
  'como estas',
  'como estan',
  'como andas',
  'como le va',
  'que se cuenta',
  'que me cuentas',
  'buenas y santas',
  'a la orden',
  'que tal me ayudas',
  'que tal una pregunta',
  'hola tengo una pregunta',
  'hola tengo una duda',
  'buenas hay alguien',
  'buenas hay alguien ahi',
  'hola quien me atiende',
  'buenas me ayudas',
  'buenas me colaboras',
])

export function isSmallTalk(raw: string) {
  if (isHowAreYou(raw)) return true
  const text = foldedTalk(raw)
  if (!text) return false
  if (GREETING_PHRASES.has(text)) return true
  const tokens = text.split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  if (!tokens.every((token) => GREETING_LEAD.has(token) || GREETING_FILL.has(token))) return false
  return tokens.some((token) => GREETING_LEAD.has(token))
}

export function isThanksTalk(raw: string) {
  return /^(gracias|grax|thanks|ty|listo|ok|vale|de nada)$/.test(foldedTalk(raw))
}

export function compactTokens(values: readonly string[], max = DEFAULT_PIPELINE_CONFIG.MAX_TOKENS): ChatToken[] {
  const seen = new Set<string>()
  const list: ChatToken[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    list.push({ value, stop: STOP.has(value) })
    if (list.length >= max) break
  }
  return list
}

export function prioritizeLong(values: readonly string[], keywords: readonly string[]) {
  const keySet = new Set(keywords)
  const ranked = [...values].sort((left, right) => {
    const leftKey = keySet.has(left) ? 0 : 1
    const rightKey = keySet.has(right) ? 0 : 1
    if (leftKey !== rightKey) return leftKey - rightKey
    const leftStop = STOP.has(left) ? 1 : 0
    const rightStop = STOP.has(right) ? 1 : 0
    return leftStop - rightStop
  })
  return compactTokens(ranked)
}

export function hasRichPetitionSignals(tokens: readonly string[]): boolean {
  const set = new Set(tokens)
  const partish = tokens.some(
    (token) =>
      token.length >= 4 &&
      !STOP.has(token) &&
      !['hola', 'buenas', 'gracias', 'necesito', 'quiero', 'busco'].includes(token),
  )
  const brandOrModel = tokens.some((token) =>
    ['honda', 'yamaha', 'bajaj', 'akt', 'pulsar', 'cg125', 'ybr', 'cb190', 'modelo', 'marca'].includes(token),
  ) || tokens.some((token) => /^\d{2,4}$/.test(token) || /^[a-z]+\d+$/i.test(token))
  const aspect = tokens.some((token) =>
    ['precio', 'precios', 'stock', 'envio', 'envios', 'domicilio', 'ubicacion', 'horario', 'whatsapp', 'cotizar', 'cuesta'].includes(
      token,
    ),
  )
  const signals = [partish, brandOrModel, aspect].filter(Boolean).length
  return signals >= 2 || (partish && set.size >= 4)
}

export function preProcess(raw: string, previousLanguage: SessionLanguage = 'es'): PreparedInput {
  const text = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  const hasQuestion = raw.includes('?') || raw.includes('¿')
  const language = detectLanguage(text, previousLanguage)
  const allTokens = tokenizeRaw(text)
  let quality = classifyQuality(text, allTokens.length)
  if (quality === 'VERY_LONG' && hasRichPetitionSignals(allTokens)) {
    quality = 'OK'
  }
  const maxTokens = quality === 'OK' && hasRichPetitionSignals(allTokens) ? Math.max(DEFAULT_PIPELINE_CONFIG.MAX_TOKENS, 64) : DEFAULT_PIPELINE_CONFIG.MAX_TOKENS
  const tokens = compactTokens(allTokens, maxTokens)
  return {
    text,
    language,
    quality,
    hasQuestion,
    allTokens,
    tokens,
    significant: tokens.filter((item) => !item.stop).map((item) => item.value),
  }
}

export function tokensEqual(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

export function countOccurrences(values: readonly string[]) {
  const counts: Record<string, number> = {}
  for (const value of values) {
    if (STOP.has(value)) continue
    counts[value] = (counts[value] || 0) + 1
  }
  return counts
}
