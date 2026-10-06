/**
 * confirmFollowLine — ¿el mensaje sigue la línea del hilo, se desvía un poco o la rompe?
 *
 *  sigue   → misma pieza/tema (precio, "esa", más detalle de la misma pieza).
 *  desvio  → cambia un dato sin cambiar de tema (otro vehículo, un aparte de empresa/envío,
 *            charla social). El hilo se conserva.
 *  quiebre → habla de otra pieza/familia o pide cambiar de tema. El hilo se reinicia.
 *
 * El bot actúa sobre el veredicto en silencio: no anuncia ni pide confirmar el cambio.
 */

import { peekGeneralFilterMemory } from '@/features/catalog/api/generalApi'
import {
  classifyTurn,
  focusFamily,
  focusLabel,
  hasVehicleHint,
  isCreateOrderAsk,
  isOrderProcessAsk,
  isThreadReleaseAsk,
  mentionedFamily,
  type TurnKind,
} from './conversationThread'
import { extractMarcaModelo } from './entities'
import { findTerm, liveAccessoryTerms, liveCatalogParts, liveOtherParts, partStem } from './motoParts'
import { isStopToken } from './prepare'
import type { SessionContext } from './sessionContext'

export type FollowLine = 'sigue' | 'desvio' | 'quiebre'

export type FollowLineReason =
  | 'sin-hilo'
  | 'misma-linea'
  | 'dato-nuevo'
  | 'aparte'
  | 'sin-relacion'
  | 'otra-familia'
  | 'otra-pieza'
  | 'cambio-explicito'

export type FollowLineVerdict = {
  line: FollowLine
  reason: FollowLineReason
  /** Tipo de turno original de classifyTurn. */
  kind: TurnKind
  /** Tipo de turno que debe usar el resto del pipeline. */
  effectiveKind: TurnKind
  /** El mensaje hereda la pieza del hilo (se mezcla al buscar). */
  carryFocus: boolean
}

function fold(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function hasThread(ctx: SessionContext) {
  return Boolean(ctx.conversationFocus || ctx.lastTopIntent)
}

function threadText(ctx: SessionContext) {
  return fold(
    [
      focusLabel(ctx),
      ctx.conversationFocus?.family,
      ctx.entities.pieza,
      ctx.entities.producto,
      ctx.entities.accesorio,
      ctx.entities.namedPart,
    ]
      .filter(Boolean)
      .join(' '),
  )
}

/** Categoría oficial de /general/filter nombrada en el mensaje (por palabra completa). */
function mentionedCatalogCategory(tokens: readonly string[], thread: string) {
  const categories = peekGeneralFilterMemory()?.categorias
  if (!Array.isArray(categories) || !categories.length) return ''
  // Palabras que ya forman parte de la pieza del hilo ("freno") no cuentan como otra categoría.
  const words = tokens
    .map(fold)
    .filter((token) => token.length >= 4 && !isStopToken(token) && !thread.includes(token.replace(/s$/, '')))
  if (!words.length) return ''
  for (const item of categories) {
    const label = String(item?.label || item?.categoria || item?.nombre || '').trim()
    const parts = fold(label).split(/[^a-z0-9]+/).filter((part) => part.length >= 4)
    const hit = parts.some((part) => words.some((word) => (
      word === part || `${word}s` === part || `${part}s` === word
    )))
    if (hit) return label
  }
  return ''
}

/** Pieza o categoría nombrada en el mensaje que NO es la del hilo actual ('' si no hay). */
function namedPartOutsideThread(tokens: readonly string[], ctx: SessionContext) {
  const thread = threadText(ctx)
  if (!thread) return ''
  const significant = tokens.filter((token) => token.length > 2)
  const named =
    findTerm(significant, [...liveCatalogParts(), ...liveOtherParts(), ...liveAccessoryTerms()])
    || mentionedCatalogCategory(significant, thread)
  if (!named) return ''
  const stem = partStem(named)
  return thread.includes(stem) ? '' : named
}

function vehicleChanged(tokens: readonly string[], raw: string, ctx: SessionContext) {
  const vehicle = extractMarcaModelo(tokens, raw)
  const marca = fold(vehicle.marca || '')
  const modelo = fold(vehicle.modelo || '')
  if (!marca && !modelo) return false
  const knownMarca = fold(ctx.entities.marca || '')
  const knownModelo = fold(ctx.entities.modelo || '')
  return (modelo && modelo !== knownModelo) || (marca && marca !== knownMarca)
}

function verdict(
  line: FollowLine,
  reason: FollowLineReason,
  kind: TurnKind,
  effectiveKind: TurnKind,
  carryFocus: boolean,
): FollowLineVerdict {
  return { line, reason, kind, effectiveKind, carryFocus }
}

export function confirmFollowLine(
  tokens: readonly string[],
  raw: string,
  ctx: SessionContext,
): FollowLineVerdict {
  const kind = classifyTurn(tokens, raw, ctx)
  if (!hasThread(ctx)) return verdict('sigue', 'sin-hilo', kind, kind, false)

  if (kind === 'switch') {
    const explicit = isThreadReleaseAsk(raw) && !mentionedFamily(tokens)
    return verdict('quiebre', explicit ? 'cambio-explicito' : 'otra-familia', kind, 'switch', false)
  }

  if (kind === 'social' || kind === 'aside') {
    return verdict('desvio', 'aparte', kind, kind, false)
  }

  // continue | fresh: ¿nombra otra pieza distinta a la del hilo? Rompe aunque sea corto ("espejos").
  if (namedPartOutsideThread(tokens, ctx)) {
    return verdict('quiebre', 'otra-pieza', kind, 'switch', false)
  }

  if (isCreateOrderAsk(tokens, raw) || isOrderProcessAsk(tokens, raw)) {
    return verdict('desvio', 'aparte', kind, kind, false)
  }

  // Otro vehículo para la misma pieza: desvío leve, la pieza del hilo viaja a la búsqueda.
  if (ctx.conversationFocus && hasVehicleHint(tokens, raw) && vehicleChanged(tokens, raw, ctx)) {
    return verdict('desvio', 'dato-nuevo', kind, 'continue', true)
  }

  if (kind === 'continue') {
    return verdict('sigue', 'misma-linea', kind, 'continue', true)
  }

  const family = mentionedFamily(tokens)
  const current = focusFamily(ctx)
  if (family && current && family === current) {
    return verdict('sigue', 'misma-linea', kind, 'continue', false)
  }

  if (ctx.conversationFocus && hasVehicleHint(tokens, raw)) {
    return verdict('desvio', 'dato-nuevo', kind, 'continue', true)
  }

  return verdict('desvio', 'sin-relacion', kind, kind, false)
}

/** Atajo para el pipeline: tipo de turno efectivo según confirmFollowLine. */
export function effectiveTurnKind(tokens: readonly string[], raw: string, ctx: SessionContext): TurnKind {
  return confirmFollowLine(tokens, raw, ctx).effectiveKind
}
