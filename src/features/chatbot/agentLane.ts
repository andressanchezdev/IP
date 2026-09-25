/**
 * Dual-lane + escape hatch (patrón HINATA), 100% reglas locales.
 * Fast lane: FAQ empresa/contacto. Work lane: producto/pedido (pipeline normal).
 */

import type { ChatReply } from './intents'
import {
  isComplaintAsk,
  isCreditAsk,
  isExecutiveAsk,
  isHoursAsk,
  isLocationAsk,
  isPaymentAsk,
  isProductSeekingAsk,
  isReturnsAsk,
  isShippingAsk,
  isVacancyAsk,
} from './conversationThread'
import { runAgentTool, type AgentToolId } from './agentTools'
import { resumeScaffoldQuestion } from './scaffoldSearch'
import type { SessionContext } from './sessionContext'
import { isScaffoldActive } from './scaffoldSearch'

/** Consultas de dominio que deben poder interrumpir pedido/scaffold. */
export function isDomainAsideAsk(tokens: readonly string[], raw: string) {
  return (
    isPaymentAsk(tokens, raw)
    || isCreditAsk(tokens, raw)
    || isHoursAsk(tokens, raw)
    || isLocationAsk(tokens, raw)
    || isShippingAsk(tokens, raw)
    || isReturnsAsk(tokens, raw)
    || isComplaintAsk(tokens, raw)
    || isExecutiveAsk(tokens, raw)
    || isVacancyAsk(tokens, raw)
  )
}

/** Carril rápido: aside de empresa/contacto sin búsqueda de producto. */
export function isFastLaneAsk(tokens: readonly string[], raw: string) {
  if (isProductSeekingAsk(tokens, raw)) return false
  return isDomainAsideAsk(tokens, raw)
}

function toolForAside(tokens: readonly string[], raw: string): AgentToolId | null {
  if (isExecutiveAsk(tokens, raw)) return 'handoff_advisor'
  if (isComplaintAsk(tokens, raw) || isReturnsAsk(tokens, raw)) return 'handoff_advisor'
  if (isPaymentAsk(tokens, raw)) return 'get_payment'
  if (isCreditAsk(tokens, raw)) return 'get_credit'
  if (isShippingAsk(tokens, raw)) return 'get_shipping'
  if (isLocationAsk(tokens, raw) || isHoursAsk(tokens, raw)) return 'get_location_hours'
  return null
}

/**
 * Resuelve FAQ/contacto de inmediato (fast lane).
 * Si hay scaffold activo, retoma la pregunta del wizard después.
 */
export function tryFastLaneReply(
  ctx: SessionContext,
  tokens: readonly string[],
  raw: string,
): ChatReply | null {
  if (!isFastLaneAsk(tokens, raw)) return null
  const toolId = toolForAside(tokens, raw)
  if (!toolId) return null
  const reply = runAgentTool(toolId, ctx, tokens, raw)
  if (isScaffoldActive(ctx)) {
    return resumeScaffoldQuestion(ctx, reply)
  }
  return reply
}

/**
 * Si el flujo de pedido está activo pero el usuario pregunta un aside de dominio,
 * no debe quedar atrapado: devolver true para que answerChat salte el FSM.
 */
export function shouldEscapeOrderFlow(
  tokens: readonly string[],
  raw: string,
  opts: { codeAsk: boolean; createAsk: boolean },
) {
  if (opts.codeAsk || opts.createAsk) return false
  return isDomainAsideAsk(tokens, raw)
}
