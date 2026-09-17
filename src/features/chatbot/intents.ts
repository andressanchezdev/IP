import { findTerm, listPartFamilies, liveAccessoryTerms, liveCatalogParts, liveOtherParts, resolvePartFamily } from './motoParts'
import { applyBotText, defaultKeywords, getBotSettings, keywordsOf, liveContact, livePayments } from './botSettings'
import { nextAskPhrase, nextAskSubject } from './askPhrase'
import { advisorAskKind, groupLabel, type TeamMatch } from './teamLookup'
import type { LandingTeamMember } from './types'
import { chatHasAuth, getLastProductPlan, lastProductFetchFailed, type ProductQueryPlan } from './productSource'
import { liveBrandNames, liveCatalogLabels, liveCatalogProducts, liveLexiconSet, livePublishedTeam, liveShipping } from './botip/liveData'
import { isBroadPriceAsk, isHowToBuyAsk, isHoursAsk, isLocationAsk } from './conversationThread'
import type { SessionContext } from './sessionContext'
import { catalogOptionLabel, catalogSearchQuery, findInventoryMatches, pickLastOffer, rememberOffers } from './inventory'

export type CatalogCommand =
  | { kind: 'search'; query: string }
  | { kind: 'filter'; brands?: string[]; categories?: string[]; models?: string[] }

export type ChatAction = {
  href?: string
  label: string
  external?: boolean
  kind?: 'catalog-download' | 'prompt' | 'login' | 'catalog-search' | 'catalog-filter'
  prompt?: string
  search?: string
  brands?: string[]
  categories?: string[]
  models?: string[]
}

export type ChatReply = {
  actions: ChatAction[]
  options?: ChatAction[]
  text: string
  catalogCommand?: CatalogCommand
}

type IntentId =
  | 'greeting'
  | 'whatsapp'
  | 'catalog'
  | 'parts'
  | 'accessory'
  | 'product'
  | 'attention'
  | 'complaint'
  | 'returns'
  | 'quote'
  | 'vacancy'
  | 'location'
  | 'company'
  | 'social'
  | 'thanks'
  | 'credit'
  | 'payment'
  | 'shipping'
  | 'orderStatus'

type Intent = {
  id: IntentId
  keywords: readonly string[]
}

const CATALOG_PATH = '/'

function whatsappHref(text: string) {
  const base = liveContact().whatsappUrl
  const joiner = base.includes('?') ? '&' : '?'
  return `${base}${joiner}text=${encodeURIComponent(text)}`
}

const contactActions = (): ChatAction[] => [
  {
    href: whatsappHref('Hola, quiero más información de Importadora Premium.'),
    label: 'Ir a WhatsApp',
    external: true,
  },
  { href: `mailto:${liveContact().email}`, label: 'Enviar correo' },
]

export function getChatIntents(): Intent[] {
  return CHAT_INTENTS.map((intent) => ({
    ...intent,
    keywords: keywordsOf(intent.id, intent.keywords),
  }))
}

const CHAT_INTENTS: readonly Intent[] = [
  { id: 'greeting', keywords: defaultKeywords('greeting') },
  { id: 'whatsapp', keywords: defaultKeywords('whatsapp') },
  { id: 'catalog', keywords: defaultKeywords('catalog') },
  { id: 'parts', keywords: defaultKeywords('parts') },
  { id: 'accessory', keywords: defaultKeywords('accessory') },
  { id: 'attention', keywords: defaultKeywords('attention') },
  { id: 'complaint', keywords: defaultKeywords('complaint') },
  { id: 'returns', keywords: defaultKeywords('returns') },
  { id: 'quote', keywords: defaultKeywords('quote') },
  { id: 'vacancy', keywords: defaultKeywords('vacancy') },
  { id: 'location', keywords: defaultKeywords('location') },
  { id: 'company', keywords: defaultKeywords('company') },
  { id: 'social', keywords: defaultKeywords('social') },
  { id: 'thanks', keywords: defaultKeywords('thanks') },
  { id: 'credit', keywords: defaultKeywords('credit') },
  { id: 'payment', keywords: defaultKeywords('payment') },
  { id: 'shipping', keywords: defaultKeywords('shipping') },
  { id: 'orderStatus', keywords: defaultKeywords('orderStatus') },
]

export function catalogSummary() {
  return liveCatalogLabels()
}

function labelOf(term: string) {
  if (!term) return 'ese producto'
  return term.charAt(0).toUpperCase() + term.slice(1)
}

function askToNarrow(subject: string) {
  return nextAskSubject(subject)
}

export const INTENT_FOCUS_LABELS = new Set([
  'catalog',
  'quote',
  'product',
  'payment',
  'credit',
  'parts',
  'accessory',
  'greeting',
  'attention',
  'company',
  'location',
  'shipping',
  'orderStatus',
  'social',
  'thanks',
])

function subjectFrom(tokens: readonly string[], ctx?: SessionContext) {
  const family = resolvePartFamily(tokens)
  if (family && !family.ambiguous) return family.label
  const focusLabel = ctx?.conversationFocus?.label || ''
  const safeFocus = focusLabel && !INTENT_FOCUS_LABELS.has(focusLabel.toLowerCase()) ? focusLabel : ''
  return (
    findTerm(tokens, [...liveCatalogParts(), ...liveOtherParts(), ...liveAccessoryTerms()]) ||
    ctx?.entities.pieza ||
    ctx?.entities.producto ||
    ctx?.entities.accesorio ||
    ctx?.entities.namedPart ||
    safeFocus
  )
}

function quoteAsk(named: string) {
  return named ? nextAskPhrase(named) : nextAskPhrase()
}

function completeVars(named: string, extra: Record<string, string> = {}) {
  return {
    term: named || 'el producto que buscas',
    ask: quoteAsk(named),
    phone: liveContact().phoneDisplay,
    email: liveContact().email,
    catalog: catalogSummary(),
    address: liveContact().address,
    hours: liveContact().hoursDisplay,
    city: liveContact().city,
    landmark: liveContact().landmark,
    bank: livePayments().bank,
    accountType: livePayments().accountType,
    accountNumber: livePayments().accountNumber || 'el número vigente que te confirma un asesor',
    holder: livePayments().holder,
    freeMetroFrom: liveShipping().freeMetroFrom,
    cityScope: liveShipping().cityScope,
    ...extra,
  }
}

export function whatsappReply(): ChatReply {
  return {
    text: applyBotText(
      'whatsapp',
      `Puedes escribirnos por WhatsApp al ${liveContact().phoneDisplay}. El correo es ${liveContact().email}.`,
      completeVars(''),
    ),
    actions: contactActions(),
  }
}

function catalogStepActions(): ChatAction[] {
  return [
    { kind: 'catalog-download', label: 'Descargar lista de precios' },
    { href: CATALOG_PATH, label: 'Ver catálogo' },
  ]
}

function advisorContactAction(): ChatAction {
  return {
    href: whatsappHref('Hola, quiero atención de un asesor de Importadora Premium.'),
    label: 'Hablar con un asesor',
    external: true,
  }
}

function driveSearchReply(product: { codigo?: string; nombre?: string }, extraActions: ChatAction[] = []): ChatReply {
  const query = catalogSearchQuery({
    codigo: product.codigo || '',
    nombre: product.nombre || '',
  })
  return {
    text: 'Lo busqué en el catálogo.',
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }, ...extraActions],
    ...(query ? { catalogCommand: { kind: 'search' as const, query } } : {}),
  }
}

function driveFilterReply(plan: ProductQueryPlan): ChatReply {
  const payload = plan.filterPayload || { brands: [], categories: [], models: [] }
  const label = plan.filterLabel || (plan.uiSlot === 'marca' ? 'esa marca' : plan.uiSlot === 'modelo' ? 'ese modelo' : 'esa categoría')
  return {
    text: `Filtré ${label} en el catálogo.`,
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
    catalogCommand: {
      kind: 'filter',
      brands: payload.brands,
      categories: payload.categories,
      models: payload.models,
    },
  }
}

function productOptionsReply(products: ReturnType<typeof findInventoryMatches>, familyLabel = ''): ChatReply {
  return {
    text: familyLabel
      ? `Encontré varias fichas de ${labelOf(familyLabel)}. ¿Cuál buscas?`
      : 'Encontré varias fichas. ¿Cuál buscas?',
    actions: [],
    options: products.map((product) => ({
      kind: 'catalog-search' as const,
      label: catalogOptionLabel(product, products),
      search: catalogSearchQuery(product),
    })),
  }
}

function manyHitsReply(plan?: ProductQueryPlan | null): ChatReply {
  const brands = plan?.filterPayload?.brands || []
  const models = plan?.filterPayload?.models || []
  const categories = plan?.filterPayload?.categories || []
  if (brands.length || models.length || categories.length) {
    const label = plan?.filterLabel || 'el catálogo'
    return {
      text: `Hay muchas coincidencias. Filtré ${label} en la tienda; afina el nombre o el modelo.`,
      actions: catalogStepActions(),
      catalogCommand: { kind: 'filter', brands, categories, models },
    }
  }
  return {
    text: 'Hay varias coincidencias. Afina el nombre del producto, la marca y el modelo. También puedes abrir el catálogo.',
    actions: catalogStepActions(),
  }
}

function catalogNarrowReply(plan?: { act?: string } | null): ChatReply {
  if (plan?.act === 'export') {
    return {
      text: 'La lista completa de precios se descarga desde tu perfil. En el chat indica el nombre del producto, la marca y el modelo de la moto.',
      actions: catalogStepActions(),
    }
  }
  return {
    text: 'Sí, te ayudo a encontrarlos. Dime el nombre del producto, la marca y el modelo de la moto. También puedes abrir el catálogo de la tienda.',
    actions: catalogStepActions(),
  }
}

function productApiErrorReply(): ChatReply {
  return {
    text: 'No pude consultar el inventario en este momento. Intenta de nuevo o escribe a un asesor.',
    actions: [advisorContactAction(), { href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

function productMissReply(): ChatReply {
  return {
    text: 'No encontré ese producto con esos datos. Indica el nombre, la marca y el modelo de la moto. También puedes abrir el catálogo.',
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }, advisorContactAction()],
  }
}

const BUY_HINT = ' Para comprar, eliges el producto en la tienda. Un asesor cierra el pedido si lo necesitas.'

export function withHowToBuy(reply: ChatReply, tokens: readonly string[] = []): ChatReply {
  if (!isHowToBuyAsk(tokens, tokens.join(' '))) return reply
  if (/para comprar/i.test(reply.text)) return reply
  return { ...reply, text: `${reply.text}${BUY_HINT}` }
}

export function priceCardActions(term: string): ChatAction[] {
  return [
    { href: CATALOG_PATH, label: 'Ver en catálogo' },
    {
      href: whatsappHref(
        term
          ? `Hola, quiero validar el precio de ${term}.`
          : 'Hola, quiero validar un precio. Te indico pieza, marca y modelo.',
      ),
      label: 'Validar precio con un asesor',
      external: true,
    },
  ]
}

const CATEGORY_WORDS = new Set(['categoria', 'categorias', 'lineas'])
const PRODUCT_LIST_WORDS = new Set(['producto', 'productos', 'products'])

export function categorySummary() {
  return catalogSummary()
}

export function productNamesSummary() {
  return liveCatalogProducts().map((item) => item.label).join(', ')
}

export function categoriesReply(): ChatReply {
  const names = categorySummary()
  if (!names) {
    return {
      text: 'Las categorías vigentes están en el catálogo de la tienda. Ábrelo o dime marca, modelo o el nombre del producto.',
      actions: catalogStepActions(),
    }
  }
  return {
    text: applyBotText(
      'catalog',
      `Nuestras categorías publicadas son ${names}. Dime cuál te interesa y te oriento con los productos de esa línea.`,
      completeVars('', { catalog: names }),
    ),
    actions: catalogStepActions(),
  }
}

export function productsListReply(): ChatReply {
  return catalogNarrowReply(getLastProductPlan())
}

export function catalogReply(tokens: readonly string[] = []): ChatReply {
  const plan = getLastProductPlan()
  if (plan?.act === 'export' || plan?.act === 'listado' || plan?.source === 'acote') {
    return withHowToBuy(catalogNarrowReply(plan), tokens)
  }
  const wantsCategories = tokens.some((token) => CATEGORY_WORDS.has(token))
  const wantsProducts = tokens.some((token) => PRODUCT_LIST_WORDS.has(token))
  if (wantsCategories && !wantsProducts) return withHowToBuy(categoriesReply(), tokens)
  if (wantsProducts) return withHowToBuy(catalogNarrowReply(plan), tokens)
  const names = catalogSummary()
  return withHowToBuy({
    text: names
      ? applyBotText(
        'catalog',
        'En el catálogo publicado encuentras {catalog}. Ábrelo en la tienda. Si quieres la lista de precios, descárgala desde tu perfil. Escribe el nombre del producto, la marca y el modelo y te oriento.',
        completeVars('', { catalog: names }),
      )
      : 'El catálogo vigente está en la tienda. Escribe el nombre del producto, la marca y el modelo y te oriento.',
    actions: catalogStepActions(),
  }, tokens)
}

export const COMPANY_NAME_TOKENS = new Set(['premium', 'importadora', 'importador', 'importacion', 'importadores'])

export function matchingProductsForTokens(tokens: readonly string[]) {
  return findInventoryMatches(tokens).map((product) => ({
    id: product.id,
    label: product.nombre,
    description: product.descripcion,
  }))
}

function pickedProductReply(tokens: readonly string[], ctx: SessionContext): ChatReply | null {
  const picked = pickLastOffer(ctx, tokens, ctx.lastUserText || '')
  if (!picked) return null
  ctx.entities.producto = picked.nombre
  return driveSearchReply(picked)
}

function productAuthReply(): ChatReply {
  return {
    text: 'Para consultar precio, stock y productos inicia sesión en la tienda.',
    actions: [{ kind: 'login', label: 'Iniciar sesión' }],
  }
}

export function productReply(tokens: readonly string[], ctx?: SessionContext): ChatReply | null {
  const plan = getLastProductPlan()
  if (!chatHasAuth() || plan?.source === 'login') return productAuthReply()
  if (lastProductFetchFailed()) return productApiErrorReply()
  if (plan?.source === 'acote' || plan?.act === 'export' || plan?.act === 'listado') {
    return withHowToBuy(catalogNarrowReply(plan), tokens)
  }
  if (plan?.uiSlot === 'marca' || plan?.uiSlot === 'modelo' || plan?.uiSlot === 'categoria') {
    return driveFilterReply(plan)
  }
  if (ctx) {
    const picked = pickedProductReply(tokens, ctx)
    if (picked) return picked
  }
  const families = listPartFamilies(tokens)
  if (families.length >= 2) {
    if (ctx) {
      ctx.pendingConfirmation = {
        intent: 'product',
        payload: {
          kind: 'product',
          intent: 'product',
          previous: families[0].label,
          next: families[1].label,
          rightIntent: 'product',
        },
      }
    }
    return {
      text: applyBotText('disambiguation', '¿Te refieres a {left} o a {right}?', {
        left: families[0].label,
        right: families[1].label,
      }),
      actions: [],
      options: [
        { kind: 'prompt', label: families[0].label, prompt: families[0].label },
        { kind: 'prompt', label: families[1].label, prompt: families[1].label },
      ],
    }
  }
  const family = resolvePartFamily(tokens)
  if (family?.ambiguous) {
    return {
      text: 'Cuando dices freno puede ser pastillas, bandas (tambor) o discos: son productos distintos. ¿Cuál de esos buscas?',
      actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
    }
  }
  if (family?.id === 'banda_freno') {
    const hits = matchingProductsForTokens(tokens)
    if (!hits.length) return namedPartReply(tokens, ctx)
  }
  const hits = findInventoryMatches(tokens)
  if (hits.length === 0) {
    if (plan?.source === 'api' || plan?.source === 'cache') return productMissReply()
    return null
  }
  if (hits.length > 5) {
    return manyHitsReply(plan)
  }

  if (hits.length > 1) {
    rememberOffers(ctx, hits)
    const familyLabel = family?.label || findTerm(tokens, liveCatalogParts()) || ''
    return productOptionsReply(hits, familyLabel)
  }

  rememberOffers(ctx, hits)
  return driveSearchReply(hits[0])
}

export function hasProductTerm(tokens: readonly string[]) {
  return Boolean(findTerm(tokens, liveCatalogParts()) || findTerm(tokens, keywordsOf('product')))
}

export function namedPartReply(tokens: readonly string[], ctx?: SessionContext): ChatReply | null {
  const family = resolvePartFamily(tokens)
  const part =
    family && !family.ambiguous
      ? family.label
      : findTerm(tokens, liveOtherParts()) || findTerm(tokens, keywordsOf('namedPart')) || ctx?.entities.namedPart
  if (!part) return null
  const named = labelOf(part)

  return {
    text: applyBotText(
      'namedPart',
      `${named} no tiene ficha en este chat, así que no invento precio ni stock. ${askToNarrow(part)} Un asesor lo confirma al ${liveContact().phoneDisplay}.`,
      completeVars(named),
    ),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function partsReply(): ChatReply {
  const names = catalogSummary()
  return {
    text: names
      ? applyBotText(
        'parts',
        `Estas son las líneas de repuestos publicadas: ${names}. ${nextAskPhrase()} Precio y stock los confirma un asesor al ${liveContact().phoneDisplay}.`,
        completeVars('', { catalog: names }),
      )
      : `Las líneas de repuestos vigentes están en el catálogo de la tienda. ${nextAskPhrase()} Precio y stock los confirma un asesor al ${liveContact().phoneDisplay}.`,
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function accessoryReply(tokens: readonly string[] = [], ctx?: SessionContext): ChatReply {
  const accessory = findTerm(tokens, liveAccessoryTerms()) || ctx?.entities.accesorio || ''
  const named = accessory ? labelOf(accessory) : 'Accesorios'

  return {
    text: applyBotText(
      'accessory',
      `${named} se consulta con un asesor porque aquí no confirmo ficha, precio ni stock. ${quoteAsk(accessory ? named : '')} WhatsApp ${liveContact().phoneDisplay}.`,
      completeVars(accessory ? named : ''),
    ),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function socialReply(): ChatReply {
  return {
    text: applyBotText(
      'social',
      `Puedes seguirnos en ${liveContact().social.map((item) => item.label).join(', ')}. Elige la red desde las opciones o dime si buscas un producto.`,
      completeVars(''),
    ),
    actions: liveContact().social.map((item) => ({
      href: item.href,
      label: item.label,
      external: true,
    })),
  }
}

export function socialDefineReply(network: string): ChatReply {
  const base = socialReply()
  return {
    text: `${labelOf(network)} es una de nuestras redes. ${base.text}`,
    actions: base.actions,
  }
}

export function thanksReply(): ChatReply {
  return {
    text: applyBotText('thanks', 'Con gusto. Dime si necesitas otra consulta.'),
    actions: [],
  }
}

export function attentionReply(): ChatReply {
  return {
    text: applyBotText(
      'attention',
      `Te atiendo. ${nextAskPhrase()} También puedes escribir a un asesor al ${liveContact().phoneDisplay}.`,
      completeVars(''),
    ),
    actions: [
      {
        href: whatsappHref('Hola, quiero atención de un asesor.'),
        label: 'Hablar con un asesor',
        external: true,
      },
      { href: CATALOG_PATH, label: 'Ver catálogo' },
    ],
  }
}

export function complaintReply(): ChatReply {
  return {
    text: applyBotText(
      'complaint',
      `Lamentamos el inconveniente. Cuéntame qué pasó: producto, pedido y fecha, si los tienes. Te ayudo a dejarlo radicado. También puedes escribir al WhatsApp ${liveContact().phoneDisplay}. El correo es ${liveContact().email}.`,
      completeVars(''),
    ),
    actions: [
      {
        href: whatsappHref('Hola, quiero registrar una queja o reclamo.'),
        label: 'Enviar queja por WhatsApp',
        external: true,
      },
      { href: `mailto:${liveContact().email}?subject=Queja%20o%20reclamo`, label: 'Escribir al correo' },
    ],
  }
}

export function returnsReply(): ChatReply {
  const address = liveContact().address
  return {
    text: applyBotText(
      'returns',
      `Los cambios y devoluciones siguen nuestros términos y condiciones. Puedes visitarnos en ${address}. Si prefieres, un asesor te atiende.`,
      completeVars('', { address }),
    ),
    actions: [
      {
        href: whatsappHref('Hola, necesito ayuda con un cambio o una devolución.'),
        label: 'Hablar con un asesor',
        external: true,
      },
      { href: `mailto:${liveContact().email}?subject=Cambio%20o%20devolucion`, label: 'Escribir al correo' },
    ],
  }
}

export function quoteReply(tokens: readonly string[] = [], ctx?: SessionContext): ChatReply {
  const plan = getLastProductPlan()
  if (!chatHasAuth() || plan?.source === 'login') return productAuthReply()
  if (lastProductFetchFailed()) return productApiErrorReply()
  if (isBroadPriceAsk(tokens)) {
    if (ctx) ctx.holdFocus = true
    return catalogNarrowReply({ act: 'export' })
  }
  if (plan?.source === 'acote' || plan?.act === 'export' || plan?.act === 'listado') {
    if (ctx) ctx.holdFocus = true
    return catalogNarrowReply(plan)
  }
  if (plan?.uiSlot === 'marca' || plan?.uiSlot === 'modelo' || plan?.uiSlot === 'categoria') {
    return driveFilterReply(plan)
  }
  const picked = ctx ? pickLastOffer(ctx, tokens, ctx.lastUserText || '') : null
  if (picked && ctx) {
    ctx.entities.producto = picked.nombre
    return driveSearchReply(picked)
  }
  const term = subjectFrom(tokens, ctx)
  const named = term ? labelOf(term) : ''
  const hits = findInventoryMatches(tokens.length ? tokens : [term])
  if (hits.length > 5) {
    return manyHitsReply(plan)
  }
  if (hits.length > 1) {
    rememberOffers(ctx, hits)
    return productOptionsReply(hits, named)
  }
  if (hits.length === 1) {
    rememberOffers(ctx, hits)
    return driveSearchReply(hits[0])
  }
  if (plan?.source === 'api' || plan?.source === 'cache') return productMissReply()
  return {
    text: `Aún no hay ficha para ${named || 'esa consulta'} en el catálogo. Afina el nombre, la marca y el modelo.`,
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function vacancyReply(): ChatReply {
  return {
    text: 'Si te referías a vacantes para trabajar con nosotros, consulta nuestro landing principal. No puedo darte más información sobre vacantes. ¿Te ayudo con algo de esto?',
    actions: [],
    options: UNMATCHED_TOPIC_OPTIONS,
  }
}

export const HOUR_WORD_LIST = [
  'hora',
  'horas',
  'horario',
  'horarios',
  'abre',
  'abren',
  'abierto',
  'abierta',
  'abiertos',
  'abiertas',
  'cierra',
  'cierran',
  'cerrado',
  'atencion',
  'atienden',
  'hasta',
] as const

export const HOME_PLACE_LIST = ['medellin', 'antioquia', 'colombia', 'alpujarra', 'centro'] as const

export const OTHER_CITY_LIST = [
  'bogota',
  'cali',
  'barranquilla',
  'cartagena',
  'bucaramanga',
  'pereira',
  'manizales',
  'cucuta',
  'ibague',
  'villavicencio',
  'pasto',
  'neiva',
  'armenia',
  'monteria',
  'sincelejo',
  'envigado',
  'itagui',
  'bello',
  'sabaneta',
  'rionegro',
] as const

function placeAddress() {
  return `Estamos en ${liveContact().address}.`
}

export function locationReply(tokens: readonly string[] = [], raw = ''): ChatReply {
  const hours = liveContact().hoursDisplay
  const otherCities = liveLexiconSet('otherCities', new Set(OTHER_CITY_LIST))
  const homePlace = liveLexiconSet('homePlace', new Set(HOME_PLACE_LIST))
  const askedAway = tokens.find((token) => otherCities.has(token) && !homePlace.has(token))
  let text: string
  if (askedAway) {
    const city = askedAway.charAt(0).toUpperCase() + askedAway.slice(1)
    text = `No tenemos local en ${city}. Estamos en ${liveContact().address}.`
  } else if (isHoursAsk(tokens, raw) && !isLocationAsk(tokens, raw)) {
    text = `Atendemos ${hours}.`
  } else {
    text = placeAddress()
  }
  return {
    text,
    actions: [{ href: liveContact().mapsShareUrl, label: 'Abrir mapa', external: true }],
  }
}

export function creditReply(): ChatReply {
  return {
    text: applyBotText(
      'credit',
      'Para temas de crédito, únicamente los clientes Premium que llevan una gran trayectoria pueden disfrutar de este beneficio. No manejamos Sistecrédito ni financiación de terceros. Si ya eres cliente con cupo, un asesor lo valida.',
      completeVars(''),
    ),
    actions: [
      {
        href: whatsappHref('Hola, consulto si aplico al crédito de clientes Premium con trayectoria.'),
        label: 'Validar crédito con un asesor',
        external: true,
      },
    ],
  }
}

export function paymentReply(tokens: readonly string[] = [], ctx?: SessionContext): ChatReply {
  void tokens
  void ctx
  return {
    text: 'Tenemos diversos medios de pago: efectivo, transferencia, y crédito si eres uno de nuestros clientes Premium.',
    actions: [],
  }
}

export function shippingReply(): ChatReply {
  const ship = liveShipping()
  return {
    text: `Hacemos envíos a todo el país. En el ${ship.cityScope} el domicilio es gratis desde $${ship.freeMetroFrom} COP. En compras menores, el valor del domicilio depende de la ubicación.`,
    actions: [],
  }
}

export function executiveReply(): ChatReply {
  return {
    text: 'Actualmente no puedo proporcionarte información sobre tu consulta. Puedo comunicarte con un asesor real.',
    actions: [
      {
        href: whatsappHref('Hola, quiero hablar con un asesor de Importadora Premium.'),
        label: 'Hablar con un asesor',
        external: true,
      },
    ],
  }
}

export function symptomGuidanceReply(label: string, candidates: readonly string[]): ChatReply {
  const list = candidates.join(', ')
  return {
    text: applyBotText(
      'symptomGuidance',
      `Entiendo el síntoma (${label}). Lo más probable es revisar ${list}. ¿Me confirmas marca y modelo del vehículo?`,
      completeVars('', { symptom: label, candidates: list }),
    ),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
    options: candidates.map((item) => ({
      kind: 'catalog-search' as const,
      label: item,
      search: item,
    })),
    catalogCommand: { kind: 'search', query: candidates[0] || '' },
  }
}

export function compatibilityAskReply(): ChatReply {
  return {
    text: applyBotText(
      'compatibilityAsk',
      'Para confirmar compatibilidad necesito marca, modelo y año del vehículo. ¿Me los pasas?',
      completeVars(''),
    ),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function explainPartReply(part: string, knowledge: string): ChatReply {
  return {
    text: applyBotText(
      'explainPart',
      `${labelOf(part)} sirve para esto: ${knowledge} Si quieres, te muestro referencias; dime marca y modelo del vehículo.`,
      completeVars(part, { part, function: knowledge }),
    ),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
    catalogCommand: { kind: 'search', query: part },
  }
}

function chipOptions(labels: readonly string[]): ChatAction[] {
  return labels.filter(Boolean).slice(0, 7).map((label) => ({
    kind: 'prompt' as const,
    label,
    prompt: label,
  }))
}

export function scaffoldAskBrandReply(family: string, chips: readonly string[]): ChatReply {
  return {
    text: `Perfecto, manejamos ${family}. ¿Para qué marca de vehículo lo necesitas?`,
    actions: [],
    options: chipOptions(chips),
  }
}

export function scaffoldAskModelReply(family: string, brand: string, chips: readonly string[]): ChatReply {
  return {
    text: brand
      ? `Bien, ${family} para ${brand}. ¿Qué modelo es?`
      : `Bien, veamos. ¿Qué modelo aproximado usas, o prefieres que te muestre las más consultadas?`,
    actions: [],
    options: chipOptions(chips),
  }
}

export function scaffoldAskYearReply(brand: string, model: string, chips: readonly string[]): ChatReply {
  const vehicle = [brand, model].filter(Boolean).join(' ')
  return {
    text: vehicle
      ? `¿De qué año aproximado es tu ${vehicle}? (opcional, puedes omitirlo)`
      : '¿De qué año aproximado es el vehículo? (opcional, puedes omitirlo)',
    actions: [],
    options: chipOptions(chips),
  }
}

export function scaffoldAbortReply(family: string): ChatReply {
  const query = family || ''
  return {
    text: 'Sin problema. Te dejo el buscador abierto con todo, o escríbeme un término más específico cuando quieras.',
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
    ...(query ? { catalogCommand: { kind: 'search' as const, query } } : {}),
  }
}

export function scaffoldMaxTurnsReply(family: string): ChatReply {
  return {
    text: `Para no hacerlo largo, te muestro las opciones más cercanas de ${family}, o te conecto con un asesor al ${liveContact().phoneDisplay} para afinar contigo.`,
    actions: [advisorContactAction()],
  }
}

export function scaffoldInventoryReply(
  ctx: SessionContext,
  tokens: readonly string[],
  family: string,
  limit = 3,
): ChatReply {
  if (!chatHasAuth() || getLastProductPlan()?.source === 'login') {
    return {
      text: 'Para consultar precio, stock y productos inicia sesión en la tienda.',
      actions: [{ kind: 'login', label: 'Iniciar sesión' }],
    }
  }
  if (lastProductFetchFailed()) {
    return {
      text: 'No pude consultar el inventario en este momento. Intenta de nuevo o escribe a un asesor.',
      actions: [advisorContactAction(), { href: CATALOG_PATH, label: 'Ver catálogo' }],
    }
  }
  const hits = findInventoryMatches(tokens).slice(0, limit)
  const query = tokens.join(' ') || family
  if (!hits.length) {
    return {
      text: `No encontré ${family} con esos datos. Afina marca o modelo, o te conecto con un asesor.`,
      actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }, advisorContactAction()],
      catalogCommand: { kind: 'search', query: family },
    }
  }
  rememberOffers(ctx, hits)
  if (hits.length === 1) return driveSearchReply(hits[0])
  return {
    text: `Encontré estas opciones para ${family}. Te muestro ${hits.length}:`,
    actions: [],
    options: hits.map((product) => ({
      kind: 'catalog-search' as const,
      label: catalogOptionLabel(product, hits),
      search: catalogSearchQuery(product),
    })),
    catalogCommand: { kind: 'search', query },
  }
}

export function orderStatusReply(): ChatReply {
  return {
    text: applyBotText(
      'orderStatus',
      'Este chat no consulta el estado de pedidos. Esa información la confirma tu vendedor o ingresando a tu usuario cliente Premium.',
      completeVars(''),
    ),
    actions: [],
  }
}

export function rectifyTypoReply(guess: string): ChatReply {
  return {
    text: applyBotText('rectifyTypo', '¿Quisiste decir {guess}?', { guess, term: guess }),
    actions: [],
    options: [
      { kind: 'prompt', label: 'Sí', prompt: 'si' },
      { kind: 'prompt', label: 'No', prompt: 'no' },
    ],
  }
}

export function rectifyFocusReply(focus: string): ChatReply {
  return {
    text: applyBotText('rectifyFocus', '¿Seguimos con {term} o me dices otra pieza?', { term: focus }),
    actions: [],
    options: [
      { kind: 'prompt', label: 'Seguimos', prompt: focus },
      { kind: 'prompt', label: 'Otra consulta', prompt: 'otra cosa' },
    ],
  }
}

export function rectifyNeedPartReply(): ChatReply {
  return {
    text: applyBotText(
      'rectifyNeedPart',
      nextAskPhrase(),
    ),
    actions: [],
  }
}

export function companyReply(): ChatReply {
  const brands = liveBrandNames().slice(0, 3).join(', ') || 'nuestras marcas'
  return {
    text: applyBotText(
      'company',
      `Importadora Premium: puedes conocer la visión, el equipo y marcas aliadas como ${brands}. Dime si buscas empresa, una persona del equipo o un producto.`,
      completeVars('', { brands }),
    ),
    actions: [
      { href: CATALOG_PATH, label: 'Ver catálogo' },
      advisorContactAction(),
    ],
  }
}

export const BOT_WELCOME_DEFAULT =
  'Hola, soy BotIP, tu asistente Premium. Puedes indicarme cuál es tu duda en un solo mensaje. Puedo ayudarte a encontrar piezas o productos por marca o modelo, o si necesitas consultar el precio de un repuesto o accesorio, información sobre nosotros o hablar con un asesor.'

export function welcomeReply(): ChatReply {
  return {
    text: getBotSettings().welcome.trim() || BOT_WELCOME_DEFAULT,
    actions: [],
  }
}

export function greetingReply(ctx?: SessionContext): ChatReply {
  const name = ctx?.entities.userName
  const hello = name
    ? `Hola ${labelOf(name)}. ¿En qué te ayudo?`
    : applyBotText('greeting', 'Hola, ¿en qué te ayudo?')
  return {
    text: hello,
    actions: [],
  }
}

export function userNameAckReply(name: string): ChatReply {
  return {
    text: `Gracias, ${labelOf(name)}. Quedo con tu nombre para esta conversación. ${nextAskPhrase()}`,
    actions: [],
  }
}

export function howAreYouReply(): ChatReply {
  return {
    text: 'Excelente, feliz de atenderte. ¿En qué te puedo ayudar?',
    actions: [],
  }
}

export function insultUnmatchedReply(): ChatReply {
  return {
    text: applyBotText('insult', 'Esa expresión no es una consulta. Dime el producto o el motivo, con respeto.'),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function sexualUnmatchedReply(): ChatReply {
  return {
    text: applyBotText('sexual', 'Eso no es una consulta de este chat. Dime el producto que buscas.'),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function violenceUnmatchedReply(word: string): ChatReply {
  return {
    text: applyBotText('violence', `${labelOf(word)} no es un tema de este chat. Dime si buscas un repuesto.`, { term: labelOf(word) }),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function foodUnmatchedReply(word: string): ChatReply {
  return {
    text: applyBotText('food', `${labelOf(word)} no es un producto de este chat. Aquí atendemos repuestos, así que dime la pieza.`, { term: labelOf(word) }),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function creatureUnmatchedReply(word: string): ChatReply {
  return {
    text: applyBotText('creature', `${labelOf(word)} no es un repuesto. Dime la pieza que buscas.`, { term: labelOf(word) }),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

export function vehicleUnmatchedReply(word: string): ChatReply {
  const label = labelOf(word)
  return {
    text: applyBotText('vehicle', `${label} es un vehículo, no un producto. Dime la marca, el modelo y la pieza.`, { term: label }),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }],
  }
}

function memberWhatsapp(member: LandingTeamMember) {
  const digits = member.whatsappDigits || member.phoneDisplay.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : liveContact().whatsappUrl
}

function rolePhrase(role: string) {
  const clean = role.trim()
  if (!clean) return 'parte del equipo'
  return clean.charAt(0).toLowerCase() + clean.slice(1)
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2) return `${names[0]} y ${names[1]}`
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

function describeMember(member: LandingTeamMember) {
  const role = rolePhrase(member.role)
  const phone = member.phoneDisplay || 'el número del equipo'
  return applyBotText('teamMember', `${member.fullName} es ${role}. Puedes escribirle al ${phone}.`, {
    name: member.fullName,
    role,
    phone,
    term: member.fullName,
  })
}

const ROLES_LINE = 'En Premium hay varios roles; los publicados son asesores y administrativos.'

function advisorGroupReply(_members: LandingTeamMember[], kind: ReturnType<typeof advisorAskKind>): ChatReply {
  const list = livePublishedTeam('asesor').filter((item) => item.fullName.trim())
  const names = joinNames(list.map((member) => member.fullName))
  const carousel: ChatAction = advisorContactAction()
  const options = list.map((member) => ({ kind: 'prompt' as const, label: member.fullName, prompt: member.fullName }))

  if (list.length === 0) {
    return {
      text: applyBotText('teamEmpty', 'Por ahora no hay asesores en el equipo.', { group: 'asesores' }),
      actions: [carousel],
    }
  }

  if (kind === 'ask') {
    return {
      text: `${ROLES_LINE} Puedes preguntarle a cualquiera de nuestro equipo comercial: ${names}. Indícame el nombre del asesor que quieres que te atienda y te paso el contacto.`,
      actions: [carousel],
      options,
    }
  }

  if (kind === 'exist') {
    return {
      text: `${ROLES_LINE} Estos son los asesores publicados: ${names}. Elige con libertad el que mejor se ajuste a tu perfil; dime el nombre y te oriento con su contacto.`,
      actions: [carousel],
      options,
    }
  }

  if (kind === 'call') {
    return {
      text: `${ROLES_LINE} Puedes llamar o escribir a cualquiera de estos asesores: ${names}. Elige uno aquí y te paso el contacto.`,
      actions: [carousel],
      options,
    }
  }

  return {
    text: `${ROLES_LINE} En el grupo de asesores están ${names}. Elije el asesor que desees`,
    actions: [carousel],
    options,
  }
}

export function teamMatchReply(match: Exclude<TeamMatch, null>, tokens: readonly string[] = []): ChatReply {
  if (match.type === 'all') {
    const asesores = match.asesores.map((member) => member.fullName)
    const admins = match.administrativos.map((member) => member.fullName)
    const advisorLine = asesores.length
      ? `En asesores están ${joinNames(asesores)}.`
      : 'Por ahora no hay asesores publicados.'
    const adminLine = admins.length
      ? `En administrativos están ${joinNames(admins)}.`
      : 'Por ahora no hay administrativos publicados.'
    return {
      text: `${ROLES_LINE} ${advisorLine} ${adminLine} Dime un nombre si quieres el teléfono o escribirle.`,
      actions: [advisorContactAction()],
    }
  }

  if (match.type === 'member') {
    const listed = match.members.slice(0, 4)
    const lines = listed.map(describeMember)
    const more =
      match.members.length > listed.length
        ? ` Hay ${match.members.length - listed.length} coincidencias más en el equipo.`
        : ''
    const text = listed.length === 1 ? lines[0] : `Encontré a estas personas. ${lines.join(' ')}`
    return {
      text: `${text}${more}`,
      actions: [
        { href: memberWhatsapp(listed[0]), label: `WhatsApp de ${listed[0].fullName}`, external: true },
        advisorContactAction(),
      ],
    }
  }

  if (match.type === 'group') {
    if (match.group === 'asesor') return advisorGroupReply(match.members, advisorAskKind(tokens))
    const shown = match.members.map((member) => member.fullName)
    const group = groupLabel(match.group).toLowerCase()
    const names = joinNames(shown)
    return {
      text:
        match.members.length === 0
          ? applyBotText('teamEmpty', `Por ahora no hay ${group} en el equipo.`, { group })
          : applyBotText('teamGroup', `${ROLES_LINE} En el grupo de ${group} están ${names}. Dime un nombre y te doy el teléfono.`, {
              group,
              names,
              term: names,
            }),
      actions: [advisorContactAction()],
    }
  }

  const role = rolePhrase(match.member.role)
  const phone = match.member.phoneDisplay || 'el número del equipo'
  return {
    text: applyBotText(
      'teamSuggest',
      `No encuentro a ${labelOf(match.asked)}. ¿Te refieres a ${match.member.fullName}? Es ${role} y puedes escribirle al ${phone}.`,
      {
        asked: labelOf(match.asked),
        name: match.member.fullName,
        role,
        phone,
      },
    ),
    actions: [
      { href: memberWhatsapp(match.member), label: `WhatsApp de ${match.member.fullName}`, external: true },
      advisorContactAction(),
    ],
  }
}

export function personUnmatchedReply(word: string): ChatReply {
  const label = labelOf(word)
  return {
    text: applyBotText('person', `${label} no está en el equipo ni en el catálogo. Dime si es un nombre o una pieza.`, { term: label }),
    actions: [{ href: CATALOG_PATH, label: 'Ver catálogo' }, advisorContactAction()],
  }
}

function quoteTerm(value: string) {
  const clean = value.trim()
  if (!clean) return 'eso'
  return clean.length > 40 ? `${clean.slice(0, 37)}…` : clean
}

export function companyHintReply(word: string): ChatReply {
  const term = quoteTerm(word)
  return {
    text: applyBotText(
      'fallbackCompany',
      '"{term}" se refiere a nosotros, Importadora Premium. Esa palabra sola no me dice qué necesitas. ¿Buscas un repuesto concreto, por ejemplo pastillas AKT?',
      { term },
    ),
    actions: [
      { href: CATALOG_PATH, label: 'Ver catálogo' },
      advisorContactAction(),
    ],
  }
}

export function fallbackReply(entered = ''): ChatReply {
  const shown = quoteTerm(entered.trim()).slice(0, 48)
  const text = shown
    ? `No logré relacionar "${shown}" con una respuesta útil. Elige una opción o vuelve a escribir tu duda en un solo mensaje (pieza, marca o modelo).`
    : 'No logré relacionar el mensaje anterior con una respuesta útil. Elige una opción o vuelve a escribir tu duda en un solo mensaje (pieza, marca o modelo).'

  return {
    text,
    actions: [],
    options: UNMATCHED_TOPIC_OPTIONS,
  }
}

export const UNMATCHED_TOPIC_OPTIONS: ChatAction[] = [
  { kind: 'prompt', label: 'Catálogo', prompt: 'quiero ver el catalogo' },
  { kind: 'prompt', label: 'Precio o disponibilidad', prompt: 'quiero cotizar un producto' },
  { kind: 'prompt', label: 'Empresa', prompt: 'informacion de la empresa' },
  { kind: 'prompt', label: 'Equipo y roles', prompt: 'quiero conocer el equipo' },
  { kind: 'prompt', label: 'Marca o modelo', prompt: 'busco productos para honda' },
  { kind: 'prompt', label: 'Hablar con un asesor', prompt: 'quiero hablar con un asesor' },
]

export function clarificationReply(): ChatReply {
  return { text: applyBotText('clarification', `No alcancé a leer un mensaje. ${nextAskPhrase()}`), actions: [] }
}

export function newTopicPromptReply(): ChatReply {
  return {
    text: `Listo, cambiamos de tema. ${nextAskPhrase()}`,
    actions: catalogStepActions(),
  }
}

export function switchMissReply(term: string): ChatReply {
  const shown = quoteTerm(term)
  return {
    text: `No tengo ficha de inventario para ${shown}. Puedes ver el catálogo o validar con un asesor.`,
    actions: catalogStepActions(),
  }
}

export const FALLBACK_MENU_OPTIONS: ChatAction[] = [
  { kind: 'prompt', label: 'Precios', prompt: 'quiero cotizar un producto' },
  { kind: 'prompt', label: 'Productos', prompt: 'quiero ver el catalogo' },
  { kind: 'prompt', label: 'Soporte técnico', prompt: 'quiero hablar con un asesor' },
]

export function menuReply(): ChatReply {
  return {
    text: applyBotText('fallbackMenu', 'Elige una opción para continuar:'),
    actions: [],
    options: UNMATCHED_TOPIC_OPTIONS,
  }
}

export function handoffReply(): ChatReply {
  return {
    text: applyBotText('humanHandoff', '¿Quieres que te conecte con un asesor humano?'),
    actions: contactActions(),
  }
}

export function disambiguationReply(left: string, right: string): ChatReply {
  return choiceReply(left, right)
}

export function choiceReply(left: string, right: string): ChatReply {
  return {
    text: applyBotText('disambiguation', '¿Te refieres a {left} o a {right}?', { left, right }),
    actions: [],
    options: [
      { kind: 'prompt', label: left, prompt: left },
      { kind: 'prompt', label: right, prompt: right },
    ],
  }
}

export function entityConflictReply(previous: string, next: string): ChatReply {
  return choiceReply(previous, next)
}

export function productTokensFromLabel(label: string) {
  const product = liveCatalogProducts().find((item) => item.label === label)
  if (product) return [product.id]
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

export function ackRepeatReply(topic: string): ChatReply {
  return {
    text: applyBotText('ackRepeat', 'Sigo con eso.', { topic: topic || 'eso' }),
    actions: [],
  }
}

export function ackKeywordReply(token: string): ChatReply {
  return {
    text: applyBotText(
      'ackKeywordRepeat',
      "Veo que mencionas '{token}' varias veces. ¿Quieres precio, disponibilidad o compatibilidad?",
      { token },
    ),
    actions: [],
  }
}

export function farewellReply(): ChatReply {
  return { text: applyBotText('farewell', '¡Hasta luego!'), actions: [] }
}

export const INTENT_LABELS: Record<string, string> = {
  greeting: 'un saludo',
  whatsapp: 'contacto o WhatsApp',
  catalog: 'el catálogo',
  parts: 'repuestos',
  accessory: 'un accesorio',
  product: 'un producto del catálogo',
  attention: 'hablar con un asesor',
  complaint: 'una queja',
  returns: 'un cambio o devolución',
  quote: 'precio o stock',
  vacancy: 'vacantes',
  location: 'la ubicación',
  credit: 'crédito',
  payment: 'medios de pago',
  shipping: 'envíos o domicilio',
  orderStatus: 'el estado de un pedido',
  company: 'la empresa',
  social: 'redes sociales',
  thanks: 'un cierre',
  namedPart: 'una pieza sin ficha',
  teamMember: 'alguien del equipo',
  teamGroup: 'un grupo del equipo',
  teamSuggest: 'un nombre parecido',
}

export function humanTopic(raw: string) {
  const value = raw.trim()
  if (!value || value === 'eso') return 'eso'
  const [intent, piece] = value.split(':')
  if (piece?.trim()) return piece.trim()
  return INTENT_LABELS[intent] || INTENT_LABELS[value] || value
}
