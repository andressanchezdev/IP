import { extractMarcaModelo, isModelYear } from './entities'
import { expandPartSynonyms } from './expertise'
import { hydrateChatProducts } from './productSource'
import { liveBrandNames, liveModelNames, liveNeverBrandTokens } from './botip/liveData'
import {
  familyNeedsPosition,
  isPurchaseVerbToken,
  isPositionToken,
  listPartFamilies,
  oppositePositionPair,
  positionAxisForFamily,
  positionForFamily,
  resolvePartFamily,
} from './motoParts'
import {
  creditReply,
  locationReply,
  partConflictReply,
  scaffoldAbortReply,
  scaffoldAskBrandReply,
  scaffoldAskModelReply,
  scaffoldAskPositionReply,
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
import { isGreetingToken } from './prepare'
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

const SKIP_WORDS = new Set(['no', 'se', 'sé', 'nose', 'cualquiera', 'da', 'igual', 'omitir', 'omitelo'])
const SHOW_ALL = /\b(todas|todos|cualquiera|muestrame todo|mostrar todo|mas consultad)\b/
const ABORT = /\b(dejalo|dejalo asi|deja lo|otra cosa|no importa|olvidalo|cancelar|cambiando de tema|reiniciar|mejor quiero)\b/
const OTHER_CHIP = /^(otra|otro)$/

export function emptyScaffold(): ScaffoldedSearch {
  return {
    currentState: 'idle',
    captured: { family: '', brand: '', model: '', year: '', cilindraje: '', partTerm: '', position: '' },
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

function scaffoldTokenCount(tokens: readonly string[]) {
  return tokens.filter((token) => (
    token.length > 1
    && !isPurchaseVerbToken(token)
    && !isPositionToken(token)
    && !isGreetingToken(token)
  )).length
}

function displayFamily(label: string) {
  if (!label) return 'ese repuesto'
  return label
}

function brandChipList() {
  const live = liveBrandNames()
    .map((item) => String(item || '').trim())
    .filter((item) => item.length >= 2)
  const seen = new Set(BRAND_CHIPS.map((item) => fold(item)))
  const extra = live.filter((item) => {
    const key = fold(item)
    if (key.length < 3 || seen.has(key)) return false
    if (liveNeverBrandTokens().has(key)) return false
    seen.add(key)
    return true
  })
  return [...BRAND_CHIPS, ...extra]
}

function modelsForBrand(brand: string) {
  const key = fold(brand)
  const presets = MODELS_BY_BRAND[key] || []
  const live = liveModelNames()
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  const seen = new Set(presets.map((item) => fold(item).replace(/\s+/g, '')))
  const extra: string[] = []
  for (const item of live) {
    const compact = fold(item).replace(/\s+/g, '')
    if (compact.length < 2 || seen.has(compact)) continue
    // Prefer models that look tied to this brand when brand token appears in label; otherwise keep all live extras lightly capped
    seen.add(compact)
    extra.push(item)
  }
  return [...presets, ...extra.slice(0, 8)]
}

function knownBrands() {
  const live = liveBrandNames().map((item) => fold(item)).filter((item) => item.length >= 3)
  const neverBrand = liveNeverBrandTokens()
  return new Set(
    [...live, ...BRAND_CHIPS.map((item) => fold(item))].filter((item) => !neverBrand.has(item)),
  )
}

function matchBrand(tokens: readonly string[], raw: string) {
  const folded = fold(raw)
  const brands = knownBrands()
  const chips = brandChipList()
  const fromChip = chips.find((item) => folded === fold(item) || tokens.includes(fold(item)))
  if (fromChip && !liveNeverBrandTokens().has(fold(fromChip))) return fromChip
  const extracted = extractMarcaModelo(tokens, raw).marca
  if (extracted && !liveNeverBrandTokens().has(fold(extracted))) {
    const named = chips.find((item) => fold(item) === fold(extracted))
    return named || extracted
  }
  const hit = tokens.find((token) => brands.has(token) && !liveNeverBrandTokens().has(token))
  if (hit) {
    const named = chips.find((item) => fold(item) === hit)
    return named || hit
  }
  return ''
}

function matchModel(tokens: readonly string[], raw: string, brand: string) {
  const folded = fold(raw)
  const presets = modelsForBrand(brand)
  const fromChip = presets.find((item) => folded === fold(item) || folded.replace(/\s+/g, '') === fold(item).replace(/\s+/g, ''))
  if (fromChip) return fromChip
  const extracted = extractMarcaModelo(tokens, raw).modelo
  if (extracted) return extracted
  const leftover = tokens.filter((token) => (
    token.length >= 2
    && fold(token) !== fold(brand)
    && !isModelYear(token)
    && !SKIP_WORDS.has(token)
    && !isPositionToken(token)
    && !isPurchaseVerbToken(token)
    && !liveNeverBrandTokens().has(token)
    && !resolvePartFamily([token])
  ))
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

function matchPosition(tokens: readonly string[], raw: string) {
  const fromRaw = positionForFamily(raw, '') || positionsFromTokens(tokens)
  return fromRaw
}

function positionsFromTokens(tokens: readonly string[]) {
  return tokens.find((token) => isPositionToken(token)) || ''
}

function capturedFamily(captured: ScaffoldCaptured) {
  return resolvePartFamily(captured.family.split(/\s+/).filter(Boolean)) || {
    id: captured.family,
    label: captured.family,
    ambiguous: false,
  }
}

function needsPositionAsk(captured: ScaffoldCaptured) {
  const family = capturedFamily(captured)
  if (!familyNeedsPosition(family)) return false
  return !captured.position
}

function askPosition(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingPosition'
  const family = capturedFamily(scaffold.captured)
  return scaffoldAskPositionReply(displayFamily(scaffold.captured.family), {
    model: scaffold.captured.model,
    axis: positionAxisForFamily(family),
  })
}

function continueAfterCapture(ctx: SessionContext): ChatReply | Promise<ChatReply> {
  const scaffold = ensureScaffold(ctx)
  if (needsPositionAsk(scaffold.captured)) return askPosition(ctx)
  if (scaffold.captured.brand && scaffold.captured.model) return runSearch(ctx)
  if (scaffold.captured.brand) return askModel(ctx)
  return askBrand(ctx)
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
  return [captured.partTerm || captured.family, captured.position, captured.brand, captured.model, captured.year]
    .filter(Boolean)
    .flatMap((item) => fold(item).split(/\s+/))
    .filter(Boolean)
}

function searchQuery(captured: ScaffoldCaptured) {
  return [captured.family, captured.position, captured.brand, captured.model, captured.year].filter(Boolean).join(' ')
}

function askBrand(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingBrand'
  return scaffoldAskBrandReply(
    displayFamily(scaffold.captured.family),
    [...brandChipList(), 'Otra'],
    { position: scaffold.captured.position, model: scaffold.captured.model },
  )
}

function askModel(ctx: SessionContext): ChatReply {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingModel'
  const chips = modelsForBrand(scaffold.captured.brand)
  return scaffoldAskModelReply(displayFamily(scaffold.captured.family), scaffold.captured.brand || 'tu vehículo', chips)
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
  if (scaffold.currentState === 'awaitingPosition') extra = askPosition(ctx)
  else if (scaffold.currentState === 'awaitingBrand') extra = askBrand(ctx)
  else if (scaffold.currentState === 'awaitingModel') extra = askModel(ctx)
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

function fillScaffold(ctx: SessionContext, family: { id: string; label: string }, extra: Partial<ScaffoldCaptured>) {
  const scaffold = ensureScaffold(ctx)
  scaffold.currentState = 'awaitingBrand'
  const wantsPosition = familyNeedsPosition(family)
  scaffold.turnsInScaffold = 0
  scaffold.captured = {
    family: family.label,
    brand: extra.brand || ctx.entities.marca || '',
    model: extra.model || ctx.entities.modelo || '',
    year: extra.year || '',
    cilindraje: extra.cilindraje || '',
    partTerm: extra.partTerm || family.label,
    position: wantsPosition ? (extra.position || ctx.entities.posicion || '') : '',
  }
  if (scaffold.captured.brand) ctx.entities.marca = fold(scaffold.captured.brand)
  if (scaffold.captured.model) ctx.entities.modelo = scaffold.captured.model
  if (scaffold.captured.position) ctx.entities.posicion = scaffold.captured.position
  else if (!wantsPosition) ctx.entities.posicion = undefined
  ctx.entities.pieza = family.label
  return scaffold
}

export function openScaffold(ctx: SessionContext, family: { id: string; label: string }, extra: Partial<ScaffoldCaptured> = {}): ChatReply {
  fillScaffold(ctx, family, extra)
  const scaffold = ensureScaffold(ctx)
  if (needsPositionAsk(scaffold.captured)) return askPosition(ctx)
  if (scaffold.captured.brand) return askModel(ctx)
  return askBrand(ctx)
}

async function startScaffold(ctx: SessionContext, family: { id: string; label: string }, extra: Partial<ScaffoldCaptured>): Promise<ChatReply> {
  fillScaffold(ctx, family, extra)
  return continueAfterCapture(ctx)
}

export function isGenericFamilyAsk(tokens: readonly string[], raw: string) {
  const family = resolvePartFamily(expandPartSynonyms(tokens, raw))
  if (!family || family.ambiguous) return false
  if (listPartFamilies(expandPartSynonyms(tokens, raw)).length >= 2) return false
  if (scaffoldTokenCount(tokens) > 3) return false
  const vehicle = extractMarcaModelo(tokens, raw)
  return !vehicle.marca && !vehicle.modelo && !matchYear(tokens, raw)
}

/** Pieza + marca + modelo ya en el mensaje: no pedir más datos; ir a búsqueda. */
function hasCompletePartVehicle(
  family: { id: string; label: string; ambiguous?: boolean } | null,
  vehicle: { marca?: string; modelo?: string },
  ctx: SessionContext,
) {
  if (!family || family.ambiguous) return false
  const marca = String(vehicle.marca || ctx.entities.marca || '').trim()
  const modelo = String(vehicle.modelo || ctx.entities.modelo || '').trim()
  return Boolean(marca && modelo)
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

  if (active && scaffold.currentState === 'awaitingPosition') {
    const position = matchPosition(tokens, raw) || positionForFamily(raw, scaffold.captured.family)
    if (position) {
      scaffold.captured.position = position
      ctx.entities.posicion = position
      const brand = matchBrand(tokens, raw)
      if (brand) {
        scaffold.captured.brand = brand
        ctx.entities.marca = fold(brand)
      }
      const model = vehicle.modelo || matchModel(tokens, raw, scaffold.captured.brand)
      if (model && fold(model) !== fold(scaffold.captured.family)) {
        scaffold.captured.model = model
        ctx.entities.modelo = fold(model)
      }
      return continueAfterCapture(ctx)
    }
    return askPosition(ctx)
  }

  if (active && familyNow && !familyNow.ambiguous && fold(familyNow.label) !== fold(scaffold.captured.family) && scaffoldTokenCount(tokens) <= 3 && !vehicle.marca) {
    return startScaffold(ctx, familyNow, {
      partTerm: familyNow.label,
      model: scaffold.captured.model || ctx.entities.modelo || vehicle.modelo || '',
      brand: ctx.entities.marca || vehicle.marca || '',
      position: positionForFamily(raw, familyNow.label) || (familyNeedsPosition(familyNow) ? '' : ''),
    })
  }

  if (!active) {
    if (!familyNow || familyNow.ambiguous) return null
    if (listPartFamilies(expandPartSynonyms(tokens, raw)).length >= 2) return null
    const pair = oppositePositionPair(raw)
    if (pair && familyNeedsPosition(familyNow)) {
      return partConflictReply(`${familyNow.label} ${pair.left}`, `${familyNow.label} ${pair.right}`, {
        leftLabel: `${familyNow.label} ${pair.left}`,
        rightLabel: `${familyNow.label} ${pair.right}`,
        vehicle: vehicle.modelo || ctx.entities.modelo || '',
      })
    }
    const position = positionForFamily(raw, familyNow.label) || (familyNeedsPosition(familyNow) ? ctx.entities.posicion || '' : '')
    const brand = vehicle.marca || ctx.entities.marca || ''
    const model = vehicle.modelo || ctx.entities.modelo || ''

    // Consulta completa (pieza + marca + modelo): buscar de una vez, sin pedir más datos.
    if (hasCompletePartVehicle(familyNow, { marca: brand, modelo: model }, ctx)) {
      return startScaffold(ctx, familyNow, {
        partTerm: familyNow.label,
        brand,
        model,
        year: yearNow,
        position,
      })
    }

    const generic = isGenericFamilyAsk(tokens, raw)
    if (generic && isShowAll(raw)) {
      scaffold.captured = {
        family: familyNow.label,
        brand: '',
        model: '',
        year: '',
        cilindraje: '',
        partTerm: familyNow.label,
        position,
      }
      return runSearch(ctx)
    }
    if (generic) {
      return startScaffold(ctx, familyNow, {
        partTerm: familyNow.label,
        year: yearNow,
        position,
        model: ctx.entities.modelo || '',
        brand: ctx.entities.marca || '',
      })
    }
    if (familyNow && (brand || model) && scaffoldTokenCount(tokens) <= 6) {
      return startScaffold(ctx, familyNow, {
        partTerm: familyNow.label,
        brand,
        model,
        year: yearNow,
        position,
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
      if (scaffold.captured.model) return runSearch(ctx)
      return askModel(ctx)
    }
    const brand = matchBrand(tokens, raw)
    if (brand) {
      scaffold.captured.brand = brand
      ctx.entities.marca = fold(brand)
      if (scaffold.captured.model) return runSearch(ctx)
      return askModel(ctx)
    }
    const typed = tokens.find((token) => (
      token.length >= 3
      && !SKIP_WORDS.has(token)
      && !isPositionToken(token)
      && !isPurchaseVerbToken(token)
    ))
    if (typed) {
      const typedFamily = resolvePartFamily([typed])
      if (typedFamily && fold(typedFamily.label) === fold(scaffold.captured.family)) return askBrand(ctx)
      scaffold.captured.brand = typed
      ctx.entities.marca = typed
      if (scaffold.captured.model) return runSearch(ctx)
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
      if (yearNow) scaffold.captured.year = yearNow
      return runSearch(ctx)
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
