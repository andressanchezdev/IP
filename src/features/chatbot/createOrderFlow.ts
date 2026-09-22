import { chatHasAuth, hydrateChatProducts } from './productSource'
import {
  findInventoryMatches,
  formatMatchLine,
  formatMatchesListText,
  pickLastOffer,
  productChoiceOptions,
  rememberOffers,
  retailPrice,
  searchBarQuery,
} from './inventory'
import { liveInventory } from './botip/liveData'
import { isCreateOrderAsk, isHoursAsk, isLocationAsk, isPaymentAsk, pareceCodigo, searchMissGuideText, releaseRemainder } from './conversationThread'
import { resetScaffold } from './scaffoldSearch'
import type { ChatAction, ChatReply } from './intents'
import type { OrderFlow, OrderFlowPendingProduct, SessionContext } from './sessionContext'
import type { ProductRecord } from './types'

export type ChatBulkPending = {
  comparison: {
    results: Array<{
      id?: string | null
      codigo?: string
      estado?: string
      cantidad?: number
      stock?: number
      precio?: number
    }>
  }
  omitted: Array<{ line?: number; codigo?: string; reason?: string }>
  lineCount: number
  validCount: number
  errorLines: string[]
}

const AFFIRM = new Set(['si', 'ok', 'dale', 'claro', 'yes', 'perfecto', 'va', 'listo'])
const NEGATE = new Set(['no', 'nope', 'nel', 'nada'])
const ABORT = /\b(dejalo|otra cosa|no importa|olvidalo|cancelar|olvidar|cambiando de tema|en cambio|dejemos eso|reiniciar|empecemos de nuevo|salir|mejor quiero|ahora quiero)\b/
const EXPLAIN_MORE = /\b(explicame|mas detalle|mas informacion|como funciona|con mas detalle)\b/
const YES_NO: ChatAction[] = [
  { kind: 'prompt', label: 'Sí', prompt: 'si' },
  { kind: 'prompt', label: 'No', prompt: 'no' },
]
const BULK_DETAIL = [
  'Descarga la plantilla desde "Subir nuevo archivo".',
  'El Excel tiene 2 columnas: CODIGO y CANTIDAD.',
  'Una fila por producto. Ejemplo: 2DP-F5805-00TA | 10',
  'Arrástralo al chat o súbelo en el drawer.',
]
const CHECKOUT_DETAIL = [
  'En el carrito pulsa Finalizar pedido.',
  'Completa nombre, documento, dirección, ciudad, teléfono y correo.',
  'Elige efectivo, transferencia o crédito.',
  'Pulsa Confirmar pedido. Luego entra la verificación.',
]
const UNKNOWN_SIZE = /\b(no se|nose|no se cuantos|no se cuantas|cualquiera|no estoy seguro)\b/
const ACCOMPANY = /\b(acompana|acompaname|paso a paso|guiame|ayuda|ayudame|si)\b/
const ALONE = /\b(solo|sola|yo solo|lo hago yo|prefiero solo)\b/
const CONFIRM_ORDER = /\b(confirmar|confirmo|confirmar pedido|ya confirme|ya pague|ya pagué)\b/
const MISSING_DELIVERY = /\b(entrega|direccion|datos de entrega)\b/
const MISSING_PAY = /\b(pago|medio de pago|efectivo|transferencia|credito|tarjeta)\b/

let pendingBulk: ChatBulkPending | null = null

export function emptyOrderFlow(): OrderFlow {
  return {
    currentState: 'idle',
    addedDistinct: 0,
    pendingProduct: null,
    pendingQty: 0,
    confirmRetries: 0,
    productConfirmed: false,
    explainTopic: '',
    explainStep: 0,
  }
}

export function ensureOrderFlow(ctx: SessionContext) {
  if (!ctx.orderFlow) ctx.orderFlow = emptyOrderFlow()
  return ctx.orderFlow
}

export function resetOrderFlow(ctx: SessionContext) {
  ctx.orderFlow = emptyOrderFlow()
  pendingBulk = null
}

export function isOrderFlowActive(ctx: SessionContext) {
  const state = ctx.orderFlow?.currentState
  return Boolean(state && state !== 'idle')
}

export function orderProcessGuideReply(): ChatReply {
  return checkoutOfferReply()
}

export function beginAddFromLastOffer(ctx: SessionContext): ChatReply | null {
  const offers = ctx.lastOffers || []
  if (offers.length !== 1) return null
  const offer = offers[0]
  const product = liveInventory().find((item) => item.id === offer.id)
  const flow = ensureOrderFlow(ctx)
  flow.pendingProduct = product
    ? toPendingProduct(product)
    : {
        id: String(offer.id),
        label: offer.label,
        codigo: offer.codigo || '',
        price: offer.price,
        stock: Number(offer.cantidad) || 0,
      }
  flow.pendingQty = 0
  flow.confirmRetries = 0
  flow.productConfirmed = false
  return askQtyDefault(ctx)
}

function tryExplain(ctx: SessionContext, text: string, topic: 'bulk' | 'checkout'): ChatReply | null {
  const flow = ensureOrderFlow(ctx)
  if (flow.explainTopic === topic && NEGATE.has(text)) {
    flow.explainTopic = ''
    flow.explainStep = 0
    return reply('Ok.')
  }
  if (EXPLAIN_MORE.test(text) && flow.explainTopic !== topic) {
    flow.explainTopic = topic
    flow.explainStep = 0
    return nextExplainReply(ctx, topic)
  }
  if (flow.explainTopic === topic && (AFFIRM.has(text) || EXPLAIN_MORE.test(text))) {
    return nextExplainReply(ctx, topic)
  }
  return null
}

function nextExplainReply(ctx: SessionContext, topic: 'bulk' | 'checkout'): ChatReply {
  const flow = ensureOrderFlow(ctx)
  const steps = topic === 'bulk' ? BULK_DETAIL : CHECKOUT_DETAIL
  const index = Math.max(0, Number(flow.explainStep) || 0)
  if (index >= steps.length) {
    flow.explainTopic = ''
    flow.explainStep = 0
    return reply('Listo. Eso cubre los pasos.')
  }
  flow.explainTopic = topic
  const step = steps[index]
  flow.explainStep = index + 1
  const more = index + 1 < steps.length
  const title = topic === 'bulk' ? '📄 Carga masiva' : '🛒 Pedido'
  return reply(
    [`${title} — Paso ${index + 1}`, '', step, '', more ? '¿Te explico el siguiente paso?' : 'Esos son todos los pasos.'].join('\n'),
    more ? { options: YES_NO } : {},
  )
}

export function takePendingChatBulk() {
  const next = pendingBulk
  pendingBulk = null
  return next
}

function fold(raw = '') {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[¿?¡!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function reply(text: string, extra: Partial<ChatReply> = {}): ChatReply {
  return { text, actions: extra.actions || [], options: extra.options, catalogCommand: extra.catalogCommand }
}

function loginReply(): ChatReply {
  return reply('Para agregar productos al carrito necesitas iniciar sesión.', {
    actions: [{ kind: 'login', label: 'Iniciar sesión' }],
  })
}

function introReply(): ChatReply {
  return reply(
    [
      '🛒 Crear pedido',
      '',
      '¿Cuántos productos tendrá?',
      '',
      '· Hasta 10 → te guío uno a uno',
      '· 11 a 20 → eliges la ruta',
      '· Más de 20 → carga masiva con Excel',
    ].join('\n'),
    {
      options: [
        { kind: 'prompt', label: 'Hasta 10', prompt: '10' },
        { kind: 'prompt', label: 'Entre 11 y 20', prompt: '15' },
        { kind: 'prompt', label: 'Más de 20', prompt: '30' },
        { kind: 'prompt', label: 'No sé', prompt: 'no se' },
      ],
    },
  )
}

function fallbackSearchReply(): ChatReply {
  return reply(searchMissGuideText(), {
    actions: [{ kind: 'focus-search', href: '/', label: 'Abrir barra de búsqueda' }],
  })
}

function askMoreReply(): ChatReply {
  return reply(['➕ ¿Agregar otro producto?', '', '[ Sí ]   [ No ]'].join('\n'), {
    options: YES_NO,
  })
}

function closeLoopReply(): ChatReply {
  return reply(
    [
      '✅ Listo, no agregamos más.',
      '',
      '🛒 Tus productos están en el carrito.',
      '',
      'Para finalizar el pedido:',
      '',
      '1. Revisa el carrito',
      '2. Finaliza el pedido',
      '3. Ingresa datos de entrega',
      '4. Elige medio de pago',
      '5. Confirma',
      '',
      '> Te abro el carrito.',
    ].join('\n'),
    {
      catalogCommand: { kind: 'open-cart' },
    },
  )
}

function productAddLabel(product: ProductRecord) {
  const name = String(product.nombre || '').trim()
  if (name) return name
  const bits = [product.descripcion, product.modelo, product.marca].map((value) => String(value || '').trim()).filter(Boolean)
  if (bits.length) return bits.join(' ')
  return product.codigo || 'este producto'
}

function routeAAskProduct(): ChatReply {
  return reply('Dime modelo, marca o pega el código.')
}

function routeBGuide(): ChatReply {
  return reply(
    [
      '📄 Carga masiva en 4 pasos:',
      '',
      '1. Abre "Subir nuevo archivo"',
      '2. Descarga la plantilla',
      '3. Llena: CODIGO | CANTIDAD',
      '4. Súbela aquí',
      '',
      'Los productos van al carrito. Luego finalizas el pedido.',
    ].join('\n'),
    {
      actions: [
        { kind: 'open-bulk-upload', label: 'Abrir Subir nuevo archivo' },
        { kind: 'download-template', label: 'Descargar plantilla' },
      ],
      options: [
        { kind: 'prompt', label: 'Más detalle', prompt: 'explicame mas' },
        { kind: 'prompt', label: 'Ya tengo el Excel', prompt: 'ya tengo el excel' },
      ],
    },
  )
}

function chooseRouteReply(): ChatReply {
  return reply(
    [
      '🛒 Rango intermedio',
      '',
      '· Uno a uno',
      '· Carga masiva',
      '',
      '[ Sí ] uno a uno   [ No ] masiva',
    ].join('\n'),
    {
      options: [
        { kind: 'prompt', label: 'Uno a uno', prompt: 'pedido pequeno' },
        { kind: 'prompt', label: 'Carga masiva', prompt: 'pedido grande' },
      ],
    },
  )
}

function checkoutOfferReply(): ChatReply {
  return reply(
    [
      '🛒 Productos en el carrito',
      '',
      'Para crear el pedido:',
      '',
      '1. Finaliza el pedido',
      '2. Ingresa datos de entrega',
      '3. Elige medio de pago',
      '4. Confirma',
      '',
      '> Después hacemos la verificación final.',
      '',
      '📦 ¿Finalizar pedido ahora?',
      '',
      '[ Sí ]   [ No ]',
    ].join('\n'),
    {
      actions: [{ kind: 'open-cart', label: 'Abrir carrito' }],
      options: [
        { kind: 'prompt', label: 'Sí', prompt: 'acompaname' },
        { kind: 'prompt', label: 'No', prompt: 'solo' },
      ],
    },
  )
}

function checkoutGuideReply(): ChatReply {
  return reply(
    [
      '🛒 Crear el pedido',
      '',
      '1. Pulsa Finalizar pedido',
      '2. Completa datos de entrega',
      '3. Elige medio de pago',
      '4. Confirma',
      '',
      '> Sin entrega y pago no se crea.',
    ].join('\n'),
    {
      actions: [{ kind: 'open-cart', label: 'Abrir carrito' }],
      options: [{ kind: 'prompt', label: 'Más detalle', prompt: 'explicame mas' }],
    },
  )
}

function toPendingProduct(product: ProductRecord): OrderFlowPendingProduct {
  return {
    id: String(product.id),
    label: productAddLabel(product),
    codigo: product.codigo || '',
    price: retailPrice(product),
    stock: Number(product.cantidad) || 0,
  }
}

function parseSize(raw: string, tokens: readonly string[]) {
  const text = fold(raw)
  if (UNKNOWN_SIZE.test(text) || text === 'no se') return 'unknown'
  if (/\b(pedido pequeno|pequeno|uno a uno|ruta a|opcion 1)\b/.test(text) || tokens.includes('10')) {
    const n = Number(tokens.find((token) => /^\d+$/.test(token)) || '')
    if (n > 10) return n
    if (/\b(pedido pequeno|pequeno|uno a uno)\b/.test(text)) return 10
  }
  if (/\b(pedido grande|grande|carga masiva|ruta b|opcion 2|excel)\b/.test(text)) return 30
  const match = text.match(/\b(\d{1,4})\b/)
  if (!match) return null
  return Number(match[1])
}

function parseQty(raw: string, tokens: readonly string[]) {
  const digits = tokens.map((token) => Number(token)).find((value) => Number.isInteger(value) && value > 0)
  if (digits) return digits
  const match = fold(raw).match(/\b(\d{1,5})\b/)
  return match ? Number(match[1]) : 0
}

function startFlow(ctx: SessionContext): ChatReply {
  resetScaffold(ctx)
  const flow = ensureOrderFlow(ctx)
  flow.currentState = 'awaitingSize'
  flow.addedDistinct = 0
  flow.pendingProduct = null
  flow.pendingQty = 0
  flow.confirmRetries = 0
  flow.productConfirmed = false
  pendingBulk = null
  return introReply()
}

function applySize(ctx: SessionContext, size: number | 'unknown'): ChatReply {
  const flow = ensureOrderFlow(ctx)
  if (size === 'unknown') {
    flow.currentState = 'awaitingSize'
    return reply(
      'Si son pocos (hasta ~10) te los busco uno a uno. Si son muchos (más de ~20) conviene el Excel. ¿Cuál ruta prefieres?',
      {
        options: [
          { kind: 'prompt', label: 'Uno a uno', prompt: 'pedido pequeno' },
          { kind: 'prompt', label: 'Carga masiva', prompt: 'pedido grande' },
        ],
      },
    )
  }
  if (size <= 10) {
    flow.currentState = 'routeA_product'
    return routeAAskProduct()
  }
  if (size <= 20) {
    flow.currentState = 'awaitingSize'
    return chooseRouteReply()
  }
  flow.currentState = 'routeB_guide'
  return routeBGuide()
}

async function searchRouteA(ctx: SessionContext, tokens: readonly string[], raw: string): Promise<ChatReply> {
  const flow = ensureOrderFlow(ctx)
  await hydrateChatProducts({ tokens, raw, ctx, kind: 'fresh' })
  const hits = findInventoryMatches(tokens)
  if (!hits.length) {
    flow.currentState = 'routeA_product'
    return fallbackSearchReply()
  }
  rememberOffers(ctx, hits)
  if (hits.length === 1) {
    flow.pendingProduct = toPendingProduct(hits[0])
    flow.currentState = 'routeA_qty'
    const item = hits[0]
    return reply(
      [
        '🔍 Encontré:',
        '',
        formatMatchLine(item),
        '',
        '🛒 ¿Qué cantidad agrego al carrito?',
      ].join('\n'),
    )
  }
  flow.currentState = 'routeA_product'
  const shown = hits.slice(0, 5)
  const query = searchBarQuery(raw, { raw, tokens, ctx, products: shown })
  return reply(
    formatMatchesListText(raw, shown),
    {
      options: productChoiceOptions(shown),
      ...(query ? { catalogCommand: { kind: 'search' as const, query } } : {}),
    },
  )
}

function pickRouteAProduct(ctx: SessionContext, tokens: readonly string[], raw: string) {
  const flow = ensureOrderFlow(ctx)
  const indexMatch = fold(raw).match(/^\s*(\d{1,2})\s*$/)
  if (indexMatch && ctx.lastOffers?.length) {
    const offer = ctx.lastOffers[Number(indexMatch[1]) - 1]
    if (offer) {
      flow.pendingProduct = {
        id: String(offer.id),
        label: offer.label,
        codigo: offer.codigo || '',
        price: offer.price,
        stock: Number(offer.cantidad) || 0,
      }
      flow.currentState = 'routeA_qty'
      return reply(`¿Qué cantidad de ${flow.pendingProduct.label || 'ese producto'} agrego al carrito?`)
    }
  }
  const offer = pickLastOffer(ctx, tokens, raw)
  if (offer) {
    const hits = findInventoryMatches(tokens.length ? tokens : [offer.codigo || offer.nombre])
    const match = hits.find((item) => item.id === offer.id) || hits[0]
    if (match) {
      flow.pendingProduct = toPendingProduct(match)
      flow.currentState = 'routeA_qty'
      return reply(`¿Qué cantidad de ${flow.pendingProduct.label || 'ese producto'} agrego al carrito?`)
    }
  }
  const folded = fold(raw)
  const byName = (ctx.lastOffers || []).find((item) => fold(item.label) === folded)
  if (byName) {
    flow.pendingProduct = {
      id: String(byName.id),
      label: byName.label,
      codigo: byName.codigo || '',
      price: byName.price,
      stock: Number(byName.cantidad) || 0,
    }
    flow.currentState = 'routeA_qty'
    return reply(`¿Qué cantidad de ${flow.pendingProduct.label || 'ese producto'} agrego al carrito?`)
  }
  const hits = findInventoryMatches(tokens)
  const byCode = hits.find((item) => fold(item.codigo) === folded)
  if (byCode) {
    flow.pendingProduct = toPendingProduct(byCode)
    flow.currentState = 'routeA_qty'
    return reply(`¿Qué cantidad de ${flow.pendingProduct.label || 'ese producto'} agrego al carrito?`)
  }
  return null
}

function askConfirmProduct(ctx: SessionContext): ChatReply {
  const flow = ensureOrderFlow(ctx)
  const item = flow.pendingProduct
  if (!item) {
    flow.currentState = 'routeA_product'
    return routeAAskProduct()
  }
  flow.currentState = 'routeA_confirm'
  return reply(
    [
      '🛒 Agregar al carrito',
      '',
      `¿Agregar ${item.label || item.codigo}?`,
      '',
      '[ Sí ]   [ No ]',
    ].join('\n'),
    { options: YES_NO },
  )
}

function askQtyDefault(ctx: SessionContext): ChatReply {
  const flow = ensureOrderFlow(ctx)
  flow.currentState = 'routeA_qty'
  const item = flow.pendingProduct
  return reply(`¿Cuántas unidades de ${item?.codigo || item?.label || 'ese producto'} quieres agregar? (por defecto 1)`)
}

async function searchByExactCode(ctx: SessionContext, raw: string): Promise<ChatReply> {
  resetScaffold(ctx)
  const flow = ensureOrderFlow(ctx)
  const code = raw.trim()
  await hydrateChatProducts({ tokens: [code], raw: code, ctx, kind: 'fresh' })
  const key = fold(code)
  const match = liveInventory().find((item) => fold(item.codigo) === key)
    || findInventoryMatches([code]).find((item) => fold(item.codigo) === key)
  if (!match) {
    flow.currentState = 'routeA_product'
    flow.pendingProduct = null
    flow.pendingQty = 0
    flow.productConfirmed = false
    return fallbackSearchReply()
  }
  rememberOffers(ctx, [match])
  flow.pendingProduct = toPendingProduct(match)
  flow.pendingQty = 0
  flow.confirmRetries = 0
  flow.productConfirmed = false
  return askConfirmProduct(ctx)
}

function askConfirmAdd(ctx: SessionContext): ChatReply {
  const flow = ensureOrderFlow(ctx)
  const item = flow.pendingProduct
  if (!item) {
    flow.currentState = 'routeA_product'
    return routeAAskProduct()
  }
  flow.currentState = 'routeA_confirm'
  return reply(
    [
      '🛒 Agregar al carrito',
      '',
      `¿Agrego ${flow.pendingQty} de ${item.label || 'ese producto'}?`,
      '',
      '[ Sí ]   [ No ]',
    ].join('\n'),
    { options: YES_NO },
  )
}

function confirmAddReply(ctx: SessionContext): ChatReply {
  const flow = ensureOrderFlow(ctx)
  const item = flow.pendingProduct
  if (!item || flow.pendingQty < 1) {
    flow.currentState = 'routeA_product'
    return routeAAskProduct()
  }
  if (!chatHasAuth()) return loginReply()
  if (!(Number(item.price) > 0)) {
    flow.currentState = 'routeA_more'
    flow.pendingProduct = null
    flow.pendingQty = 0
    flow.productConfirmed = false
    return reply(
      [
        '❌ Este producto no puede ser agregado a carrito, error sobre su valor unitario',
        '',
        '➕ ¿Agregar otro producto?',
        '',
        '[ Sí ]   [ No ]',
      ].join('\n'),
      { options: YES_NO },
    )
  }
  flow.addedDistinct += 1
  flow.currentState = 'routeA_more'
  const suggestBulk = flow.addedDistinct >= 10
    ? 'Ya van 10 o más. Si el resto es largo, usa carga masiva.'
    : ''
  const row = {
    id: item.id,
    codigo: item.codigo,
    cantidad: flow.pendingQty,
    stock: item.stock,
    precio: item.price,
    estado: 'Ok',
  }
  flow.pendingProduct = null
  flow.pendingQty = 0
  flow.confirmRetries = 0
  flow.productConfirmed = false
  const moreOptions = [
    ...YES_NO,
    ...(suggestBulk ? [{ kind: 'prompt' as const, label: 'Carga masiva', prompt: 'pedido grande' }] : []),
  ]
  return reply(
    [
      `✅ Agregado: ${item.label || 'producto'}`,
      suggestBulk,
      '➕ ¿Agregar otro producto?',
      '',
      '[ Sí ]   [ No ]',
    ].filter((line) => line.length > 0).join('\n\n'),
    {
      // Un ítem: POST /api/v1/inventory/carts { id_producto, cantidad, precio_unitario }
      catalogCommand: { kind: 'add-cart', row },
      options: moreOptions,
    },
  )
}

function checkoutMissingReply(raw: string): ChatReply {
  const text = fold(raw)
  if (MISSING_DELIVERY.test(text) && !MISSING_PAY.test(text)) {
    return reply(
      [
        '📦 Datos de entrega',
        '',
        '1. Nombre o razón social',
        '2. Documento / NIT',
        '3. Dirección, ciudad, teléfono, correo',
        '',
        '> Sin eso no se crea el pedido.',
      ].join('\n'),
      { actions: [{ kind: 'open-cart', label: 'Abrir carrito' }], options: [{ kind: 'prompt', label: 'Más detalle', prompt: 'explicame mas' }] },
    )
  }
  if (MISSING_PAY.test(text) && !MISSING_DELIVERY.test(text)) {
    return reply(
      [
        '💳 Medio de pago',
        '',
        '1. Elige uno en el carrito',
        '2. Efectivo, transferencia o crédito',
        '',
        '> Sin pago no se crea el pedido.',
      ].join('\n'),
      { actions: [{ kind: 'open-cart', label: 'Abrir carrito' }] },
    )
  }
  return reply(
    [
      '🛒 Falta confirmar',
      '',
      '1. Datos de entrega',
      '2. Medio de pago',
      '3. Confirmar pedido',
    ].join('\n'),
    { actions: [{ kind: 'open-cart', label: 'Abrir carrito' }] },
  )
}

export async function runOrderFlowTurn(
  ctx: SessionContext,
  tokens: readonly string[],
  raw: string,
): Promise<ChatReply | null> {
  const text = fold(raw)
  const createAsk = isCreateOrderAsk(tokens, raw)
  const codeAsk = pareceCodigo(raw)
  const active = isOrderFlowActive(ctx)
  const flowState = ctx.orderFlow?.currentState || 'idle'
  const inEntry = flowState.startsWith('routeA') || flowState === 'routeB_guide' || flowState === 'excel_confirm'
  const locked = flowState === 'awaitingSize'
    || flowState === 'routeA_qty'
    || flowState === 'routeA_confirm'
    || flowState === 'routeA_more'
    || flowState === 'excel_confirm'

  if (codeAsk && flowState !== 'routeA_confirm' && flowState !== 'routeA_qty' && flowState !== 'excel_confirm') {
    return searchByExactCode(ctx, raw)
  }
  if (createAsk && !inEntry) {
    return startFlow(ctx)
  }
  if (!active) return null

  if (ABORT.test(text)) {
    resetOrderFlow(ctx)
    if (releaseRemainder(raw)) return null
    return reply('Dejamos la creación de pedido. El carrito se mantiene. ¿En qué te ayudo ahora?')
  }

  const flow = ensureOrderFlow(ctx)
  if (!locked && (isPaymentAsk(tokens, raw) || isHoursAsk(tokens, raw) || isLocationAsk(tokens, raw))) {
    return null
  }

  if (flow.currentState === 'awaitingSize') {
    const size = parseSize(raw, tokens)
    if (size == null) {
      return reply('Dime un número aproximado de productos distintos, o elige una de las opciones.')
    }
    return applySize(ctx, size)
  }

  if (flow.currentState === 'routeB_guide') {
    const explained = tryExplain(ctx, text, 'bulk')
    if (explained) return explained
    if (/\bplantilla|ejemplo|descarg\b/.test(text)) {
      return reply(
        [
          '📄 Plantilla',
          '',
          'Columnas: CODIGO | CANTIDAD',
          '',
          'Llénala y súbela aquí.',
        ].join('\n'),
        {
          actions: [
            { kind: 'download-template', label: 'Descargar plantilla' },
            { kind: 'open-bulk-upload', label: 'Abrir Subir nuevo archivo' },
          ],
        },
      )
    }
    if (AFFIRM.has(text) || /\b(ya tengo|excel|archivo|listo)\b/.test(text)) {
      return reply('Arrastra el Excel aquí o súbelo en "Subir nuevo archivo".')
    }
    if (/\b(pequeno|uno a uno)\b/.test(text)) {
      flow.currentState = 'routeA_product'
      return routeAAskProduct()
    }
    return routeBGuide()
  }

  if (flow.currentState === 'excel_confirm') {
    if (NEGATE.has(text.split(' ')[0] || '') || /\bno( lo)?( envies| agregues)?\b/.test(text)) {
      pendingBulk = null
      flow.currentState = 'routeB_guide'
      return reply('No envié nada al carrito. Corrige el archivo y vuelve a soltarlo aquí.')
    }
    if (AFFIRM.has(text.split(' ')[0] || '') || /\bconfirmar|agregar|enviar|dale\b/.test(text)) {
      if (!pendingBulk) {
        flow.currentState = 'routeB_guide'
        return reply('No hay un Excel pendiente. Arrástralo de nuevo sobre el chat.')
      }
      if (!chatHasAuth()) return loginReply()
      flow.currentState = 'checkout_offer'
      return reply(
        [
          '✅ Filas válidas al carrito',
          '',
          '> No crea el pedido.',
          '',
          '📦 ¿Finalizar pedido ahora?',
          '',
          '[ Sí ]   [ No ]',
        ].join('\n'),
        {
          // Excel ya parseado: POST /api/v1/inventory/carts por cada fila válida (no hay POST de archivo)
          catalogCommand: { kind: 'bulk-commit' },
          options: [
            { kind: 'prompt', label: 'Sí', prompt: 'acompaname' },
            { kind: 'prompt', label: 'No', prompt: 'solo' },
          ],
        },
      )
    }
    return reply(
      [
        '📄 Excel leído',
        '',
        '¿Agregar filas válidas al carrito?',
        '',
        '[ Sí ]   [ No ]',
      ].join('\n'),
      { options: YES_NO },
    )
  }

  if (flow.currentState === 'checkout_offer' || flow.currentState === 'checkout_guide') {
    const explained = tryExplain(ctx, text, 'checkout')
    if (explained) return explained
    if (ALONE.test(text) && flow.currentState === 'checkout_offer') {
      flow.currentState = 'checkout_guide'
      return reply(
        [
          '🛒 Listo para confirmar',
          '',
          'Completa entrega y pago, luego Confirmar pedido.',
        ].join('\n'),
        { actions: [{ kind: 'open-cart', label: 'Abrir carrito' }] },
      )
    }
    if (ACCOMPANY.test(text) || flow.currentState === 'checkout_guide') {
      flow.currentState = 'checkout_guide'
      if (/\bya (confirme|pague|termine|cree)\b/.test(text)) {
        return reply(
          [
            '✅ Pedido en verificación',
            '',
            'El sistema muestra número y estado.',
          ].join('\n'),
          { actions: [{ kind: 'open-cart', label: 'Abrir carrito' }] },
        )
      }
      if (CONFIRM_ORDER.test(text)) {
        return checkoutMissingReply(raw)
      }
      if (MISSING_DELIVERY.test(text) || MISSING_PAY.test(text)) {
        return checkoutMissingReply(raw)
      }
      return checkoutGuideReply()
    }
    return checkoutOfferReply()
  }

  if (flow.currentState === 'routeA_more') {
    if (/\b(finalizar|terminar|listo|ya|carrito)\b/.test(text) || NEGATE.has(text) || /\bmejor no\b/.test(text)) {
      flow.currentState = 'checkout_offer'
      return closeLoopReply()
    }
    if (/\b(pedido grande|carga masiva|excel)\b/.test(text)) {
      flow.currentState = 'routeB_guide'
      return routeBGuide()
    }
    if (AFFIRM.has(text) || /\b(otro|mas|siguiente)\b/.test(text)) {
      flow.currentState = 'routeA_product'
      flow.pendingProduct = null
      flow.pendingQty = 0
      flow.productConfirmed = false
      return reply('Dime modelo, marca o pega el código.')
    }
    return askMoreReply()
  }

  if (flow.currentState === 'routeA_confirm') {
    const first = text.split(' ')[0] || ''
    if (NEGATE.has(first) || /\b(cancelar|mejor no)\b/.test(text)) {
      flow.pendingProduct = null
      flow.pendingQty = 0
      flow.productConfirmed = false
      flow.confirmRetries = 0
      flow.currentState = 'routeA_more'
      return reply(['❌ Ok, no lo agregué.', '', '➕ ¿Agregar otro producto?', '', '[ Sí ]   [ No ]'].join('\n'), {
        options: YES_NO,
      })
    }
    if (AFFIRM.has(first) || /\b(agrega|agregar|agregalo|confirmar|yes)\b/.test(text)) {
      flow.confirmRetries = 0
      flow.productConfirmed = true
      if (flow.pendingQty < 1) return askQtyDefault(ctx)
      return confirmAddReply(ctx)
    }
    flow.confirmRetries = (flow.confirmRetries || 0) + 1
    if (flow.confirmRetries >= 2) {
      flow.currentState = 'routeA_more'
      return askMoreReply()
    }
    return flow.productConfirmed || flow.pendingQty > 0 ? askConfirmAdd(ctx) : askConfirmProduct(ctx)
  }

  if (flow.currentState === 'routeA_qty') {
    if (AFFIRM.has(text) && !parseQty(raw, tokens)) {
      const stock = flow.pendingProduct?.stock || 0
      flow.pendingQty = stock > 0 ? Math.min(1, stock) : 1
      return flow.productConfirmed ? confirmAddReply(ctx) : askConfirmAdd(ctx)
    }
    const qty = parseQty(raw, tokens)
    if (!Number.isInteger(qty) || qty < 1) {
      return reply('La cantidad debe ser un número entero mayor a 0. Si no indicas, uso 1.')
    }
    const stock = flow.pendingProduct?.stock || 0
    flow.pendingQty = stock > 0 ? Math.min(qty, stock) : qty
    return flow.productConfirmed ? confirmAddReply(ctx) : askConfirmAdd(ctx)
  }

  if (flow.currentState === 'routeA_product') {
    const picked = pickRouteAProduct(ctx, tokens, raw)
    if (picked) return picked
    return searchRouteA(ctx, tokens, raw)
  }

  return null
}

function omittedReason(entry: { reason?: string; motivo?: string; line?: number; linea?: number; codigo?: string }) {
  return String(entry.reason || entry.motivo || 'fila inválida')
}

function omittedLine(entry: { line?: number; linea?: number }) {
  return Number(entry.line || entry.linea || 0)
}

export async function processChatExcelFile(ctx: SessionContext, file: File): Promise<ChatReply> {
  resetScaffold(ctx)
  const flow = ensureOrderFlow(ctx)
  if (!chatHasAuth()) {
    flow.currentState = 'routeB_guide'
    return loginReply()
  }

  const { parseAndValidateProductExcelFile } = await import('@/features/profile/lib/productExcel')
  const { compareOrderWithStock, fetchStockByCodes } = await import('@/features/profile/api/bulkOrderApi')
  const parsed = await parseAndValidateProductExcelFile(file)
  if (!parsed.valid) {
    flow.currentState = 'routeB_guide'
    pendingBulk = null
    const headerIssue = /encabezad|linea 1 debe/i.test(String(parsed.error || ''))
    const omittedNotes = (Array.isArray(parsed.omitted) ? parsed.omitted : []).map((entry) => {
      const line = omittedLine(entry)
      const reason = omittedReason(entry)
      if (/cantidad|entero|numero/i.test(reason)) {
        return `Fila ${line || '?'}: la cantidad debe ser un número entero mayor a 0.`
      }
      return `Fila ${line || '?'}: ${reason}`
    })
    const text = headerIssue
      ? `El archivo no tiene el formato esperado. Debe tener exactamente estas columnas:\n  CODIGO | CANTIDAD\n¿Quieres descargar la plantilla?`
      : [String(parsed.error || 'No se pudo leer el Excel.'), omittedNotes.slice(0, 8).join('\n')].filter(Boolean).join('\n')
    return reply(text, {
      actions: [
        { kind: 'download-template', label: 'Descargar plantilla' },
        { kind: 'open-bulk-upload', label: 'Abrir Subir nuevo archivo' },
      ],
    })
  }

  const items = parsed.items || []
  const omitted = Array.isArray(parsed.omitted) ? parsed.omitted : []
  const dataRows = Math.max(items.length + omitted.length, Math.max(0, (parsed.lineCount || 1) - 1))
  const errorLines: string[] = omitted.map((entry) => {
    const line = omittedLine(entry)
    const reason = omittedReason(entry)
    if (/cantidad|entero|numero/i.test(reason)) {
      return `Fila ${line || '?'}: la cantidad debe ser un número entero mayor a 0.`
    }
    return `Fila ${line || '?'}: ${reason}`
  })

  const stockByCode = await fetchStockByCodes(items.map((item) => item.codigo))
  const comparison = compareOrderWithStock(items, stockByCode)
  comparison.results.forEach((row, index) => {
    const source = items[index] as { line?: number } | undefined
    const line = Number(source?.line) || index + 2
    if (!row.id) {
      errorLines.push(`Fila ${line}: el código "${row.codigo}" no existe en el catálogo. Se omitirá.`)
    } else if (row.estado === 'agotado') {
      errorLines.push(`Fila ${line}: el código "${row.codigo}" no tiene stock. Se omitirá.`)
    }
  })

  const invalidCount = omitted.length + comparison.results.filter((row) => !row.id).length
  const invalidRatio = dataRows > 0 ? invalidCount / dataRows : 1
  if (invalidRatio > 0.5) {
    pendingBulk = null
    flow.currentState = 'routeB_guide'
    return reply(
      [
        'Más de la mitad de las filas son inválidas. No envié nada al carrito.',
        `Filas leídas: ${dataRows}. Inválidas: ${invalidCount}.`,
        errorLines.slice(0, 8).join('\n'),
        'Corrige el archivo y vuelve a subirlo.',
      ].filter(Boolean).join('\n'),
      { actions: [{ kind: 'download-template', label: 'Descargar plantilla' }] },
    )
  }

  pendingBulk = {
    comparison,
    omitted,
    lineCount: dataRows,
    validCount: comparison.results.filter((row) => row.id).length,
    errorLines,
  }
  flow.currentState = 'excel_confirm'
  return reply(
    [
      `📄 Excel: ${dataRows} filas · ${pendingBulk.validCount} válidas`,
      errorLines.length ? errorLines.slice(0, 4).join('\n') : 'Sin errores de formato.',
      '',
      '¿Agregar filas válidas al carrito?',
      '',
      '[ Sí ]   [ No ]',
    ].join('\n'),
    {
      options: YES_NO,
    },
  )
}
