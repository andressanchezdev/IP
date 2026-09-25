/**
 * ReplyContext unificado por turno (patrón HINATA), sin LLM.
 * Empaqueta foco, entidades, ofertas y flags de flujo para logging / tools.
 */

import type { SessionContext } from './sessionContext'
import { focusLabel } from './conversationThread'
import { isOrderFlowActive } from './createOrderFlow'
import { isScaffoldActive } from './scaffoldSearch'
import { AGENT_DOMAIN_RULES } from './agentFacts'

export type ReplyContext = {
  sessionId: string
  focusLabel: string
  lastIntent: string
  lastUserText: string
  offerCount: number
  orderActive: boolean
  orderState: string
  scaffoldActive: boolean
  scaffoldState: string
  entities: SessionContext['entities']
  domainRules: readonly string[]
}

export function buildReplyContext(ctx: SessionContext): ReplyContext {
  return {
    sessionId: ctx.sessionId || '',
    focusLabel: focusLabel(ctx) || '',
    lastIntent: String(ctx.lastTopIntent || ''),
    lastUserText: String(ctx.lastUserText || ''),
    offerCount: Array.isArray(ctx.lastOffers) ? ctx.lastOffers.length : 0,
    orderActive: isOrderFlowActive(ctx),
    orderState: ctx.orderFlow?.currentState || 'idle',
    scaffoldActive: isScaffoldActive(ctx),
    scaffoldState: ctx.scaffoldedSearch?.currentState || 'idle',
    entities: { ...ctx.entities },
    domainRules: AGENT_DOMAIN_RULES,
  }
}
