import { findTerm, liveAccessoryTerms, liveCatalogParts, liveOtherParts, partStem, resolvePartFamily } from './motoParts'
import type { ConversationFocus, FocusAspect, FocusReferent, SessionContext } from './sessionContext'
import { liveLexiconSet } from './botip/liveData'
import { pickLastOffer } from './inventory'

export type TurnKind = 'continue' | 'switch' | 'social' | 'fresh' | 'aside'

export const FOLLOW_CUE_LIST = [
  'tambien',
  'ese',
  'esa',
  'eso',
  'esto',
  'este',
  'aqui',
  'entonces',
  'ok',
  'vale',
  'mas',
  'disponible',
  'disponibilidad',
  'hay',
  'aun',
  'todavia',
  'mismo',
  'misma',
  'precio',
  'precios',
  'stock',
  'cuesta',
  'cuanto',
  'cotizar',
  'y',
  'sigue',
] as const

export const SWITCH_CUE_LIST = ['cambiemos', 'olvidalo', 'olvidar', 'cancelar'] as const
export const SOCIAL_GREET = ['hola', 'buenas', 'hey', 'hello', 'hi', 'buenos', 'buen'] as const
export const SOCIAL_THANKS = ['gracias', 'grax', 'thanks', 'ty'] as const
export const ASIDE_INTENT_LIST = ['location', 'company', 'social', 'credit', 'payment', 'shipping', 'orderStatus'] as const
export const ORDER_STATUS_CUE_LIST = ['estado', 'rastreo', 'rastrear', 'tracking'] as const
export const SHIPPING_CUE_LIST = [
  'envio',
  'envios',
  'enviar',
  'domicilio',
  'domicilios',
  'despacho',
  'contraentrega',
] as const
export const FOCUS_OK_LIST = [
  'product',
  'quote',
  'namedPart',
  'accessory',
  'catalog',
  'parts',
  'teamMember',
  'teamGroup',
  'teamSuggest',
  'attention',
  'complaint',
] as const
export const LOCATION_CUE_LIST = [
  'donde',
  'ubicacion',
  'ubicados',
  'ubicado',
  'ciudad',
  'encuentran',
  'encuentra',
  'local',
  'sucursal',
  'sede',
  'direccion',
  'mapa',
  'alpujarra',
  'medellin',
  'horario',
  'horarios',
  'abren',
  'abre',
  'abierto',
] as const
export const BROAD_PRICE_LIST = [
  'productos',
  'catalogo',
  'listado',
  'lista',
  'todos',
  'todas',
  'descuentos',
  'descuento',
  'varios',
  'general',
  'mayorista',
] as const
export const PRICE_CUE_LIST = ['precio', 'precios', 'cuanto', 'cuesta', 'cotizar', 'valor', 'costo', 'tarifa', 'stock'] as const
export const CREDIT_CUE_LIST = [
  'credito',
  'creditos',
  'sistecredito',
  'siste',
  'fiado',
  'financiacion',
  'financiamiento',
  'financiar',
  'cupo',
] as const
export const PAYMENT_CUE_LIST = [
  'pago',
  'pagos',
  'pagar',
  'efectivo',
  'transferencia',
  'consignar',
  'consignacion',
  'nequi',
  'daviplata',
  'bancolombia',
  'medios',
] as const
export const PURCHASE_CUE_LIST = ['comprar', 'obtener', 'adquirir', 'pedido'] as const
export const CHOOSE_CUE_LIST = [
  'esa',
  'ese',
  'eso',
  'esta',
  'este',
  'voy',
  'llevar',
  'llevo',
  'pido',
  'pedir',
  'quiero',
  'comprar',
  'compra',
] as const
export const COMPLAINT_CUE_LIST = [
  'queja',
  'quejas',
  'reclamo',
  'reclamos',
  'reclamar',
  'quejar',
  'pqr',
  'molestia',
  'garantia',
  'devolucion',
  'inconforme',
  'inconformidad',
  'defectuoso',
] as const

const SOCIAL = new Set(['greeting', 'thanks', 'farewell', 'howAreYou', 'disambiguation'])

function followCues() {
  return liveLexiconSet('followCues', new Set(FOLLOW_CUE_LIST))
}
function switchCues() {
  return liveLexiconSet('switchCues', new Set(SWITCH_CUE_LIST))
}
function asideIntents() {
  return liveLexiconSet('asideIntents', new Set(ASIDE_INTENT_LIST), false)
}
function focusOkIntents() {
  return liveLexiconSet('focusOkIntents', new Set(FOCUS_OK_LIST), false)
}
function locationCues() {
  return liveLexiconSet('locationCues', new Set(LOCATION_CUE_LIST))
}
function broadPrice() {
  return liveLexiconSet('broadPrice', new Set(BROAD_PRICE_LIST))
}
function priceCues() {
  return liveLexiconSet('priceCues', new Set(PRICE_CUE_LIST))
}
function creditCues() {
  return liveLexiconSet('creditCues', new Set(CREDIT_CUE_LIST))
}
function purchaseCues() {
  return liveLexiconSet('purchaseCues', new Set(PURCHASE_CUE_LIST))
}
function paymentCues() {
  const raw = liveLexiconSet('paymentCues', new Set(PAYMENT_CUE_LIST))
  const purchase = purchaseCues()
  return new Set([...raw].filter((token) => !purchase.has(token)))
}
export function liveShippingCues() {
  return liveLexiconSet('shippingCues', new Set(SHIPPING_CUE_LIST))
}
function orderStatusCues() {
  return liveLexiconSet('orderStatusCues', new Set(ORDER_STATUS_CUE_LIST))
}
function complaintCues() {
  return liveLexiconSet('complaintCues', new Set(COMPLAINT_CUE_LIST))
}
function socialGreet() {
  return liveLexiconListSafe('socialGreet', SOCIAL_GREET)
}
function socialThanks() {
  return liveLexiconListSafe('socialThanks', SOCIAL_THANKS)
}
function liveLexiconListSafe(key: string, fallback: readonly string[]) {
  return [...liveLexiconSet(key, new Set(fallback))]
}

export function focusLabel(ctx: SessionContext) {
  return ctx.conversationFocus?.label || ctx.entities.producto || ctx.entities.pieza || ctx.entities.accesorio || ctx.entities.namedPart || ''
}

export function focusFamily(ctx: SessionContext) {
  return ctx.conversationFocus?.family || (focusLabel(ctx) ? partStem(focusLabel(ctx)) : '')
}

export function mentionedFamily(tokens: readonly string[]) {
  return resolvePartFamily(tokens)?.id || ''
}

function isSocialTurn(tokens: readonly string[]) {
  const significant = tokens.filter((token) => token.length > 1)
  if (!significant.length) return false
  if (significant.every((token) => socialGreet().includes(token))) return true
  if (significant.every((token) => socialThanks().includes(token))) return true
  return false
}

function wantsNewTopic(raw: string, tokens: readonly string[]) {
  const text = raw.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (/(otra cosa|otro tema|cambiemos|cambiar de tema|en vez|en lugar)/.test(text)) return true
  return tokens.some((token) => switchCues().has(token))
}

export function isBroadPriceAsk(tokens: readonly string[], raw = '') {
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  const price = tokens.some((token) => priceCues().has(token)) || /precio|cuanto cuesta|cotiz/.test(text)
  const broad =
    tokens.some((token) => broadPrice().has(token)) ||
    /precios? de (sus |los |tus |nuestros )?(productos|catalogo|articulos)/.test(text) ||
    /listado de precios|lista de precios/.test(text)
  return Boolean(price && broad && !mentionedFamily(tokens))
}

export function isComplaintAsk(tokens: readonly string[], raw = '') {
  if (isBrandLineAsk(tokens, raw) && !tokens.some((token) => ['queja', 'reclamo', 'pqr', 'reclamar', 'quejar'].includes(token))) {
    return false
  }
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return (
    tokens.some((token) => complaintCues().has(token)) ||
    /\b(queja|reclamo|pqr|inconformidad|defectuoso)\b/.test(text)
  )
}

export function isBrandLineAsk(tokens: readonly string[], raw = '') {
  const family = resolvePartFamily(tokens)?.id
  if (family && family !== 'freno') return false
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return (
    (tokens.includes('marca') || tokens.includes('marcas')) &&
    (tokens.includes('manejan') || tokens.includes('tienen') || tokens.includes('aliadas') || tokens.includes('aliados') || /que marcas/.test(text))
  )
}

export function isCreditAsk(tokens: readonly string[], raw = '') {
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return (
    tokens.some((token) => creditCues().has(token)) ||
    /siste\s*credito|financi/.test(text)
  )
}

function hasPartTerm(tokens: readonly string[]) {
  if (mentionedFamily(tokens)) return true
  return Boolean(
    findTerm(tokens, liveCatalogParts()) ||
      findTerm(tokens, liveOtherParts()) ||
      findTerm(tokens, liveAccessoryTerms()),
  )
}

function isDeicticProduct(tokens: readonly string[]) {
  const pointer = tokens.some((token) => ['este', 'esta', 'esto', 'ese', 'esa', 'eso'].includes(token))
  const generic = tokens.some((token) => ['producto', 'productos', 'pieza', 'repuesto'].includes(token))
  return pointer && generic
}

export function isOrderStatusAsk(tokens: readonly string[], raw = '') {
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  const hasPedido = tokens.some((token) => token === 'pedido' || token === 'pedidos') || /\bpedidos?\b/.test(text)
  if (!hasPedido) return false
  if (orderStatusCues().has('estado') && tokens.some((token) => orderStatusCues().has(token))) return true
  if (/estado (de )?(mi |el )?pedidos?|donde (esta|quedo|anda|va) (mi |el )?pedidos?|rastre(o|ar) (mi |el )?pedidos?/.test(text)) {
    return true
  }
  return /\bmi pedidos?\b/.test(text) && !hasPartTerm(tokens)
}

export function isPaymentAsk(tokens: readonly string[], raw = '') {
  if (isOrderStatusAsk(tokens, raw)) return false
  if (isCreditAsk(tokens, raw)) return false
  if (tokens.some((token) => ['vacante', 'vacantes', 'empleo', 'trabajo', 'postular'].includes(token))) return false
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (
    tokens.some((token) => paymentCues().has(token)) ||
    /medios de pago|numero de cuenta|tipo de cuenta/.test(text)
  ) {
    return true
  }
  const purchase =
    tokens.some((token) => purchaseCues().has(token)) ||
    /como (puedo )?(compro|comprar|obtengo|obtener|pago|pagar)/.test(text)
  if (!purchase) return false
  if (hasPartTerm(tokens)) return false
  if (isDeicticProduct(tokens)) return true
  return /como (puedo )?(compro|comprar|obtengo|obtener|pago|pagar)/.test(text)
}

export function isShippingAsk(tokens: readonly string[], raw = '') {
  if (isOrderStatusAsk(tokens, raw)) return false
  if (tokens.some((token) => liveShippingCues().has(token))) return true
  const text = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  return /\benvio(s)?\b|\bdomicilio(s)?\b|\bcontraentrega\b|\bdespacho\b/.test(text)
}

export function classifyTurn(tokens: readonly string[], raw: string, ctx: SessionContext): TurnKind {
  if (isSocialTurn(tokens)) return 'social'
  if (!ctx.conversationFocus && !ctx.lastTopIntent) return 'fresh'

  const familyNow = mentionedFamily(tokens)
  const current = focusFamily(ctx)
  const significant = tokens.filter((token) => token.length > 1)

  if (isBroadPriceAsk(tokens, raw)) return 'aside'
  if (!familyNow && isOrderStatusAsk(tokens, raw)) return 'aside'
  if (!familyNow && significant.some((token) => locationCues().has(token))) return 'aside'
  if (!familyNow && isShippingAsk(tokens, raw)) return 'aside'
  if (familyNow && current && familyNow !== current) return 'switch'
  if (pickLastOffer(ctx, tokens, raw)) return 'continue'
  if (isCreditAsk(tokens, raw) || isPaymentAsk(tokens, raw)) return 'aside'
  if (wantsNewTopic(raw, tokens) && !familyNow) return 'switch'

  if (followCues().has('y') && /^(y\s+|entonces\s+|ok\s+|vale\s+)/.test(raw.trim().toLowerCase()) && (!familyNow || familyNow === current)) {
    return 'continue'
  }
  if (significant.some((token) => followCues().has(token)) && (!familyNow || familyNow === current)) return 'continue'
  if (significant.length <= 2 && ctx.conversationFocus && !familyNow) return 'continue'
  if (significant.length <= 2 && familyNow && current && familyNow === current) return 'continue'
  return 'fresh'
}

export function isFollowUpTurn(tokens: readonly string[], raw: string, ctx: SessionContext) {
  return classifyTurn(tokens, raw, ctx) === 'continue'
}

export function mergeFocusTokens(tokens: readonly string[], ctx: SessionContext) {
  const label = focusLabel(ctx)
  if (!label) return [...tokens]
  const extra = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2)
  const seen = new Set(tokens)
  const merged = [...tokens]
  for (const part of extra) {
    if (seen.has(part)) continue
    seen.add(part)
    merged.push(part)
  }
  return merged
}

export function keepConversationFocus(intent: string) {
  return SOCIAL.has(intent) || asideIntents().has(intent)
}

export function detectFocusAspect(tokens: readonly string[], raw: string): FocusAspect {
  if (isShippingAsk(tokens, raw)) return 'shipping'
  if (tokens.some((token) => ['stock', 'disponible', 'disponibilidad', 'hay'].includes(token))) return 'stock'
  if (isBroadPriceAsk(tokens, raw) || tokens.some((token) => priceCues().has(token))) return 'price'
  if (tokens.some((token) => ['compatible', 'compatibilidad', 'sirve', 'entra'].includes(token))) return 'compat'
  if (tokens.some((token) => purchaseCues().has(token))) return 'purchase'
  return 'none'
}

export function detectFocusReferent(
  tokens: readonly string[],
  raw: string,
  ctx: SessionContext,
): FocusReferent {
  const familyNow = mentionedFamily(tokens)
  const current = focusFamily(ctx)
  if (pickLastOffer(ctx, tokens, raw)) return 'specific'
  if (familyNow && current && familyNow !== current) return 'other'
  if (familyNow && current && familyNow === current) return 'current'
  if (ctx.conversationFocus && significantFollow(tokens, raw)) return 'current'
  if (familyNow && !current) return 'other'
  return 'none'
}

function significantFollow(tokens: readonly string[], raw: string) {
  const significant = tokens.filter((token) => token.length > 1)
  if (significant.some((token) => followCues().has(token))) return true
  if (significant.length <= 2 && !mentionedFamily(tokens)) return true
  if (/^(y\s+|entonces\s+|ok\s+|vale\s+)/.test(raw.trim().toLowerCase())) return true
  return false
}

export function nextConversationFocus(
  intent: string,
  ctx: SessionContext,
  score: number,
  minScore: number,
  tokens: readonly string[] = [],
  raw = '',
): ConversationFocus | null {
  if (score < minScore) return ctx.conversationFocus
  if (keepConversationFocus(intent) && ctx.conversationFocus) {
    return {
      ...ctx.conversationFocus,
      aspect: detectFocusAspect(tokens, raw) || ctx.conversationFocus.aspect,
      referent: 'current',
      turn: ctx.turn,
    }
  }
  if (ctx.holdFocus && ctx.conversationFocus) return ctx.conversationFocus
  if (keepConversationFocus(intent)) return ctx.conversationFocus
  if (!focusOkIntents().has(intent)) return ctx.conversationFocus

  const rawLabel =
    ctx.entities.producto ||
    ctx.entities.pieza ||
    ctx.entities.accesorio ||
    ctx.entities.namedPart ||
    ''
  const weak = /^(eso|ese|esa|esto|este|product|quote)$/i.test(rawLabel)
  const label = weak ? ctx.conversationFocus?.label || rawLabel : rawLabel || ctx.conversationFocus?.label || intent
  const resolved = resolvePartFamily(
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
  const family = resolved?.id || (label ? partStem(label) : intent)
  const aspect = detectFocusAspect(tokens, raw)
  const referent = detectFocusReferent(tokens, raw, ctx)
  const offer = ctx.lastOffers.find((item) => item.label === label || item.family === family)

  if (ctx.conversationFocus?.family && family && ctx.conversationFocus.family !== family && weak) {
    return {
      intent,
      label: rawLabel || intent,
      family: resolved?.id || partStem(rawLabel || intent),
      turn: ctx.turn,
      productId: offer?.id,
      marca: ctx.entities.marca || ctx.conversationFocus.marca,
      modelo: ctx.entities.modelo || ctx.conversationFocus.modelo,
      aspect: aspect === 'none' ? 'identity' : aspect,
      referent: 'other',
    }
  }

  const switched = Boolean(ctx.conversationFocus?.family && family && ctx.conversationFocus.family !== family)
  return {
    intent,
    label: resolved?.label || label,
    family,
    turn: ctx.turn,
    productId: offer?.id || ctx.conversationFocus?.productId,
    marca: ctx.entities.marca || (!switched ? ctx.conversationFocus?.marca : undefined),
    modelo: ctx.entities.modelo || (!switched ? ctx.conversationFocus?.modelo : undefined),
    aspect: aspect === 'none' ? (intent === 'quote' ? 'price' : intent === 'shipping' ? 'shipping' : 'identity') : aspect,
    referent: switched ? 'other' : referent === 'none' ? 'current' : referent,
  }
}
