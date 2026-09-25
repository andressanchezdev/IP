import { expandPartSynonyms, explainPartText, isExplainPartAsk, matchSymptom, needsVehicleForCompat } from './expertise'
import { classifyUnmatched, companyHintWord } from './unmatchedKind'
import { findTerm, liveAccessoryTerms, liveCatalogParts, liveMotoTerms, liveOtherParts, hasProductObject, hasPurchaseOrPartIntent, listPartFamilies, oppositePositionPair, positionForFamily, resolvePartFamily } from './motoParts'
import { correctTokensContextual, expandStuckTokens, nearestLexiconGuess } from './matchIntent'
import { liveInventory } from './botip/liveData'
import { hydrateChatProducts } from './productSource'
import { getBotSettings, interpolate, keywordsOf } from './botSettings'
import { clampPipelineConfig } from './pipelineConfig'
import { countOccurrences, isDefineQuestion, isHowAreYou, isGreetingToken, isSmallTalk, isThanksTalk, isStopToken, preProcess, prioritizeLong, hasRichPetitionSignals, tokenizeRaw, tokensEqual, type PreparedInput } from './prepare'
import { extractEntities, preferredTerms } from './entities'
import { isSecondaryIntent, rankIntents, runAllMatchers, shouldDisambiguate, type Candidate } from './matchers'
import {
  applyAntiRepetition,
  attachSuggestions,
  combineCandidates,
  responseHash,
  runHandler,
  withAck,
  withMenuAndHandoff,
} from './composeReply'
import {
  ackKeywordReply,
  ackRepeatReply,
  catalogReply,
  COMPANY_NAME_TOKENS,
  clarificationReply,
  companyHintReply,
  companyReply,
  creatureUnmatchedReply,
  disambiguationReply,
  partConflictReply,
  fallbackReply,
  foodUnmatchedReply,
  getChatIntents,
  greetingReply,
  howAreYouReply,
  thanksReply,
  insultUnmatchedReply,
  INTENT_FOCUS_LABELS,
  INTENT_LABELS,
  matchingProductsForTokens,
  rectifyFocusReply,
  rectifyTypoReply,
  personUnmatchedReply,
  productTokensFromLabel,
  choiceReply,
  teamMatchReply,
  sexualUnmatchedReply,
  socialDefineReply,
  userNameAckReply,
  vehicleUnmatchedReply,
  violenceUnmatchedReply,
  humanTopic,
  newTopicPromptReply,
  switchMissReply,
  vacancyReply,
  returnsReply,
  paymentReply,
  complaintReply,
  executiveReply,
  symptomGuidanceReply,
  compatibilityAskReply,
  explainPartReply,
  type ChatReply,
} from './intents'
import {
  loadSession,
  saveSession,
  sliceWindow,
  type SessionContext,
} from './sessionContext'
import { clearLastOffers } from './inventory'
import { pushPhaseLog } from './pipelineLog'
import { matchLandingTeam } from './teamLookup'
import { parseUserFrame, isTeamNameLookupAllowed } from './userFrame'
import { classifyTurn, focusLabel, isFollowUpTurn, isProductSeekingAsk, isReturnsAsk, isVacancyAsk, isComplaintAsk, isPaymentAsk, isExecutiveAsk, isCreateOrderAsk, isThreadReleaseAsk, isOrderProcessAsk, isCreditAsk, isHoursAsk, isLocationAsk, isShippingAsk, releaseRemainder, keepConversationFocus, liveShippingCues, mentionedFamily, mergeFocusTokens, nextConversationFocus, pareceCodigo, searchMissGuideText } from './conversationThread'
import { isScaffoldActive, openScaffold, resetScaffold, resumeScaffoldQuestion, runScaffoldTurn, scaffoldAsideReply } from './scaffoldSearch'
import { isOrderFlowActive, resetOrderFlow, runOrderFlowTurn, beginAddFromLastOffer, orderProcessGuideReply } from './createOrderFlow'
import { tryFastLaneReply } from './agentLane'
import { buildReplyContext } from './replyContext'

const AFFIRM = new Set(['si', 'ok', 'dale', 'claro', 'yes', 'yep', 'perfecto'])
const NEGATE = new Set(['no', 'nope', 'nel', 'nada'])
const FORGET = new Set(['olvidalo', 'olvidar', 'cancelar'])
const ALSO = new Set(['tambien', 'tambien'])
const OTHER = new Set(['otro', 'otra'])
const SAME = new Set(['ese', 'esa', 'eso', 'mismo', 'misma'])
const FIRST_CHOICE = new Set(['1', 'primera', 'primero', 'uno', 'izquierda'])
const SECOND_CHOICE = new Set(['2', 'segunda', 'segundo', 'dos', 'derecha'])

function foldText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function labelWords(label: string) {
  return foldText(label)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
}

function mentionsChoice(label: string, other: string, tokens: readonly string[], raw: string) {
  const text = foldText(raw)
  const foldedLabel = foldText(label)
  if (foldedLabel && text.includes(foldedLabel)) return true
  const mine = labelWords(label)
  const shared = new Set(labelWords(other))
  const unique = mine.filter((word) => !shared.has(word))
  const pool = unique.length ? unique : mine
  return pool.some((word) =>
    tokens.some((token) => token === word || (token.length >= 3 && (token.startsWith(word) || word.startsWith(token)))),
  )
}

function ordinalChoice(raw: string, tokens: readonly string[]) {
  const text = foldText(raw)
    .replace(/[¿?¡!.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (
    /^(1|primera|primero|uno|izquierda|la primera|el primero|la 1|el 1|opcion 1|la opcion 1)$/.test(text) ||
    tokens.some((token) => FIRST_CHOICE.has(token))
  ) {
    return 'first'
  }
  if (
    /^(2|segunda|segundo|dos|derecha|la segunda|el segundo|la 2|el 2|opcion 2|la opcion 2|el otro|otro|la otra)$/.test(text) ||
    tokens.some((token) => SECOND_CHOICE.has(token) || OTHER.has(token))
  ) {
    return 'second'
  }
  return null
}

function applyFamilyChoice(ctx: SessionContext, label: string, payload: Record<string, unknown>) {
  ctx.pendingConfirmation = null
  const positions = payload.positions && typeof payload.positions === 'object'
    ? payload.positions as Record<string, string>
    : {}
  const chosen = String(payload.chosen || '')
  const position = String(
    positions[chosen] ||
    positions[label] ||
    ctx.entities.posicion ||
    '',
  )
  const modelo = String(payload.modelo || ctx.entities.modelo || '')
  const marca = String(payload.marca || ctx.entities.marca || '')
  ctx.entities.pieza = label
  ctx.entities.producto = label
  if (position) ctx.entities.posicion = position
  if (modelo) ctx.entities.modelo = modelo
  if (marca) ctx.entities.marca = marca
  const family = resolvePartFamily(label.split(/\s+/).filter(Boolean)) || { id: label, label, ambiguous: false }
  return finalize(
    ctx,
    openScaffold(ctx, family, { position, model: modelo, brand: marca, partTerm: family.label }),
    'product',
    6,
    configOf(),
  )
}

function applyProductChoice(ctx: SessionContext, label: string) {
  ctx.pendingConfirmation = null
  ctx.entities.producto = label
  ctx.entities.pieza = labelWords(label)[0] || ctx.entities.pieza
  const tokens = productTokensFromLabel(label)
  return finalize(ctx, runHandler('product', tokens, ctx), 'product', 6, configOf())
}

function resolvePendingPair(
  ctx: SessionContext,
  pending: NonNullable<SessionContext['pendingConfirmation']>,
  label: string,
  tokens: readonly string[],
  side: 'left' | 'right',
) {
  const kind = String(pending.payload.kind || (pending.payload.previous && pending.payload.next ? 'product' : 'intent'))
  if (kind === 'intent') {
    ctx.pendingConfirmation = null
    const intent = side === 'right'
      ? String(pending.payload.rightIntent || pending.intent)
      : String(pending.payload.intent || pending.intent)
    return finalize(ctx, runHandler(intent, tokens, ctx), intent, 5, configOf())
  }
  const family = resolvePartFamily(String(label).split(/\s+/).filter(Boolean))
  if (family && !family.ambiguous) return applyFamilyChoice(ctx, family.label, { ...pending.payload, chosen: label })
  return applyProductChoice(ctx, label)
}

function handlePending(tokens: readonly string[], ctx: SessionContext, prepared: PreparedInput, raw: string): ChatReply | null {
  if (isOrderFlowActive(ctx)) return null
  const pending = ctx.pendingConfirmation
  if (!pending) return null
  const significant = prepared.significant.length ? prepared.significant : prepared.allTokens
  const previous = String(pending.payload.previous || '')
  const nextLabel = String(pending.payload.next || '')
  const kind = String(pending.payload.kind || (previous && nextLabel ? 'product' : 'intent'))
  const isYes =
    (significant.some((token) => AFFIRM.has(token)) && significant.length <= 3) ||
    /^(si|ok|dale|claro|yes|yep|perfecto)$/.test(foldText(raw).trim())
  const isNo = significant.some((token) => NEGATE.has(token)) && !significant.some((token) => token === 'el' || OTHER.has(token))
  const ordinal = ordinalChoice(raw, significant)
  const picksFirst = ordinal === 'first'
  const picksSecond = ordinal === 'second'

  if (previous && nextLabel) {
    const leftHit = mentionsChoice(previous, nextLabel, significant, raw)
    const rightHit = mentionsChoice(nextLabel, previous, significant, raw)
    if (leftHit && !rightHit) {
      return resolvePendingPair(ctx, pending, previous, tokens, 'left')
    }
    if (rightHit && !leftHit) {
      return resolvePendingPair(ctx, pending, nextLabel, tokens, 'right')
    }
    if (picksFirst && !picksSecond) {
      return resolvePendingPair(ctx, pending, previous, tokens, 'left')
    }
    if (picksSecond && !picksFirst) {
      return resolvePendingPair(ctx, pending, nextLabel, tokens, 'right')
    }
    if (isYes || isNo) {
      return finalize(ctx, choiceReply(previous, nextLabel), 'disambiguation', 4, configOf())
    }
    const catalogHits = matchingProductsForTokens(significant)
    const otherHit = catalogHits.find((item) => item.label !== previous && item.label !== nextLabel)
    if (otherHit && significant.length >= 2) {
      ctx.pendingConfirmation = null
      return null
    }
    if (significant.length <= 2 && !otherHit) {
      return finalize(ctx, choiceReply(previous, nextLabel), 'disambiguation', 4, configOf())
    }
    ctx.pendingConfirmation = null
    return null
  }

  if (isYes || (String(pending.payload.kind || '') === 'typo' && ordinal === 'first')) {
    ctx.pendingConfirmation = null
    const intent = String(pending.payload.intent || pending.intent)
    const guess = String(pending.payload.guess || '')
    const nextTokens = guess && !tokens.includes(guess) ? [...tokens.filter((token) => !AFFIRM.has(token)), guess] : tokens
    const reply = runHandler(intent, nextTokens, ctx)
    return finalize(ctx, reply, intent, 5, configOf())
  }
  if (isNo && significant.some((token) => OTHER.has(token))) {
    ctx.pendingConfirmation = null
    const alt = String(pending.payload.rightIntent || '')
    if (alt) {
      const reply = runHandler(alt, tokens, ctx)
      return finalize(ctx, reply, alt, 5, configOf())
    }
  }
  if (isNo) {
    ctx.pendingConfirmation = null
    return finalize(ctx, { text: 'Listo, lo dejamos ahí. Dime otra consulta cuando quieras.', actions: [] }, 'thanks', 3, configOf())
  }

  const optionLabels = Array.isArray(pending.payload.options)
    ? (pending.payload.options as unknown[]).filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : []
  if (optionLabels.length) {
    const folded = foldText(raw)
      .replace(/[¿?¡!.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const byName = optionLabels.find((label) => {
      const name = foldText(label)
      const parts = name.split(/[^a-z0-9]+/).filter((part) => part.length > 1)
      return name === folded || parts.includes(folded)
    })
    const numeric = Number.parseInt(folded, 10)
    const byIndex = /^\d+$/.test(folded) && numeric >= 1 && numeric <= optionLabels.length ? optionLabels[numeric - 1] : ''
    const chosen = byName || byIndex
    if (chosen) {
      ctx.pendingConfirmation = null
      const chosenTokens = tokenizeRaw(chosen)
      const team = matchLandingTeam(chosenTokens)
      if (team) {
        const intent =
          team.type === 'member' ? 'teamMember' : team.type === 'suggest' ? 'teamSuggest' : 'teamGroup'
        return finalize(ctx, teamMatchReply(team, chosenTokens), intent, 8, configOf())
      }
      return null
    }
  }

  ctx.pendingConfirmation = null
  return null
}

function isDomainToken(token: string) {
  if (token.length < 4) return false
  if (COMPANY_NAME_TOKENS.has(token)) return true
  if (liveMotoTerms().includes(token)) return true
  return getChatIntents().some((intent) => intent.keywords.includes(token))
}

function log(ctx: SessionContext, phase: Parameters<typeof pushPhaseLog>[1]['phase'], detail: string) {
  pushPhaseLog(ctx.phaseLog, { turn: ctx.turn, phase, detail })
}

function configOf() {
  return clampPipelineConfig(getBotSettings().pipeline)
}

function dictionary(ctx: SessionContext) {
  const intents = getChatIntents()
  const inventoryWords = liveInventory().flatMap((item) =>
    item.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2),
  )
  return [
    ...new Set([
      ...intents.flatMap((item) => item.keywords),
      ...liveMotoTerms(),
      ...preferredTerms(ctx.entities),
      ...liveShippingCues(),
      ...inventoryWords,
    ]),
  ]
}

function intentForGuess(guess: string) {
  if (liveShippingCues().has(guess)) return 'shipping'
  if (findTerm([guess], liveCatalogParts())) return 'product'
  if (findTerm([guess], liveOtherParts())) return 'namedPart'
  if (findTerm([guess], liveAccessoryTerms())) return 'accessory'
  const hit = getChatIntents().find((intent) => intent.keywords.includes(guess))
  return hit?.id || 'product'
}

function specialUnmatched(raw: string, tokens: readonly string[]): ChatReply | null {
  const company = companyHintWord(tokens)
  if (company) return companyHintReply(company)
  const unmatched = classifyUnmatched(tokens)
  if (unmatched.kind === 'insult') return insultUnmatchedReply()
  if (unmatched.kind === 'sexual') return sexualUnmatchedReply()
  if (unmatched.kind === 'violence') return violenceUnmatchedReply(unmatched.word)
  if (unmatched.kind === 'food') return foodUnmatchedReply(unmatched.word)
  if (unmatched.kind === 'creature') return creatureUnmatchedReply(unmatched.word)
  if (unmatched.kind === 'vehicle') return vehicleUnmatchedReply(unmatched.word)
  if (unmatched.kind === 'person') return personUnmatchedReply(unmatched.word)
  void raw
  return null
}

function recoverUnmatched(ctx: SessionContext, raw: string, tokens: readonly string[], cfg: ReturnType<typeof configOf>): ChatReply {
  ctx.fallbackCount += 1
  ctx.errorCount += 1
  ctx.metrics.unmatched += 1
  log(ctx, 'decision', 'unmatched')
  const special = specialUnmatched(raw, tokens)
  if (special) {
    ctx.offerMenu = ctx.fallbackCount >= cfg.FALLBACK_MENU_AT
    ctx.offerHumanHandoff = ctx.errorCount >= cfg.HUMAN_HANDOFF_AT
    return finalize(ctx, special, 'fallback', 0, cfg)
  }
  if (hasProductObject(tokens)) {
    ctx.offerMenu = true
    ctx.offerHumanHandoff = ctx.errorCount >= cfg.HUMAN_HANDOFF_AT
    return finalize(
      ctx,
      {
        text: searchMissGuideText(),
        actions: [{ kind: 'focus-search', href: '/', label: 'Abrir barra de búsqueda' }],
      },
      'fallback',
      0,
      cfg,
    )
  }
  const label = focusLabel(ctx)
  const safeFocus = label && !INTENT_FOCUS_LABELS.has(label.toLowerCase()) ? label : ''
  if (safeFocus && ctx.conversationFocus) {
    return finalize(ctx, rectifyFocusReply(safeFocus), 'fallback', 0, cfg)
  }
  const guess = nearestLexiconGuess(tokens, dictionary(ctx))
  if (guess && guess !== 'pedido' && ctx.fallbackCount < cfg.FALLBACK_MENU_AT) {
    const intent = intentForGuess(guess)
    ctx.pendingConfirmation = { intent, payload: { intent, guess, kind: 'typo' } }
    return finalize(ctx, rectifyTypoReply(guess), 'fallback', 0, cfg)
  }
  ctx.offerMenu = true
  ctx.offerHumanHandoff = ctx.errorCount >= cfg.HUMAN_HANDOFF_AT
  return finalize(ctx, fallbackReply(raw), 'fallback', 0, cfg)
}

function topicOf(candidate: Candidate, ctx: SessionContext) {
  const piece = ctx.entities.pieza || ctx.entities.producto || ctx.entities.accesorio || ctx.entities.namedPart || ''
  return `${candidate.intent}${piece ? `:${piece}` : ''}`
}

function finalize(
  ctx: SessionContext,
  reply: ChatReply,
  intent: string,
  score: number,
  cfg: ReturnType<typeof configOf>,
) {
  const hash = responseHash(intent, ctx.entities)
  const anti = applyAntiRepetition(reply, intent, ctx, hash)
  let next: ChatReply
  if (ctx.skipTemplateDefault) {
    const topic = humanTopic(ctx.lastTopIntent || intent)
    const ack = ctx.ackPrefix || ackRepeatReply(topic).text
    const extra = ctx.pedirConcrecion ? ` ${ackKeywordReply(ctx.entities.pieza || ctx.entities.producto || 'eso').text}` : ''
    next = { ...anti.reply, text: `${ack}${extra}`.trim(), actions: anti.reply.actions.slice(0, 2) }
  } else {
    next = withAck(ctx.ackPrefix, anti.reply)
  }
  ctx.offerMenu = ctx.fallbackCount >= cfg.FALLBACK_MENU_AT
  ctx.offerHumanHandoff = ctx.errorCount >= cfg.HUMAN_HANDOFF_AT
  next = withMenuAndHandoff(next, ctx)
  next = attachSuggestions(next, ctx)

  if (score >= cfg.UMBRAL_MINIMO) {
    ctx.lastIntents = sliceWindow([...ctx.lastIntents, { intent, score, turn: ctx.turn }], cfg.WINDOW_INTENTS)
    if (score >= cfg.UMBRAL_TOPIC) {
      ctx.topicStack = [topicOf({ intent, score, entities: ctx.entities, matchedTokens: [] }, ctx), ...ctx.topicStack].slice(
        0,
        cfg.TOPIC_STACK,
      )
    }
    if (ctx.lastTopIntent && intent !== ctx.lastTopIntent && score >= cfg.UMBRAL_RESET && !keepConversationFocus(intent) && !ctx.holdFocus) {
      ctx.sameMsgStreak = 0
      ctx.repeatedKeywordStreak = {}
    }
    ctx.lastTopIntent = intent
    const focusTokens = tokenizeRaw(ctx.lastUserText || '')
    ctx.conversationFocus = nextConversationFocus(intent, ctx, score, cfg.UMBRAL_MINIMO, focusTokens, ctx.lastUserText)
    ctx.fallbackCount = 0
  }

  ctx.lastResponses = sliceWindow(
    [...ctx.lastResponses, { hash, intent, turn: ctx.turn, variantIndex: anti.variantIndex, text: next.text }],
    cfg.WINDOW_RESPONSES,
  )
  if (ctx.lastResponses.length >= 2) {
    const prev = ctx.lastResponses[ctx.lastResponses.length - 2]
    if (prev.text === next.text) ctx.metrics.consecutiveRepeats += 1
  }
  ctx.activeHandlers = []
  ctx.ackPrefix = ''
  ctx.skipTemplateDefault = false
  ctx.pedirConcrecion = false
  ctx.holdFocus = false
  const hasConcrete =
    Boolean(ctx.conversationFocus?.label) ||
    Boolean(ctx.entities.marca) ||
    Boolean(ctx.entities.modelo) ||
    Boolean(ctx.entities.producto) ||
    Boolean(ctx.entities.pieza)
  next = {
    ...next,
    text: interpolate(next.text, hasConcrete ? { ask: '' } : {}).replace(/\s{2,}/g, ' ').trim(),
    actions: next.actions.slice(0, 2),
  }
  if (
    ['teamGroup', 'teamMember', 'teamSuggest', 'attention'].includes(intent) &&
    next.options?.some((item) => item.kind === 'prompt')
  ) {
    ctx.pendingConfirmation = {
      intent: 'promptChoice',
      payload: {
        kind: 'prompt',
        options: next.options.map((item) => item.prompt || item.label),
      },
    }
  }
  log(ctx, 'finalize', intent)
  const replyCtx = buildReplyContext(ctx)
  log(ctx, 'context', [replyCtx.focusLabel, replyCtx.orderState, replyCtx.scaffoldState].filter(Boolean).join('|') || '—')
  log(ctx, 'emit', next.text.slice(0, 80))
  saveSession(ctx)
  return next
}

function updateContext(ctx: SessionContext, prepared: PreparedInput, cfg: ReturnType<typeof configOf>) {
  ctx.turn += 1
  const previous = ctx.userTokenHistory[ctx.userTokenHistory.length - 1]
  ctx.userTokenHistory = sliceWindow([...ctx.userTokenHistory, prepared.allTokens], cfg.WINDOW_TOKENS)
  if (previous && tokensEqual(previous, prepared.allTokens)) ctx.sameMsgStreak += 1
  else ctx.sameMsgStreak = 0
  const counts = countOccurrences(prepared.allTokens)
  for (const key of Object.keys(ctx.repeatedKeywordStreak)) {
    if (!counts[key]) delete ctx.repeatedKeywordStreak[key]
  }
  for (const [token, count] of Object.entries(counts)) {
    if (!isDomainToken(token)) continue
    ctx.repeatedKeywordStreak[token] = (ctx.repeatedKeywordStreak[token] || 0) + count
  }
  log(ctx, 'updateContext', `turn ${ctx.turn} streak ${ctx.sameMsgStreak}`)
}

function detectRepeated(ctx: SessionContext, cfg: ReturnType<typeof configOf>) {
  const topic = humanTopic(ctx.lastTopIntent || ctx.topicStack[0] || 'eso')
  if (ctx.sameMsgStreak >= 1) {
    ctx.ackPrefix = ackRepeatReply(topic).text
  }
  const noisy = Object.entries(ctx.repeatedKeywordStreak).find(([, count]) => count >= cfg.REPEATED_KEYWORD_K)
  if (noisy) {
    ctx.ackPrefix = [ctx.ackPrefix, ackKeywordReply(noisy[0]).text].filter(Boolean).join(' ')
    ctx.pedirConcrecion = true
  }
  log(ctx, 'detectRepeated', ctx.ackPrefix ? 'ack' : 'none')
}

function routeClearFrame(
  corrected: readonly string[],
  prepared: PreparedInput,
  raw: string,
  ctx: SessionContext,
  cfg: ReturnType<typeof configOf>,
): ChatReply | null {
  const define = isDefineQuestion(prepared.allTokens, raw)
  const significant = corrected.filter((token) => token.length > 2 && !isStopToken(token))
  const socialHit = significant.find((token) => keywordsOf('social').includes(token))
  const catalogHit = significant.find((token) => keywordsOf('catalog').includes(token))
  const companyHit = significant.some((token) => COMPANY_NAME_TOKENS.has(token))
  const hasPart = Boolean(
    findTerm(corrected, liveCatalogParts()) || findTerm(corrected, liveOtherParts()) || findTerm(corrected, liveAccessoryTerms()),
  )
  if (define && socialHit) return finalize(ctx, socialDefineReply(socialHit), 'social', 8, cfg)
  if (define && catalogHit) return finalize(ctx, catalogReply(), 'catalog', 8, cfg)
  if (companyHit && !hasPart && (define || significant.every((token) => COMPANY_NAME_TOKENS.has(token)))) {
    return finalize(ctx, companyReply(), 'company', 8, cfg)
  }
  return null
}

function resolveFromContext(tokens: readonly string[], ctx: SessionContext, cfg: ReturnType<typeof configOf>, raw = ''): Candidate | null {
  const kind = classifyTurn(tokens, raw, ctx)
  if (kind === 'switch' || kind === 'social' || kind === 'aside') return null
  const last = [...ctx.lastIntents].reverse().find((item) => !keepConversationFocus(item.intent)) || ctx.lastIntents[ctx.lastIntents.length - 1]
  const focusIntent = ctx.conversationFocus?.intent || last?.intent
  if (!focusIntent) return null
  if (last && last.score < cfg.UMBRAL_MINIMO && !ctx.conversationFocus) return null
  const refs = tokens.some((token) => ALSO.has(token) || SAME.has(token))
  const priceFollow = tokens.some((token) => keywordsOf('quote').includes(token))
  if (kind !== 'continue' && !refs && !priceFollow) return null
  const merged = kind === 'continue' ? mergeFocusTokens(tokens, ctx) : [...tokens]
  if (priceFollow) {
    return { intent: 'quote', score: Math.max(last?.score || 0, 5), entities: ctx.entities, matchedTokens: merged }
  }
  return { intent: focusIntent, score: Math.max(last?.score || 0, 5), entities: ctx.entities, matchedTokens: merged }
}

function fastLane(prepared: PreparedInput, ctx: SessionContext, cfg: ReturnType<typeof configOf>): ChatReply {
  const rawToken = prepared.significant[0] || prepared.allTokens[0] || ''
  const token = correctTokensContextual([rawToken], dictionary(ctx), preferredTerms(ctx.entities))[0] || rawToken
  log(ctx, 'inputQuality', 'VERY_SHORT')
  const frame = parseUserFrame(prepared.text, [token, rawToken].filter(Boolean))
  const extracted = extractEntities(frame.lookupTokens.length ? frame.lookupTokens : [token, rawToken], prepared.text, ctx.entities)
  ctx.entities = extracted.next
  if (frame.introducingSelf && frame.userName) {
    ctx.entities.userName = frame.userName
    return finalize(ctx, userNameAckReply(frame.userName), 'greeting', 5, cfg)
  }
  const shortKind = classifyTurn([token, rawToken].filter(Boolean), prepared.text, ctx)
  if (shortKind === 'switch' && !findTerm([token, rawToken], [...liveCatalogParts(), ...liveOtherParts(), ...liveAccessoryTerms()])) {
    ctx.conversationFocus = null
    ctx.entities.pieza = undefined
    ctx.entities.producto = undefined
    ctx.entities.namedPart = undefined
    ctx.entities.accesorio = undefined
    clearLastOffers(ctx)
    return finalize(ctx, newTopicPromptReply(), 'thanks', 4, cfg)
  }
  if (shortKind === 'continue' && ctx.conversationFocus) {
    const tokens = mergeFocusTokens([token, rawToken].filter(Boolean), ctx)
    const intent = keywordsOf('quote').includes(token) ? 'quote' : ctx.conversationFocus.intent
    return finalize(ctx, runHandler(intent, tokens, ctx), intent, 6, cfg)
  }
  if (isHowAreYou(prepared.text)) {
    return finalize(ctx, howAreYouReply(), 'howAreYou', 5, cfg)
  }
  if (
    (isSmallTalk(prepared.text) || keywordsOf('greeting').includes(token))
    && !hasPurchaseOrPartIntent([token, rawToken].filter(Boolean), prepared.text)
  ) {
    return finalize(ctx, greetingReply(ctx), 'greeting', 5, cfg)
  }
  const allowNames = isTeamNameLookupAllowed(frame, ctx.lastTopIntent, ctx.pendingConfirmation?.intent || null)
  const team = matchLandingTeam([token, rawToken].filter(Boolean), { allowNameLookup: allowNames })
  if (team) {
    const intent =
      team.type === 'member' ? 'teamMember' : team.type === 'suggest' ? 'teamSuggest' : 'teamGroup'
    return finalize(ctx, teamMatchReply(team, [token, rawToken]), intent, 8, cfg)
  }
  const catalogHits = matchingProductsForTokens([token, rawToken])
  const catalogTerm = findTerm([token, rawToken], liveCatalogParts())
  if (catalogHits.length || catalogTerm) {
    return finalize(ctx, runHandler('product', [token, rawToken], ctx), 'product', 6, cfg)
  }
  const intents = getChatIntents()
  const hit = intents.find((intent) => intent.keywords.includes(token))
  if (hit) return finalize(ctx, runHandler(hit.id, [token], ctx), hit.id, 5, cfg)
  if (findTerm([token], [...liveOtherParts(), ...liveAccessoryTerms()])) {
    ctx.pendingConfirmation = { intent: 'namedPart', payload: { intent: 'namedPart', token } }
    ctx.metrics.disambiguations += 1
    return finalize(ctx, ackKeywordReply(token), 'namedPart', 3, cfg)
  }
  return recoverUnmatched(ctx, prepared.text || token, [token, rawToken].filter(Boolean), cfg)
}

function emit(ctx: SessionContext, reply: ChatReply) {
  const next = { ...reply, text: interpolate(reply.text) }
  saveSession(ctx)
  return next
}

export async function answerLandingChat(raw: string): Promise<ChatReply> {
  const cfg = configOf()
  const ctx = loadSession()
  try {
    const prepared0 = preProcess(raw, ctx.language)
    if (prepared0.language !== ctx.language) {
      ctx.metrics.languageWarnings += 1
      log(ctx, 'preProcess', `language ${ctx.language} -> ${prepared0.language}`)
    }
    ctx.language = prepared0.language
    ctx.lastUserText = raw
    log(ctx, 'preProcess', prepared0.quality)

    if (prepared0.quality === 'EMPTY' || prepared0.quality === 'EMOJI_ONLY') {
      log(ctx, 'inputQuality', prepared0.quality)
      return emit(ctx, clarificationReply())
    }

    let prepared = prepared0
    if (prepared.quality === 'VERY_LONG' && !hasRichPetitionSignals(prepared.allTokens)) {
      const keys = [...getChatIntents().flatMap((item) => item.keywords), ...liveMotoTerms()]
      const tokens = prioritizeLong(prepared.allTokens, keys)
      prepared = { ...prepared, tokens, significant: tokens.filter((item) => !item.stop).map((item) => item.value) }
    }

    updateContext(ctx, prepared, cfg)

    if (isThreadReleaseAsk(raw) || prepared.allTokens.some((token) => FORGET.has(token))) {
      ctx.pendingConfirmation = null
      ctx.topicStack = []
      resetScaffold(ctx)
      resetOrderFlow(ctx)
      const leftover = releaseRemainder(raw)
      if (!leftover) {
        ctx.conversationFocus = null
        clearLastOffers(ctx)
        return finalize(ctx, { text: 'Listo, lo dejamos. El carrito se mantiene. ¿En qué te ayudo ahora?', actions: [] }, 'thanks', 4, cfg)
      }
      ctx.entities = {
        ...ctx.entities,
        pieza: undefined,
        producto: undefined,
        namedPart: undefined,
        accesorio: undefined,
      }
      clearLastOffers(ctx)
    }

    const pending = handlePending(prepared.significant, ctx, prepared, raw)
    if (pending) return pending

    const blocked = classifyUnmatched(prepared.significant.length ? prepared.significant : prepared.allTokens)
    if (blocked.kind === 'insult' || blocked.kind === 'sexual') {
      ctx.errorCount += 1
      log(ctx, 'filter', blocked.kind)
      const reply = blocked.kind === 'insult' ? insultUnmatchedReply() : sexualUnmatchedReply()
      saveSession(ctx)
      return withAck(ctx.ackPrefix, reply)
    }

    if (!isOrderFlowActive(ctx) && (isHowAreYou(raw) || isHowAreYou(prepared.text))) {
      return finalize(ctx, howAreYouReply(), 'howAreYou', 6, cfg)
    }

    if (
      !isOrderFlowActive(ctx)
      && !isFollowUpTurn(prepared.significant.length ? prepared.significant : prepared.allTokens, raw, ctx)
      && (isSmallTalk(raw) || isSmallTalk(prepared.text))
      && !hasPurchaseOrPartIntent(prepared.allTokens, raw)
      && !hasPurchaseOrPartIntent(prepared.significant, raw)
    ) {
      return finalize(ctx, greetingReply(ctx), 'greeting', 6, cfg)
    }

    const offerFresh = Date.now() - (ctx.lastOffersAt || 0) < 5 * 60 * 1000
    if (
      !isOrderFlowActive(ctx)
      && offerFresh
      && ctx.lastOffers?.length === 1
      && (ctx.lastTopIntent === 'product' || ctx.lastTopIntent === 'quote')
    ) {
      const folded = foldText(raw).trim()
      if (/^(si|ok|dale|claro|yes|perfecto)$/.test(folded)) {
        const add = beginAddFromLastOffer(ctx)
        if (add) return finalize(ctx, add, 'product', 9, cfg)
      }
      if (/^no$/.test(folded)) {
        clearLastOffers(ctx)
        return finalize(ctx, { text: 'Ok, no lo agregué.', actions: [] }, 'thanks', 4, cfg)
      }
    }

    if (!isOrderFlowActive(ctx) && (isThanksTalk(raw) || isThanksTalk(prepared.text))) {
      return finalize(ctx, thanksReply(), 'thanks', 4, cfg)
    }

    const seed = prepared.significant.length ? prepared.significant : prepared.allTokens
    const seekTokens = expandPartSynonyms(
      correctTokensContextual(expandStuckTokens(seed, dictionary(ctx)), dictionary(ctx), preferredTerms(ctx.entities)),
      raw,
    ).filter((token) => !isGreetingToken(token))
    if (isExecutiveAsk(seekTokens, raw)) {
      return finalize(ctx, executiveReply(), 'attention', 9, cfg)
    }
    if (isComplaintAsk(seekTokens, raw)) {
      return finalize(ctx, complaintReply(), 'complaint', 9, cfg)
    }
    if (isReturnsAsk(seekTokens, raw)) {
      return finalize(ctx, returnsReply(), 'returns', 6, cfg)
    }
    /* Fast lane (FAQ empresa/contacto): también escapa pedido/scaffold sin LLM. */
    if (!pareceCodigo(raw) && !isCreateOrderAsk(seekTokens, raw)) {
      const fast = tryFastLaneReply(ctx, seekTokens, raw)
      if (fast) {
        const fastIntent = isPaymentAsk(seekTokens, raw)
          ? 'payment'
          : isCreditAsk(seekTokens, raw)
            ? 'credit'
            : isShippingAsk(seekTokens, raw)
              ? 'shipping'
              : isLocationAsk(seekTokens, raw) || isHoursAsk(seekTokens, raw)
                ? 'location'
                : isExecutiveAsk(seekTokens, raw)
                  ? 'attention'
                  : 'company'
        return finalize(ctx, fast, fastIntent, 9, cfg)
      }
    }
    if (!isOrderFlowActive(ctx) && isOrderProcessAsk(seekTokens, raw)) {
      return finalize(ctx, orderProcessGuideReply(), 'product', 8, cfg)
    }
    if (pareceCodigo(raw) || isCreateOrderAsk(seekTokens, raw) || isOrderFlowActive(ctx)) {
      const orderReply = await runOrderFlowTurn(ctx, seekTokens, raw)
      if (orderReply) {
        return finalize(ctx, orderReply, 'product', 9, cfg)
      }
    }
    if (isPaymentAsk(seekTokens, raw)) {
      const reply = isScaffoldActive(ctx) ? resumeScaffoldQuestion(ctx, paymentReply(seekTokens, ctx)) : paymentReply(seekTokens, ctx)
      return finalize(ctx, reply, 'payment', 9, cfg)
    }
    const aside = scaffoldAsideReply(ctx, seekTokens, raw)
    if (aside) {
      return finalize(ctx, aside, 'shipping', 8, cfg)
    }
    const scaffolded = await runScaffoldTurn(ctx, seekTokens, raw)
    if (scaffolded) {
      return finalize(ctx, scaffolded, 'product', 8, cfg)
    }
    const explained = isExplainPartAsk(raw) ? explainPartText(seekTokens) : null
    if (explained) {
      return finalize(ctx, explainPartReply(explained.label, explained.knowledge), 'parts', 8, cfg)
    }
    if (needsVehicleForCompat(seekTokens, raw)) {
      return finalize(ctx, compatibilityAskReply(), 'namedPart', 8, cfg)
    }
    const symptom = matchSymptom(raw)
    if (symptom && !mentionedFamily(seekTokens)) {
      return finalize(ctx, symptomGuidanceReply(symptom.label, symptom.candidates), 'parts', 8, cfg)
    }

    if (isVacancyAsk(seekTokens, raw) && !isProductSeekingAsk(seekTokens, raw)) {
      return finalize(ctx, vacancyReply(), 'vacancy', 6, cfg)
    }

    if (prepared.quality === 'VERY_SHORT') {
      const rawToken = prepared.significant[0] || prepared.allTokens[0] || ''
      const token = correctTokensContextual([rawToken], dictionary(ctx), preferredTerms(ctx.entities))[0] || rawToken
      const shortKind = classifyTurn([token, rawToken].filter(Boolean), prepared.text, ctx)
      await hydrateChatProducts({
        tokens: expandPartSynonyms([token, rawToken].filter(Boolean), prepared.text),
        raw: prepared.text,
        ctx,
        kind: shortKind,
      })
      return fastLane(prepared, ctx, cfg)
    }

    detectRepeated(ctx, cfg)

    const kindHintTokens = prepared.tokens.map((item) => item.value)
    const kind = classifyTurn(kindHintTokens, raw, ctx)
    if (kind === 'switch' && !mentionedFamily(kindHintTokens) && /(otra cosa|otro tema|cambiemos|cambiar de tema)/.test(foldText(raw))) {
      ctx.conversationFocus = null
      ctx.pendingConfirmation = null
      resetScaffold(ctx)
      ctx.entities = { ...ctx.entities, pieza: undefined, producto: undefined, namedPart: undefined, accesorio: undefined }
      clearLastOffers(ctx)
      return finalize(ctx, newTopicPromptReply(), 'thanks', 4, cfg)
    }
    if (kind === 'switch') {
      ctx.conversationFocus = null
      ctx.holdFocus = false
      ctx.entities = {
        ...ctx.entities,
        pieza: undefined,
        producto: undefined,
        namedPart: undefined,
        accesorio: undefined,
        queja: undefined,
        compra: undefined,
      }
      clearLastOffers(ctx)
    }

    const matchTokens = expandPartSynonyms(prepared.significant.length ? prepared.significant : prepared.allTokens, raw)
    await hydrateChatProducts({
      tokens: matchTokens,
      raw,
      ctx,
      kind,
    })

    const preferred = kind === 'continue' ? preferredTerms(ctx.entities) : []
    const expanded = expandStuckTokens(
      prepared.tokens.map((item) => item.value),
      dictionary(ctx),
    )
    const corrected = correctTokensContextual(expanded, dictionary(ctx), preferred)
    log(ctx, 'typos', corrected.join(' '))

    const extracted = extractEntities(corrected, raw, ctx.entities)
    if (extracted.conflict) {
      const families = listPartFamilies(corrected)
      const pair = oppositePositionPair(raw)
      const left = families.length >= 2 ? families[0].label : extracted.conflict.previous
      const right = families.length >= 2 ? families[1].label : extracted.conflict.next
      const leftPos = families.length >= 2 ? positionForFamily(raw, left) : (pair?.left || positionForFamily(raw, left))
      const rightPos = families.length >= 2 ? positionForFamily(raw, right) : (pair?.right || positionForFamily(raw, right))
      ctx.pendingConfirmation = {
        intent: 'entityConflict',
        payload: {
          kind: 'product',
          intent: 'product',
          previous: left,
          next: right,
          rightIntent: 'product',
          positions: { [left]: leftPos, [right]: rightPos },
          modelo: extracted.next.modelo || '',
          marca: extracted.next.marca || '',
        },
      }
      ctx.entities = extracted.next
      ctx.metrics.disambiguations += 1
      log(ctx, 'entities', 'conflict')
      return finalize(
        ctx,
        partConflictReply(left, right, {
          leftLabel: [left, leftPos].filter(Boolean).join(' '),
          rightLabel: [right, rightPos].filter(Boolean).join(' '),
          vehicle: extracted.next.modelo || '',
        }),
        'disambiguation',
        4,
        cfg,
      )
    }
    ctx.entities = extracted.next
    log(ctx, 'entities', Object.keys(ctx.entities).join(','))

    if (kind === 'switch') {
      const name = ctx.entities.pieza || ctx.entities.producto || ctx.entities.accesorio || ctx.entities.namedPart
      if (name) ctx.ackPrefix = `Pasamos a ${name}.`
    }

    const userFrame = parseUserFrame(raw, corrected)
    if (userFrame.userName) ctx.entities.userName = userFrame.userName
    const lookup = userFrame.lookupTokens.filter((token) => !isStopToken(token) && token.length > 2)
    if (userFrame.introducingSelf && lookup.length === 0) {
      return finalize(ctx, userNameAckReply(userFrame.userName), 'greeting', 6, cfg)
    }

    const framed = routeClearFrame(lookup.length ? lookup : corrected, prepared, raw, ctx, cfg)
    if (framed) return framed

    const matcherTokens = expandPartSynonyms(lookup.length ? lookup : corrected, raw)
    const candidates = runAllMatchers(matcherTokens, ctx, prepared.hasQuestion, false, cfg, raw)
    log(ctx, 'scoring', candidates.map((item) => `${item.intent}:${item.score}`).join(','))
    const ranked = rankIntents(candidates, cfg)
    log(ctx, 'rank', `${ranked.top1?.intent || '-'} ${ranked.delta}`)

    if (!ranked.top1 || ranked.top1.score < cfg.UMBRAL_MINIMO) {
      const contextual = resolveFromContext(corrected, ctx, cfg, raw)
      if (contextual) ranked.top1 = contextual
    }

    if (!ranked.top1 || ranked.top1.score < cfg.UMBRAL_MINIMO) {
      const missKind = classifyTurn(lookup.length ? lookup : corrected, raw, ctx)
      if (missKind === 'switch') {
        ctx.errorCount += 1
        ctx.metrics.unmatched += 1
        const term = mentionedFamily(lookup.length ? lookup : corrected) || raw
        return finalize(ctx, switchMissReply(term), 'fallback', 0, cfg)
      }
      return recoverUnmatched(ctx, raw, lookup.length ? lookup : corrected, cfg)
    }

    if (shouldDisambiguate(ranked, cfg, lookup.length ? lookup : corrected, raw) && ranked.top2) {
      const left = INTENT_LABELS[ranked.top1.intent] || ranked.top1.intent
      const right = INTENT_LABELS[ranked.top2.intent] || ranked.top2.intent
      ctx.pendingConfirmation = {
        intent: ranked.top1.intent,
        payload: {
          kind: 'intent',
          intent: ranked.top1.intent,
          rightIntent: ranked.top2.intent,
          previous: left,
          next: right,
        },
      }
      ctx.metrics.disambiguations += 1
      log(ctx, 'decision', 'disambiguate')
      return finalize(ctx, disambiguationReply(left, right), 'disambiguation', ranked.top1.score, cfg)
    }

    const secundarios = ranked.secundarios.filter(
      (item) => item.intent !== ranked.top1!.intent && (isSecondaryIntent(item.intent) || item.score >= cfg.UMBRAL_SECUNDARIO),
    )
    log(ctx, 'resolve', [ranked.top1.intent, ...secundarios.map((item) => item.intent)].join('+'))
    const combined = combineCandidates(ranked.top1, secundarios, lookup.length ? lookup : corrected, ctx)
    return finalize(ctx, combined, ranked.top1.intent, ranked.top1.score, cfg)
  } catch {
    ctx.errorCount += 1
    log(ctx, 'error', 'uncaught')
    ctx.metrics.unmatched += 1
    saveSession(ctx)
    return fallbackReply(raw)
  }
}

export type { ChatReply } from './intents'
