import { findTerm, liveAccessoryTerms, liveCatalogParts, liveOtherParts, resolvePartFamily } from './motoParts'
import { defaultKeywords, keywordsOf, VACANCY_EXACT_WORDS } from './botSettings'
import { getChatIntents, hasProductTerm, matchingProductsForTokens } from './intents'
import { matchLandingTeam, wantsAdvisorContact } from './teamLookup'
import { scoreMatch } from './matchIntent'
import type { EntityMap, SessionContext } from './sessionContext'
import type { PipelineConfig } from './pipelineConfig'
import { isTeamNameLookupAllowed, parseUserFrame } from './userFrame'
import { isBroadPriceAsk, isCreditAsk, isPaymentAsk, isShippingAsk, isOrderStatusAsk, isComplaintAsk, isBrandLineAsk } from './conversationThread'
import { pickLastOffer } from './inventory'

export type Candidate = {
  intent: string
  score: number
  entities: EntityMap
  matchedTokens: string[]
}

const SECONDARY_OK = new Set(['greeting', 'thanks'])

export function isSecondaryIntent(intent: string) {
  return SECONDARY_OK.has(intent)
}

function cap(score: number) {
  return Math.max(0, Math.min(10, score))
}

function applyModifiers(
  base: number,
  intent: string,
  matched: readonly string[],
  ctx: SessionContext,
  hasQuestion: boolean,
  veryShort: boolean,
  cfg: PipelineConfig,
): number {
  let score = base
  const entityValues = Object.values(ctx.entities).filter((item) => typeof item === 'string') as string[]
  if (matched.some((token) => entityValues.some((value) => value.toLowerCase().includes(token)))) score += 1
  const focus = ctx.conversationFocus
  if (focus?.referent === 'other' && intent === focus.intent) score -= 1
  if (focus?.referent === 'current' || focus?.referent === 'specific') {
    if (intent === focus.intent) score += 2
    if (focus.aspect === 'price' && intent === 'quote') score += 2
    if (focus.aspect === 'shipping' && intent === 'shipping') score += 2
    if ((focus.aspect === 'identity' || focus.aspect === 'stock') && (intent === 'product' || intent === 'quote')) {
      score += 1
    }
  } else if (ctx.lastTopIntent === intent || focus?.intent === intent) {
    score += 1
  }
  const recent = ctx.lastResponses.slice(-2).some((item) => item.intent === intent)
  if (recent && focus?.intent !== intent && focus?.referent !== 'current') score -= 1
  if (hasQuestion && ['quote', 'product', 'accessory'].includes(intent)) score += 2
  if (veryShort && intent === 'greeting') score += 1
  void cfg
  return cap(score)
}

function runSafe(intent: string, fn: () => Candidate | null): Candidate | null {
  try {
    return fn()
  } catch {
    return { intent, score: 0, entities: {}, matchedTokens: [] }
  }
}

export function runAllMatchers(
  tokens: readonly string[],
  ctx: SessionContext,
  hasQuestion: boolean,
  veryShort: boolean,
  cfg: PipelineConfig,
  raw = '',
): Candidate[] {
  const intents = getChatIntents()
  const frame = parseUserFrame(raw, tokens)
  const allowNames = isTeamNameLookupAllowed(frame, ctx.lastTopIntent, ctx.pendingConfirmation?.intent || null)
  const teamTokens = frame.lookupTokens.length ? frame.lookupTokens : tokens

  const team = runSafe('teamMember', () => {
    const match = matchLandingTeam(allowNames ? tokens : teamTokens, {
      allowNameLookup: allowNames,
      excludeNames: frame.introducingSelf ? [frame.userName] : [],
    })
    if (!match) return null
    const intent =
      match.type === 'member' ? 'teamMember' : match.type === 'suggest' ? 'teamSuggest' : 'teamGroup'
    const score = applyModifiers(8, intent, tokens.slice(0, 2), ctx, hasQuestion, veryShort, cfg)
    return { intent, score, entities: ctx.entities, matchedTokens: [...tokens.slice(0, 2)] }
  })

  const picking = Boolean(pickLastOffer(ctx, tokens, raw))

  const product = runSafe('product', () => {
    if (picking) {
      return {
        intent: 'product',
        score: applyModifiers(8, 'product', [...tokens.slice(0, 3)], ctx, hasQuestion, veryShort, cfg),
        entities: ctx.entities,
        matchedTokens: [...tokens.slice(0, 3)],
      }
    }
    if (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw) || isOrderStatusAsk(tokens, raw)) return null
    if (isShippingAsk(tokens, raw) && !hasProductTerm(tokens) && !findTerm(tokens, liveCatalogParts()) && !findTerm(tokens, liveOtherParts())) {
      return null
    }
    const family = resolvePartFamily(tokens)
    if (family?.ambiguous) {
      return {
        intent: 'product',
        score: applyModifiers(8, 'product', ['freno'], ctx, hasQuestion, veryShort, cfg),
        entities: ctx.entities,
        matchedTokens: ['freno'],
      }
    }
    const hits = matchingProductsForTokens(tokens)
    const term = findTerm(tokens, liveCatalogParts()) || findTerm(tokens, keywordsOf('product'))
    if (!hits.length && !hasProductTerm(tokens) && !term) return null
    if (!hits.length) return null
    const scored = scoreMatch(tokens, [...liveCatalogParts(), ...keywordsOf('product')])
    const score = applyModifiers(Math.max(scored.score, hits.length ? 5 : 0), 'product', scored.matched, ctx, hasQuestion, veryShort, cfg)
    return { intent: 'product', score, entities: ctx.entities, matchedTokens: scored.matched }
  })

  const accessory = runSafe('accessory', () => {
    if (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw)) return null
    const term = findTerm(tokens, liveAccessoryTerms())
    if (!term) return null
    const scored = scoreMatch(tokens, [...liveAccessoryTerms(), ...keywordsOf('accessory')])
    return {
      intent: 'accessory',
      score: applyModifiers(Math.max(scored.score, 5), 'accessory', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched,
    }
  })

  const namedPart = runSafe('namedPart', () => {
    if (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw)) return null
    if (matchingProductsForTokens(tokens).length) return null
    const term = findTerm(tokens, liveOtherParts()) || findTerm(tokens, keywordsOf('namedPart'))
    if (!term) return null
    const scored = scoreMatch(tokens, [...liveOtherParts(), ...keywordsOf('namedPart')])
    return {
      intent: 'namedPart',
      score: applyModifiers(Math.max(scored.score, 5), 'namedPart', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched,
    }
  })

  const complaint = runSafe('complaint', () => {
    if (!isComplaintAsk(tokens, raw)) return null
    const matched = tokens.filter((token) =>
      ['queja', 'quejas', 'reclamo', 'reclamos', 'reclamar', 'quejar', 'pqr', 'molestia', 'garantia', 'devolucion', 'inconforme', 'inconformidad', 'defectuoso'].includes(token),
    )
    return {
      intent: 'complaint',
      score: applyModifiers(Math.max(8, matched.length ? 8 : 5), 'complaint', matched.length ? matched : [...tokens.slice(0, 2)], ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: matched.length ? matched : [...tokens.slice(0, 2)],
    }
  })

  const quote = runSafe('quote', () => {
    if (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw) || isOrderStatusAsk(tokens, raw)) return null
    const scored = scoreMatch(tokens, keywordsOf('quote', defaultKeywords('quote')))
    if (!scored.score) return null
    const priceCue = tokens.some((token) =>
      ['precio', 'precios', 'stock', 'cotizar', 'cotizacion', 'vale', 'cuesta', 'disponibilidad', 'valor', 'costo', 'cuanto', 'tarifa'].includes(token),
    )
    if (wantsAdvisorContact(tokens) && !priceCue) return null
    const extra = isBroadPriceAsk(tokens, raw) ? 3 : 0
    return {
      intent: 'quote',
      score: applyModifiers(scored.score + extra, 'quote', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched,
    }
  })

  const credit = runSafe('credit', () => {
    if (!isCreditAsk(tokens, raw)) return null
    const scored = scoreMatch(tokens, keywordsOf('credit', defaultKeywords('credit')))
    return {
      intent: 'credit',
      score: applyModifiers(Math.max(scored.score, 8), 'credit', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched.length ? scored.matched : [...tokens.slice(0, 3)],
    }
  })

  const payment = runSafe('payment', () => {
    if (picking) return null
    if (!isPaymentAsk(tokens, raw)) return null
    const scored = scoreMatch(tokens, keywordsOf('payment', defaultKeywords('payment')))
    return {
      intent: 'payment',
      score: applyModifiers(Math.max(scored.score, 8), 'payment', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched.length ? scored.matched : [...tokens.slice(0, 3)],
    }
  })

  const orderStatus = runSafe('orderStatus', () => {
    if (picking) return null
    if (!isOrderStatusAsk(tokens, raw)) return null
    const scored = scoreMatch(tokens, keywordsOf('orderStatus', defaultKeywords('orderStatus')))
    return {
      intent: 'orderStatus',
      score: applyModifiers(Math.max(scored.score, 8), 'orderStatus', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched.length ? scored.matched : [...tokens.slice(0, 3)],
    }
  })

  const shipping = runSafe('shipping', () => {
    if (picking) return null
    if (!isShippingAsk(tokens, raw)) return null
    const scored = scoreMatch(tokens, keywordsOf('shipping', defaultKeywords('shipping')))
    return {
      intent: 'shipping',
      score: applyModifiers(Math.max(scored.score, 8), 'shipping', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched.length ? scored.matched : [...tokens.slice(0, 3)],
    }
  })

  const vacancy = runSafe('vacancy', () => {
    const matched = tokens.filter((token) => (VACANCY_EXACT_WORDS as readonly string[]).includes(token))
    if (!matched.length) return null
    return {
      intent: 'vacancy',
      score: applyModifiers(8, 'vacancy', matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: matched,
    }
  })

  const chatOnes = intents
    .filter((intent) => intent.id !== 'greeting' && intent.id !== 'vacancy')
    .map((intent) =>
      runSafe(intent.id, () => {
        if (['complaint', 'quote', 'accessory', 'credit', 'payment', 'shipping', 'orderStatus'].includes(intent.id)) return null
        if (intent.id === 'attention' && (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw) || isShippingAsk(tokens, raw) || isOrderStatusAsk(tokens, raw))) return null
        if (
          intent.id === 'location' &&
          (isOrderStatusAsk(tokens, raw) ||
            tokens.some((token) => (VACANCY_EXACT_WORDS as readonly string[]).includes(token)))
        ) {
          return null
        }
        if (intent.id === 'company' && isBrandLineAsk(tokens, raw)) {
          return {
            intent: 'company',
            score: applyModifiers(8, 'company', tokens.filter((token) => ['marca', 'marcas'].includes(token)), ctx, hasQuestion, veryShort, cfg),
            entities: ctx.entities,
            matchedTokens: ['marcas'],
          }
        }
        if (
          intent.id === 'whatsapp' &&
          wantsAdvisorContact(tokens) &&
          !tokens.some((token) => ['whatsapp', 'telefono', 'correo', 'email', 'wsp', 'wa', 'mail'].includes(token))
        ) {
          return null
        }
        if (
          intent.id === 'location' &&
          wantsAdvisorContact(tokens) &&
          !tokens.some((token) =>
            ['direccion', 'ubicacion', 'ubicados', 'sede', 'local', 'sucursal', 'mapa', 'maps', 'horario', 'horarios', 'hora', 'horas', 'abre', 'abren', 'abierto', 'cierra', 'cierran', 'medellin', 'ciudad', 'encuentran', 'alpujarra', 'llegar'].includes(token),
          )
        ) {
          return null
        }
        const scored = scoreMatch(tokens, intent.keywords)
        if (!scored.score) return null
        return {
          intent: intent.id,
          score: applyModifiers(scored.score, intent.id, scored.matched, ctx, hasQuestion, veryShort, cfg),
          entities: ctx.entities,
          matchedTokens: scored.matched,
        }
      }),
    )

  const greeting = runSafe('greeting', () => {
    const scored = scoreMatch(tokens, keywordsOf('greeting', defaultKeywords('greeting')))
    if (!scored.score) return null
    return {
      intent: 'greeting',
      score: applyModifiers(scored.score, 'greeting', scored.matched, ctx, hasQuestion, veryShort, cfg),
      entities: ctx.entities,
      matchedTokens: scored.matched,
    }
  })

  return [team, product, accessory, namedPart, complaint, quote, credit, payment, shipping, orderStatus, vacancy, ...chatOnes, greeting].filter(
    (item): item is Candidate => Boolean(item && item.score > 0),
  )
}

export type RankedIntents = {
  top1: Candidate | null
  top2: Candidate | null
  delta: number
  secundarios: Candidate[]
}

export function rankIntents(candidates: Candidate[], cfg: PipelineConfig): RankedIntents {
  const ordered = [...candidates].sort((left, right) => right.score - left.score)
  const usable = ordered.filter((item) => item.score >= cfg.UMBRAL_SECUNDARIO)
  const top1 = usable[0] || null
  const top2 = usable[1] || null
  const delta = (top1?.score || 0) - (top2?.score || 0)
  const secundarios = usable.slice(1).slice(0, cfg.MAX_SECUNDARIOS)
  return { top1, top2, delta, secundarios }
}

const COMPATIBLE = new Set([
  'greeting+quote',
  'quote+greeting',
  'greeting+product',
  'product+greeting',
  'greeting+catalog',
  'catalog+greeting',
  'catalog+whatsapp',
  'whatsapp+catalog',
  'catalog+product',
  'product+catalog',
  'greeting+whatsapp',
  'whatsapp+greeting',
  'quote+product',
  'product+quote',
  'quote+namedPart',
  'namedPart+quote',
  'quote+accessory',
  'accessory+quote',
  'complaint+product',
  'product+complaint',
  'thanks+greeting',
  'greeting+thanks',
  'attention+teamGroup',
  'teamGroup+attention',
  'attention+teamMember',
  'teamMember+attention',
  'attention+whatsapp',
  'whatsapp+attention',
  'company+teamGroup',
  'teamGroup+company',
  'payment+product',
  'product+payment',
  'payment+quote',
  'quote+payment',
  'credit+payment',
  'payment+credit',
])

export function areCompatible(left: string, right: string) {
  return isSecondaryIntent(left) || isSecondaryIntent(right) || COMPATIBLE.has(`${left}+${right}`)
}

export function shouldDisambiguate(ranked: RankedIntents, cfg: PipelineConfig) {
  if (!ranked.top1 || !ranked.top2) return false
  if (areCompatible(ranked.top1.intent, ranked.top2.intent)) return false
  return ranked.delta < cfg.DELTA_EMPATE
}
