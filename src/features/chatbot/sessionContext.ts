import { DEFAULT_PIPELINE_CONFIG } from './pipelineConfig'
import { emptyMetrics, type PhaseLogEntry, type SessionMetrics } from './pipelineLog'
import { removeStore, writeStore } from './storage'

const KEY = 'botip-chat-session'

export type SessionLanguage = 'es' | 'en'

export type IntentRecord = {
  intent: string
  score: number
  turn: number
}

export type ResponseRecord = {
  hash: string
  intent: string
  turn: number
  variantIndex: number
  text: string
}

export type FocusAspect = 'none' | 'identity' | 'price' | 'stock' | 'compat' | 'shipping' | 'purchase'
export type FocusReferent = 'none' | 'current' | 'other' | 'specific'

export type ConversationFocus = {
  intent: string
  label: string
  family: string
  turn: number
  productId?: string
  marca?: string
  modelo?: string
  aspect: FocusAspect
  referent: FocusReferent
}

export type EntityMap = {
  userName?: string
  miembro?: string
  grupo?: string
  pieza?: string
  producto?: string
  accesorio?: string
  namedPart?: string
  marca?: string
  modelo?: string
  codigo?: string
  precioMencionado?: string
  queja?: boolean
  compra?: boolean
  conflict?: { field: string; previous: string; next: string }
}

export type PendingConfirmation = {
  intent: string
  payload: Record<string, unknown>
}

export type OfferedProduct = {
  id: string
  label: string
  price: number
  family: string
  marca?: string
  modelo?: string
  cantidad?: number
  codigo?: string
}

export type ScaffoldState =
  | 'idle'
  | 'awaitingBrand'
  | 'awaitingModel'
  | 'awaitingYear'
  | 'readyToSearch'
  | 'showingResults'
  | 'completed'
  | 'aborted'

export type ScaffoldCaptured = {
  family: string
  brand: string
  model: string
  year: string
  cilindraje: string
  partTerm: string
}

export type ScaffoldedSearch = {
  currentState: ScaffoldState
  captured: ScaffoldCaptured
  history: string[]
  turnsInScaffold: number
  maxTurnsBeforeFallback: number
}

export type SessionContext = {
  sessionId: string
  turn: number
  language: SessionLanguage
  lastIntents: IntentRecord[]
  lastResponses: ResponseRecord[]
  entities: EntityMap
  topicStack: string[]
  conversationFocus: ConversationFocus | null
  lastOffers: OfferedProduct[]
  lastOffersAt: number
  lastUserText: string
  pendingConfirmation: PendingConfirmation | null
  userTokenHistory: string[][]
  sameMsgStreak: number
  repeatedKeywordStreak: Record<string, number>
  lastTopIntent: string | null
  errorCount: number
  fallbackCount: number
  activeHandlers: string[]
  offerMenu: boolean
  offerHumanHandoff: boolean
  ackPrefix: string
  skipTemplateDefault: boolean
  pedirConcrecion: boolean
  holdFocus: boolean
  metrics: SessionMetrics
  phaseLog: PhaseLogEntry[]
  scaffoldedSearch: ScaffoldedSearch
}

let activeSessionId = ''
let memory: SessionContext | null = null

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptySession(sessionId = createId()): SessionContext {
  return {
    sessionId,
    turn: 0,
    language: 'es',
    lastIntents: [],
    lastResponses: [],
    entities: {},
    topicStack: [],
    conversationFocus: null,
    lastOffers: [],
    lastOffersAt: 0,
    lastUserText: '',
    pendingConfirmation: null,
    userTokenHistory: [],
    sameMsgStreak: 0,
    repeatedKeywordStreak: {},
    lastTopIntent: null,
    errorCount: 0,
    fallbackCount: 0,
    activeHandlers: [],
    offerMenu: false,
    offerHumanHandoff: false,
    ackPrefix: '',
    skipTemplateDefault: false,
    pedirConcrecion: false,
    holdFocus: false,
    metrics: emptyMetrics(),
    phaseLog: [],
    scaffoldedSearch: {
      currentState: 'idle',
      captured: { family: '', brand: '', model: '', year: '', cilindraje: '', partTerm: '' },
      history: [],
      turnsInScaffold: 0,
      maxTurnsBeforeFallback: 4,
    },
  }
}

function persist(ctx: SessionContext) {
  memory = ctx
  if (!activeSessionId) return
  writeStore('session', KEY, JSON.stringify(ctx))
}

export function startChatSession() {
  activeSessionId = createId()
  const ctx = emptySession(activeSessionId)
  persist(ctx)
  return activeSessionId
}

export function endChatSession() {
  activeSessionId = ''
  memory = null
  removeStore('session', KEY)
}

export function loadSession(): SessionContext {
  if (!activeSessionId || !memory) startChatSession()
  const ctx = memory as SessionContext
  if (!('conversationFocus' in ctx) || ctx.conversationFocus === undefined) ctx.conversationFocus = null
  if (ctx.conversationFocus) {
    if (!ctx.conversationFocus.aspect) ctx.conversationFocus.aspect = 'none'
    if (!ctx.conversationFocus.referent) ctx.conversationFocus.referent = 'none'
  }
  if (!ctx.holdFocus) ctx.holdFocus = false
  if (!Array.isArray(ctx.lastOffers)) ctx.lastOffers = []
  if (typeof ctx.lastOffersAt !== 'number') ctx.lastOffersAt = 0
  if (typeof ctx.lastUserText !== 'string') ctx.lastUserText = ''
  if (!ctx.scaffoldedSearch) {
    ctx.scaffoldedSearch = {
      currentState: 'idle',
      captured: { family: '', brand: '', model: '', year: '', cilindraje: '', partTerm: '' },
      history: [],
      turnsInScaffold: 0,
      maxTurnsBeforeFallback: 4,
    }
  }
  return ctx
}

export function saveSession(ctx: SessionContext) {
  if (!activeSessionId) activeSessionId = ctx.sessionId
  persist({ ...ctx, sessionId: activeSessionId })
}

export function resetSessionKeepId() {
  const id = activeSessionId || createId()
  activeSessionId = id
  const ctx = emptySession(id)
  persist(ctx)
  return ctx
}

export function sliceWindow<T>(list: T[], size: number) {
  return list.slice(-size)
}

export function windows() {
  return {
    responses: DEFAULT_PIPELINE_CONFIG.WINDOW_RESPONSES,
    intents: DEFAULT_PIPELINE_CONFIG.WINDOW_INTENTS,
    tokens: DEFAULT_PIPELINE_CONFIG.WINDOW_TOKENS,
    topics: DEFAULT_PIPELINE_CONFIG.TOPIC_STACK,
  }
}
