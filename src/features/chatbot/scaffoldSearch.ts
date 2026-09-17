import { extractMarcaModelo, isModelYear } from './entities'
import { expandPartSynonyms } from './expertise'
import { hydrateChatProducts } from './productSource'
import { liveBrandNames } from './botip/liveData'
import { resolvePartFamily } from './motoParts'
import {
  creditReply,
  locationReply,
  scaffoldAbortReply,
  scaffoldAskBrandReply,
  scaffoldAskModelReply,
  scaffoldAskYearReply,
  scaffoldInventoryReply,
  scaffoldMaxTurnsReply,
  shippingReply,
  type ChatReply,
} from './intents'
import {
  isCreditAsk,
  isHoursAsk,
  isLocationAsk,
  isShippingAsk,
} from './conversationThread'
import type { SessionContext } from './sessionContext'

export type ScaffoldState = SessionContext['scaffoldedSearch']['currentState']
export type ScaffoldCaptured = SessionContext['scaffoldedSearch']['captured']
export type ScaffoldedSearch = SessionContext['scaffoldedSearch']

const MAX_RESULTS = 3
const MAX_TURNS = 4

const BRAND_CHIPS = ['Honda', 'Yamaha', 'AKT', 'Bajaj', 'Suzuki', 'Kawasaki', 'Hero', 'Kymco'] as const

const MODELS_BY_BRAND: Record<string, string[]> = {
  honda: ['CG125', 'CB190R', 'XR150', 'XRE300', 'C90', 'Invicta'],
  yamaha: ['YBR 125', 'FZ', 'XTZ 125', 'NMAX', 'Crypton', 'XTZ 150'],
  akt: ['AK125', 'NKD 125', 'Dynamic 125', 'Crux', 'Flex', 'Evo'],
  bajaj: ['Pulsar 150', 'Boxer', 'Platina', 'Discover', 'Avenger', 'Pulsar 200'],
  suzuki: ['GN125', 'Gixxer', 'AX4', 'Gixxer 250', 'EN125', 'V-Strom'],
  kawasaki: ['Ninja 250', 'Ninja 300', 'Versys', 'KLR', 'Z400', 'Rouser'],
  hero: ['Eco Deluxe', 'Splendor', 'Ignitor', 'Passion', 'Xpulse', 'Hunk'],
  kymco: ['Agility', 'Like 125', 'K-Pipe', 'Vitality', 'Downtown', 'Xciting'],
}

const YEAR_CHIPS = ['2024', '2023', '2022', '2021', '2020', 'Más antiguo', 'No sé'] as const

const SKIP_WORDS = new Set(['no', 'se', 'sé', 'nose', 'cualquiera', 'da', 'igual', 'omitir', 'omitelo'])
const SHOW_ALL = /\b(todas|todos|cualquiera|muestrame todo|mostrar todo|mas consultad)\b/
const ABORT = /\b(dejalo|dejalo asi|deja lo|otra cosa|no importa|olvidalo|cancelar)\b/
const OTHER_CHIP = /^(otra|otro)$/

export function emptyScaffold(): ScaffoldedSearch {
  return {
    currentState: 'idle',
    captured: { family: '', brand: '', model: '', year: '', cilindraje: '', partTerm: '' },
    history: [],
    turnsInScaffold: 0,
    maxTurnsBeforeFallback: MAX_TURNS,
  }
}

export function ensureScaffold(ctx: SessionContext) {
  if (!ctx.scaffoldedSearch) ctx.scaffoldedSearch = emptyScaffold()
  return ctx.scaffoldedSearch
}

export function resetScaffold(ctx: SessionContext) {
  ctx.scaffoldedSearch = emptyScaffold()
}

export function isScaffoldActive(ctx: SessionContext) {
  const state = ctx.scaffoldedSearch?.currentState
  return Boolean(state && state !== 'idle' && state !== 'completed' && state !== 'aborted' && state !== 'showingResults')
}

function fold(raw = '') {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function wordCount(raw: string, tokens: readonly string[]) {
  if (tokens.length) return tokens.filter((token) => token.length > 1).length
  return fold(raw).split(/\s+/).filter(Boolean).length
}

function displayFamily(label: string) {
  if (!label) return 'ese repuesto'
  return label
}

function knownBrands() {
  const live = liveBrandNames().map((item) => fold(item)).filter((item) => item.length >= 3)
  return new Set([...live, ...BRAND_CHIPS.map((item) => fold(item))])
}

function matchBrand(tokens: readonly string[], raw: string) {
  const folded = fold(raw)
  const brands = knownBrands()
  const fromChip = BRAND_CHIPS.find((item) => folded === fold(item) || tokens.includes(fold(item)))
  if (fromChip) return fromChip
  const extracted = extractMarcaModelo(tokens, raw).marca
  if (extracted) {
    const named = BRAND_CHIPS.find((item) => fold(item) === extracted)
    return named || extracted
  }
  const hit = tokens.find((token) => brands.has(token))
  if (hit) {
    const named = BRAND_CHIPS.find((item) => fold(item) === hit)
    return named || hit
  }
  return ''
}

function matchModel(tokens: readonly string[], raw: string, brand: string) {
  const folded = fold(raw)
  const presets = MODELS_BY_BRAND[fold(brand)] || []
  const fromChip = presets.find((item) => folded === fold(item) || folded.replace(/\s+/g, '') === fold(item).replace(/\s+/g, ''))
  if (fromChip) return fromChip
  const extracted = extractMarcaModelo(tokens, raw).modelo
  if (extracted) return extracted
  const leftover = tokens.filter((token) => token.length >= 2 && fold(token) !== fold(brand) && !isModelYear(token) && !SKIP_WORDS.has(token))
  return leftover[0] || ''
}

function matchYear(tokens: readonly string[], raw: string) {
  const folded = fold(raw)
  if (/mas antiguo|antiguo/.test(folded)) return '2019'
  const tokenYear = tokens.find((token) => isModelYear(token))
  if (tokenYear) return tokenYear
  const rawYear = folded.match(/\b(19|20)\d{2}\b/)
  return rawYear?.[0] || ''
}

function isSkip(raw: string, tokens: readonly string[]) {
  const folded = fold(raw)
  if (SHOW_ALL.test(folded)) return false
  if (/^no se$|^no lo se$|^no se\b/.test(folded)) return true
  if (tokens.includes('nose')) return true
  return SKIP_WORDS.has(folded)
}

function isShowAll(raw: string) {
  return SHOW_ALL.test(fold(raw))
}

function isAbort(raw: string) {
  return ABORT.test(fold(raw))
}

function searchTokens(captured: ScaffoldCaptured) {
  return [captured.partTerm || captured.family, captured.brand, captured.model, captured.year]
    .filter(Boolean)
    .flatMap((item) => fold(item).split(/\s+/))
    .filter(Boolean)
}

function searchQuery(captured: ScaffoldCaptured) {
  return [captured.family, captured.brand, captured.model, captured.year].filter(Boolean).join(' ')
}

function askBrand(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingBrand'
  return scaffoldAskBrandReply(displayFamily(scaffold.captured.family), [...BRAND_CHIPS, 'Otra'])
}

function askModel(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingModel'
  const chips = MODELS_BY_BRAND[fold(scaffold.captured.brand)] || []
  return scaffoldAskModelReply(displayFamily(scaffold.captured.family), scaffold.captured.brand || 'tu vehículo', chips)
}

function askYear(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingYear'
  return scaffoldAskYearReply(scaffold.captured.brand, scaffold.captured.model, [...YEAR_CHIPS])
}

async function runSearch(ctx: SessionContext): Promise<ChatReply> {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'readyToSearch'
  const tokens = searchTokens(scaffold.captured)
  const raw = searchQuery(scaffold.captured)
  await hydrateChatProducts({ tokens, raw, ctx, kind: 'fresh' })
  const reply = scaffoldInventoryReply(ctx, tokens, displayFamily(scaffold.captured.family), MAX_RESULTS)
  scaffold.currentState = 'showingResults'
  return reply
}

function abortScaffold(ctx: SessionContext, family: string): ChatReply {
  resetScaffold(ctx)
  ctx.scaffoldedSearch.currentState = 'aborted'
  return scaffoldAbortReply(family)
}

export function resumeScaffoldQuestion(ctx: SessionContext, reply: ChatReply): ChatReply {
  if (!isScaffoldActive(ctx)) return reply
  const scaffold = ensureScaffold(ctx)
  let extra: ChatReply
  if (scaffold.currentState === 'awaitingBrand') extra = askBrand(ctx)
  else if (scaffold.currentState === 'awaitingModel') extra = askModel(ctx)
  else if (scaffold.currentState === 'awaitingYear') extra = askYear(ctx)
  else return reply
  return {
    text: `${reply.text}\n\nRetomando: ${extra.text}`,
    actions: reply.actions,
    options: extra.options,
  }
}

export function scaffoldAsideReply(ctx: SessionContext, tokens: readonly string[], raw: string): ChatReply | null {
  if (!isScaffoldActive(ctx)) return null
  if (isShippingAsk(tokens, raw)) return resumeScaffoldQuestion(ctx, shippingReply())
  if (isLocationAsk(tokens, raw) || isHoursAsk(tokens, raw)) return resumeScaffoldQuestion(ctx, locationReply(tokens, raw))
  if (isCreditAsk(tokens, raw)) return resumeScaffoldQuestion(ctx, creditReply())
  return null
}

async function startScaffold(ctx: SessionContext, family: { id: string; label: string }, extra: Partial<ScaffoldCaptured>): Promise<ChatReply> {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingBrand'
  scaffold.turnsInScaffold = 0
  scaffold.captured = {
    family: family.label,
    brand: extra.brand || '',
    model: extra.model || '',
    year: extra.year || '',
    cilindraje: extra.cilindraje || '',
    partTerm: extra.partTerm || family.label,
  }
  if (scaffold.captured.brand && scaffold.captured.model) return runSearch(ctx)
  if (scaffold.captured.brand) return askModel(ctx)
  return askBrand(ctx)
}

export function isGenericFamilyAsk(tokens: readonly string[], raw: string) {
  const family = resolvePartFamily(expandPartSynonyms(tokens, raw))
  if (!family || family.ambiguous) return false
  if (wordCount(raw, tokens) > 3) return false
  const vehicle = extractMarcaModelo(tokens, raw)
  return !vehicle.marca && !vehicle.modelo && !matchYear(tokens, raw)
}

export async function runScaffoldTurn(
  ctx: SessionContext,
  tokens: readonly string[],
  raw: string,
): Promise<ChatReply | null> {
  const familyNow = resolvePartFamily(expandPartSynonyms(tokens, raw))
  const vehicle = extractMarcaModelo(tokens, raw)
  const yearNow = matchYear(tokens, raw)
  const scaffold = ensureScaffold(ctx)
  const active = isScaffoldActive(ctx)

  if (active && isAbort(raw)) {
    return abortScaffold(ctx, scaffold.captured.family)
  }

  if (active && familyNow && !familyNow.ambiguous && fold(familyNow.label) !== fold(scaffold.captured.family) && wordCount(raw, tokens) <= 3 && !vehicle.marca) {
    return startScaffold(ctx, familyNow, { partTerm: familyNow.label })
  }

  if (!active) {
    if (!familyNow || familyNow.ambiguous) return null
    const generic = isGenericFamilyAsk(tokens, raw)
    if (generic && isShowAll(raw)) {
      scaffold.captured = {
        family: familyNow.label,
        brand: '',
        model: '',
        year: '',
        cilindraje: '',
        partTerm: familyNow.label,
      }
      return runSearch(ctx)
    }
    if (generic) return startScaffold(ctx, familyNow, { partTerm: familyNow.label, year: yearNow })
    if (familyNow && (vehicle.marca || vehicle.modelo) && wordCount(raw, tokens) <= 6) {
      return startScaffold(ctx, familyNow, {
        partTerm: familyNow.label,
        brand: vehicle.marca || '',
        model: vehicle.modelo || '',
        year: yearNow,
      })
    }
    return null
  }

  scaffold.turnsInScaffold += 1
  if (scaffold.turnsInScaffold > scaffold.maxTurnsBeforeFallback) {
    const family = scaffold.captured.family
    const reply = scaffoldMaxTurnsReply(family)
    const search = await runSearch(ctx)
    return {
      text: `${reply.text}\n\n${search.text}`,
      actions: [...reply.actions, ...search.actions],
      options: search.options,
      catalogCommand: search.catalogCommand,
    }
  }

  if (isShowAll(raw)) return runSearch(ctx)

  if (scaffold.currentState === 'awaitingBrand') {
    if (OTHER_CHIP.test(fold(raw))) {
      return {
        text: 'Escribe la marca del vehículo (ej. Honda).',
        actions: [],
      }
    }
    if (isSkip(raw, tokens)) {
      scaffold.captured.brand = ''
      return askModel(ctx)
    }
    const brand = matchBrand(tokens, raw)
    if (brand) {
      scaffold.captured.brand = brand
      ctx.entities.marca = fold(brand)
      return askModel(ctx)
    }
    const typed = tokens.find((token) => token.length >= 3 && !SKIP_WORDS.has(token))
    if (typed) {
      const typedFamily = resolvePartFamily([typed])
      if (typedFamily && fold(typedFamily.label) === fold(scaffold.captured.family)) return askBrand(ctx)
      scaffold.captured.brand = typed
      ctx.entities.marca = typed
      return askModel(ctx)
    }
    return askBrand(ctx)
  }

  if (scaffold.currentState === 'awaitingModel') {
    if (isSkip(raw, tokens) && !scaffold.captured.brand) return runSearch(ctx)
    if (isSkip(raw, tokens)) {
      scaffold.captured.model = ''
      return runSearch(ctx)
    }
    const model = matchModel(tokens, raw, scaffold.captured.brand)
    if (model) {
      scaffold.captured.model = model
      ctx.entities.modelo = fold(model)
      if (yearNow) {
        scaffold.captured.year = yearNow
        return runSearch(ctx)
      }
      return askYear(ctx)
    }
    return askModel(ctx)
  }

  if (scaffold.currentState === 'awaitingYear') {
    if (isSkip(raw, tokens) || /no se/.test(fold(raw))) {
      scaffold.captured.year = ''
      return runSearch(ctx)
    }
    const year = matchYear(tokens, raw)
    scaffold.captured.year = year
    return runSearch(ctx)
  }

  return null
}
