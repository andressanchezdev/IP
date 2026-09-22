import { sha1 } from './sha1'
import { applyBotText, interpolate } from './botSettings'
import type { SessionContext } from './sessionContext'
import type { Candidate } from './matchers'
import { isSecondaryIntent } from './matchers'
import {
  accessoryReply,
  attentionReply,
  catalogReply,
  companyReply,
  complaintReply,
  returnsReply,
  farewellReply,
  greetingReply,
  handoffReply,
  humanTopic,
  locationReply,
  creditReply,
  paymentReply,
  shippingReply,
  orderStatusReply,
  menuReply,
  namedPartReply,
  partsReply,
  priceCardActions,
  productReply,
  quoteReply,
  socialReply,
  teamMatchReply,
  thanksReply,
  vacancyReply,
  withHowToBuy,
  whatsappReply,
  type ChatAction,
  type ChatReply,
} from './intents'
import { livePublishedTeam } from './botip/liveData'
import { matchLandingTeam, wantsAdvisorContact } from './teamLookup'
import { classifyTurn, isAdvisorAsk, mergeFocusTokens } from './conversationThread'

export type HandlerFn = (tokens: readonly string[], ctx: SessionContext) => ChatReply

export const HANDLERS: Record<string, HandlerFn> = {
  greeting: (_tokens, ctx) => greetingReply(ctx),
  whatsapp: () => whatsappReply(),
  catalog: (tokens) => withHowToBuy(catalogReply(tokens), tokens),
  parts: () => partsReply(),
  accessory: (tokens, ctx) => accessoryReply(tokens, ctx),
  attention: (tokens, ctx) => {
    const match = matchLandingTeam(tokens)
    if (match) return teamMatchReply(match, tokens)
    if (wantsAdvisorContact(tokens) || isAdvisorAsk(tokens, ctx.lastUserText || '')) {
      return teamMatchReply({ type: 'group', group: 'asesor', members: livePublishedTeam('asesor') }, tokens)
    }
    return attentionReply()
  },
  complaint: () => complaintReply(),
  returns: () => returnsReply(),
  quote: (tokens, ctx) => withHowToBuy(quoteReply(tokens, ctx), tokens),
  vacancy: () => vacancyReply(),
  location: (tokens, ctx) => locationReply(tokens, ctx.lastUserText || ''),
  credit: () => creditReply(),
  payment: (tokens, ctx) => paymentReply(tokens, ctx),
  shipping: () => shippingReply(),
  orderStatus: () => orderStatusReply(),
  company: () => companyReply(),
  social: () => socialReply(),
  thanks: () => thanksReply(),
  farewell: () => farewellReply(),
  product: (tokens, ctx) => withHowToBuy(productReply(tokens, ctx) || catalogReply(tokens), tokens),
  namedPart: (tokens, ctx) => namedPartReply(tokens, ctx) || partsReply(),
  teamMember: (tokens) => {
    const match = matchLandingTeam(tokens)
    return match ? teamMatchReply(match, tokens) : companyReply()
  },
  teamGroup: (tokens) => {
    const match = matchLandingTeam(tokens)
    return match ? teamMatchReply(match, tokens) : companyReply()
  },
  teamSuggest: (tokens) => {
    const match = matchLandingTeam(tokens)
    return match ? teamMatchReply(match, tokens) : companyReply()
  },
}

export function runHandler(intent: string, tokens: readonly string[], ctx: SessionContext): ChatReply {
  const handler = HANDLERS[intent]
  if (!handler) return { text: applyBotText('fallback', 'No relacioné la consulta.', { term: intent }), actions: [] }
  try {
    const kind = classifyTurn(tokens, ctx.lastUserText || '', ctx)
    const nextTokens =
      kind === 'continue' &&
      (intent === 'quote' || intent === 'product' || intent === 'namedPart' || intent === 'accessory')
        ? mergeFocusTokens(tokens, ctx)
        : tokens
    if (kind === 'aside' || kind === 'social') ctx.holdFocus = true
    return handler(nextTokens, ctx)
  } catch {
    ctx.errorCount += 1
    ctx.metrics.handlerErrors += 1
    return { text: applyBotText('fallback', 'No relacioné la consulta.', { term: intent }), actions: [] }
  }
}

function payloadKey(intent: string, entities: SessionContext['entities']) {
  if (intent === 'quote') return { pieza: entities.pieza || entities.producto || '' }
  if (intent === 'product') return { producto: entities.producto || entities.pieza || '' }
  if (intent === 'greeting' || intent === 'thanks' || intent === 'farewell') return {}
  return { intent, pieza: entities.pieza || '', producto: entities.producto || '' }
}

export function responseHash(intent: string, entities: SessionContext['entities']) {
  return sha1(`${intent}${JSON.stringify(payloadKey(intent, entities))}`)
}

function uniqueActions(actions: ChatAction[]) {
  const seen = new Set<string>()
  const list: ChatAction[] = []
  for (const action of actions) {
    const key = `${action.kind || ''}|${action.href || ''}|${action.search || ''}|${action.label}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(action)
    if (list.length >= 3) break
  }
  return list
}

function uniqueOptions(options: ChatAction[]) {
  const seen = new Set<string>()
  const list: ChatAction[] = []
  for (const action of options) {
    const key = `${action.kind || ''}|${action.prompt || action.search || action.href || ''}|${action.label}`
    if (seen.has(key)) continue
    seen.add(key)
    list.push(action)
  }
  return list
}

export function mergeReplies(parts: ChatReply[], intents: string[] = []): ChatReply {
  const options = uniqueOptions(parts.flatMap((item) => item.options ?? []))
  const actions = uniqueActions(parts.flatMap((item) => item.actions))
  const aligned = intents.length === parts.length && parts.length > 1
  const social = new Set(['greeting', 'thanks', 'farewell'])
  const hasBody = aligned && intents.some((id) => !social.has(id))
  const shortLead = (intent: string) => {
    if (intent === 'greeting') return 'Hola.'
    if (intent === 'thanks') return 'Con gusto.'
    if (intent === 'farewell') return 'Hasta luego.'
    return ''
  }
  const text = hasBody
    ? [intents.map(shortLead).filter(Boolean).join(' '), parts.filter((_, index) => !social.has(intents[index])).map((item) => item.text.trim()).filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' ')
    : parts.map((item) => item.text.trim()).filter(Boolean).join(' ')
  const catalogCommand = parts.find((item) => item.catalogCommand)?.catalogCommand
  return {
    text: interpolate(text),
    actions,
    ...(options.length ? { options } : {}),
    ...(catalogCommand ? { catalogCommand } : {}),
  }
}

export function applyAntiRepetition(
  reply: ChatReply,
  intent: string,
  ctx: SessionContext,
  hash: string,
): { reply: ChatReply; variantIndex: number } {
  const recent = ctx.lastResponses.slice(-3)
  const usedTexts = recent.filter((item) => item.intent === intent).map((item) => item.text)
  const hit = recent.some((item) => item.hash === hash)
  let text = reply.text
  let variantIndex = 0

  if (hit || usedTexts.includes(text)) {
    if (intent === 'disambiguation' || intent === 'howAreYou' || intent === 'teamGroup' || intent === 'teamMember' || intent === 'quote' || intent === 'product' || intent === 'location' || intent === 'credit' || intent === 'payment' || intent === 'shipping' || intent === 'orderStatus' || intent === 'returns') {
      return { reply, variantIndex: 0 }
    }
    const socialIntent = intent === 'greeting' || intent === 'thanks' || intent === 'farewell'
    const completeReply = reply.actions.length > 0 || (reply.options?.length ?? 0) > 0 || text.length > 90
    if (socialIntent && completeReply) {
      return { reply: { ...reply, text: interpolate(text) }, variantIndex: 0 }
    }
    const rotated = applyBotText(
      intent,
      text,
      {
        term: ctx.entities.pieza || ctx.entities.producto || ctx.entities.accesorio || humanTopic(intent),
        names: ctx.entities.producto || ctx.entities.pieza || '',
      },
      { language: ctx.language, avoid: usedTexts, seed: `${intent}-${ctx.turn}` },
    )
    if (rotated && rotated !== text && !/\{[a-zA-Z]+\}/.test(rotated)) {
      text = rotated
      variantIndex = 1
    } else if (intent !== 'disambiguation' && !ctx.skipTemplateDefault) {
      const hasConcrete =
        Boolean(ctx.conversationFocus?.label) ||
        Boolean(ctx.entities.producto) ||
        Boolean(ctx.entities.pieza)
      if (!hasConcrete) {
        text = `${text} ${applyBotText(
          'ackRepeat',
          'Si quieres avanzamos: dime marca y modelo, o te paso con un asesor.',
          { topic: humanTopic(ctx.lastTopIntent || intent) },
          { language: ctx.language, seed: `follow-${ctx.turn}` },
        )}`
        variantIndex = 2
      }
    }
  }

  if (
    !ctx.skipTemplateDefault
    && ctx.lastResponses[ctx.lastResponses.length - 1]?.text === text
    && intent !== 'disambiguation'
    && intent !== 'howAreYou'
  ) {
    text = `${text} ${applyBotText(
      'disambiguation',
      '¿Seguimos con {left} o prefieres {right}?',
      { left: 'esto mismo', right: 'cambiar de tema' },
      { language: ctx.language, seed: `ask-${ctx.turn}` },
    )}`
    variantIndex = 3
  }

  return { reply: { ...reply, text: interpolate(text) }, variantIndex }
}

export function withAck(prefix: string, reply: ChatReply): ChatReply {
  if (!prefix.trim()) return reply
  return { ...reply, text: interpolate(`${prefix.trim()} ${reply.text}`) }
}

export function withMenuAndHandoff(reply: ChatReply, ctx: SessionContext): ChatReply {
  const extra: ChatReply[] = [reply]
  if (ctx.offerMenu) extra.push(menuReply())
  if (ctx.offerHumanHandoff) {
    extra.push(handoffReply())
    ctx.metrics.handoffs += 1
  }
  return extra.length === 1 ? reply : mergeReplies(extra)
}

export function suggestionActions(ctx: SessionContext): ChatAction[] {
  const actions: ChatAction[] = []
  const term = ctx.entities.pieza || ctx.entities.producto || ''
  if (term) {
    actions.push(...priceCardActions(term))
  }
  if (ctx.topicStack.some((item) => item.startsWith('accessory') || item.startsWith('product'))) {
    actions.push({ href: '/', label: 'Ver catálogo' })
  }
  return uniqueActions(actions)
}

export function attachSuggestions(reply: ChatReply, ctx: SessionContext): ChatReply {
  if (reply.actions.length >= 2) return reply
  return { ...reply, actions: uniqueActions([...reply.actions, ...suggestionActions(ctx)].slice(0, 2)) }
}

export function combineCandidates(primary: Candidate, secundarios: Candidate[], tokens: readonly string[], ctx: SessionContext) {
  // Absorbe contactos genéricos; no mezcla whatsapp con quote/shipping.
  // Combinación rica permitida: product+quote, product+shipping, quote+shipping (máx. 2).
  const absorbed: Record<string, string[]> = {
    catalog: ['attention', 'parts', 'payment', 'vacancy', 'location'],
    quote: ['attention', 'catalog', 'parts', 'product', 'payment', 'vacancy', 'location'],
    parts: ['catalog', 'attention', 'vacancy', 'location'],
    product: ['catalog', 'attention', 'payment', 'vacancy', 'location'],
    namedPart: ['parts', 'vacancy', 'location'],
    location: ['attention'],
    credit: ['attention', 'payment'],
    payment: ['attention', 'catalog', 'product', 'quote'],
    shipping: ['attention', 'catalog'],
    orderStatus: ['attention', 'catalog', 'product', 'quote', 'shipping', 'location'],
    vacancy: ['attention', 'location', 'catalog', 'product', 'quote'],
    company: ['attention'],
    complaint: ['attention'],
    returns: ['attention', 'product', 'catalog', 'quote', 'namedPart', 'complaint', 'parts', 'accessory', 'payment'],
    teamGroup: ['attention', 'company', 'location'],
    teamMember: ['attention', 'company'],
    teamSuggest: ['attention', 'company'],
    attention: ['teamGroup', 'teamMember', 'teamSuggest', 'location'],
  }
  const pairOk = (left: string, right: string) => {
    const set = new Set([left, right])
    return (
      (set.has('product') && set.has('shipping')) ||
      (set.has('quote') && set.has('shipping'))
    )
  }
  const skip = new Set(absorbed[primary.intent] ?? [])
  const extra = secundarios.filter((item) => {
    if (item.intent === primary.intent) return false
    if (item.intent === 'whatsapp') return false
    if (skip.has(item.intent) && !pairOk(primary.intent, item.intent)) return false
    if (!pairOk(primary.intent, item.intent) && !isSecondaryIntent(item.intent)) return false
    return true
  })
  const ordered = [primary, ...extra].slice(0, 2)
  ctx.activeHandlers = ordered.map((item) => item.intent)
  const parts = ordered.map((item) => runHandler(item.intent, tokens, ctx))
  return mergeReplies(parts, ordered.map((item) => item.intent))
}
