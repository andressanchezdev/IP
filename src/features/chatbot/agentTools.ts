/**
 * Registry de tools locales (patrón HINATA tools + risk), sin LLM ni servicios externos.
 * Cada tool valida, ejecuta y devuelve ChatReply con datos reales / plantillas.
 */

import type { ChatReply } from './intents'
import {
  companyReply,
  creditReply,
  executiveReply,
  handoffReply,
  locationReply,
  paymentReply,
  shippingReply,
  whatsappReply,
} from './intents'
import { companyFact } from './agentFacts'
import type { SessionContext } from './sessionContext'

export type AgentToolId =
  | 'get_contact'
  | 'get_company'
  | 'get_payment'
  | 'get_shipping'
  | 'get_credit'
  | 'get_location_hours'
  | 'handoff_advisor'

export type AgentToolRisk = 'read_only' | 'mutating' | 'dangerous'

type AgentTool = {
  id: AgentToolId
  risk: AgentToolRisk
  run: (ctx: SessionContext, tokens: readonly string[], raw: string) => ChatReply
}

const TOOLS: Record<AgentToolId, AgentTool> = {
  get_contact: {
    id: 'get_contact',
    risk: 'read_only',
    run: () => whatsappReply(),
  },
  get_company: {
    id: 'get_company',
    risk: 'read_only',
    run: () => {
      const base = companyReply()
      return {
        ...base,
        text: `${companyFact('empresa')}\n\n${base.text}`,
      }
    },
  },
  get_payment: {
    id: 'get_payment',
    risk: 'read_only',
    run: (_ctx, tokens) => paymentReply(tokens, _ctx),
  },
  get_shipping: {
    id: 'get_shipping',
    risk: 'read_only',
    run: () => shippingReply(),
  },
  get_credit: {
    id: 'get_credit',
    risk: 'read_only',
    run: () => creditReply(),
  },
  get_location_hours: {
    id: 'get_location_hours',
    risk: 'read_only',
    run: (_ctx, tokens, raw) => locationReply(tokens, raw),
  },
  handoff_advisor: {
    id: 'handoff_advisor',
    risk: 'read_only',
    run: () => executiveReply(),
  },
}

export function runAgentTool(
  id: AgentToolId,
  ctx: SessionContext,
  tokens: readonly string[] = [],
  raw = '',
): ChatReply {
  const tool = TOOLS[id]
  if (!tool) {
    return handoffReply()
  }
  return tool.run(ctx, tokens, raw)
}

export function listAgentTools(): AgentToolId[] {
  return Object.keys(TOOLS) as AgentToolId[]
}
