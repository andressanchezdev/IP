import { liveBrandNames, liveCatalogProducts, liveModelNames } from './botip/liveData'
import { findTerm, liveAccessoryTerms, liveCatalogParts, liveOtherParts, liveWeakLexemes, listPartFamilies, resolvePartFamily } from './motoParts'
import { keywordsOf } from './botSettings'
import { matchLandingTeam } from './teamLookup'
import type { EntityMap } from './sessionContext'
import { parseUserFrame } from './userFrame'

const PRICE_RE = /(?:\$|cop|usd)?\s*(\d+[.,]\d{2}|\d{3,})(?:\s*(?:cop|usd|mil))?/i

function foldToken(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function liveBrandTokens() {
  return new Set(
    liveBrandNames()
      .flatMap((name) => foldToken(name).split(/[^a-z0-9]+/))
      .filter((token) => token.length >= 3),
  )
}

function liveModelTokens() {
  return new Set(
    liveModelNames()
      .flatMap((name) => foldToken(name).split(/[^a-z0-9]+/))
      .filter((token) => token.length >= 2),
  )
}

export function isModelYear(token: string) {
  const year = Number(token)
  return Number.isInteger(year) && year >= 1990 && year <= 2035
}

export function extractMarcaModelo(tokens: readonly string[], raw: string) {
  const brands = liveBrandTokens()
  const models = liveModelTokens()
  const marca = tokens.find((token) => brands.has(token))
  const modeloToken = tokens.find((token) => {
    if (isModelYear(token)) return false
    if (models.has(token)) return true
    return /^[a-z]+\d+[a-z0-9]*$/i.test(token) && token.length >= 3
  })
  const modeloFromRaw = raw.match(/\b([A-Za-z]{1,8}\s?\d{2,4}[A-Za-z]?)\b/)?.[1]
  const modeloRaw = modeloFromRaw ? modeloFromRaw.toLowerCase().replace(/\s+/g, '') : ''
  const modelo = modeloToken || (modeloRaw && !isModelYear(modeloRaw) ? modeloRaw : undefined)
  return {
    marca: marca || undefined,
    modelo,
  }
}

function productWords(label: string, id: string) {
  return `${label} ${id}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2)
}

function tokenMatchesWord(token: string, word: string) {
  if (liveWeakLexemes().has(token) || token.length < 3) return false
  if (token === word) return true
  if (token === `${word}s` || word === `${token}s`) return true
  if (
    token.length >= 5 &&
    word.length >= 5 &&
    Math.abs(token.length - word.length) <= 2 &&
    (token.startsWith(word) || word.startsWith(token))
  ) {
    return true
  }
  return false
}

function matchingCatalog(tokens: readonly string[]) {
  const useful = tokens.filter((token) => token.length >= 3)
  const byId = liveCatalogProducts().filter((product) =>
    useful.some((token) => token === product.id || token.replace(/-/g, '') === product.id.replace(/-/g, '')),
  )
  const byWord = liveCatalogProducts().filter((product) => {
    const pool = [product.id, ...productWords(product.label, product.id)]
    return useful.some((token) => pool.some((word) => tokenMatchesWord(token, word)))
  })
  const seen = new Set<string>()
  return [...byId, ...byWord].filter((product) => {
    if (seen.has(product.id)) return false
    seen.add(product.id)
    return true
  })
}

export function extractEntities(tokens: readonly string[], raw: string, previous: EntityMap): { next: EntityMap; conflict: EntityMap['conflict'] } {
  const frame = parseUserFrame(raw, tokens)
  const team = matchLandingTeam(tokens, {
    allowNameLookup: !frame.introducingSelf || frame.hasTeamCue,
    excludeNames: frame.introducingSelf ? [frame.userName] : [],
  })
  const miembro =
    team?.type === 'member' ? team.members[0]?.fullName : team?.type === 'suggest' ? team.member.fullName : previous.miembro
  const grupo = team?.type === 'group' ? team.group : previous.grupo
  const lookup = frame.lookupTokens
  const familyNow = resolvePartFamily(lookup)
  const previousFamily = resolvePartFamily(
    [previous.pieza, previous.producto, previous.namedPart, previous.accesorio].filter(Boolean).join(' ').split(/\s+/),
  )
  const piezaNow = familyNow && !familyNow.ambiguous ? familyNow.label : findTerm(lookup, liveCatalogParts())
  const namedNow =
    familyNow?.id === 'banda_freno'
      ? familyNow.label
      : findTerm(lookup, liveOtherParts()) || findTerm(lookup, keywordsOf('namedPart'))
  const accesorioNow = findTerm(lookup, liveAccessoryTerms())
  const hits = matchingCatalog(lookup).filter((item) => {
    if (!familyNow) return true
    if (familyNow.ambiguous) return false
    const itemFamily = resolvePartFamily(
      item.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    )
    return itemFamily?.id === familyNow.id
  })
  const productoNow = hits[0]?.label || ''
  const price = raw.match(PRICE_RE)?.[1]
  const queja = tokens.some((token) =>
    ['queja', 'quejas', 'reclamo', 'reclamos', 'reclamar', 'quejar', 'pqr', 'garantia'].includes(token),
  )
  const compra = tokens.some((token) => keywordsOf('quote').includes(token)) || previous.compra

  const switched = Boolean(familyNow?.id && previousFamily?.id && familyNow.id !== previousFamily.id)

  const next: EntityMap = switched
    ? {
        miembro: previous.miembro,
        grupo: previous.grupo,
        userName: frame.userName || previous.userName,
        pieza: piezaNow || undefined,
        namedPart: namedNow || undefined,
        accesorio: accesorioNow || undefined,
        producto: productoNow || undefined,
        queja,
        compra,
      }
    : {
        ...previous,
        miembro,
        grupo,
        userName: frame.userName || previous.userName,
        pieza: piezaNow || previous.pieza,
        namedPart: namedNow || previous.namedPart,
        accesorio: accesorioNow || previous.accesorio,
        producto: productoNow || previous.producto,
        queja: queja || previous.queja,
        compra,
      }
  if (price) next.precioMencionado = price
  const { marca, modelo } = extractMarcaModelo(lookup, raw)
  if (marca) next.marca = marca
  else if (!switched && previous.marca) next.marca = previous.marca
  if (modelo) next.modelo = modelo
  else if (!switched && previous.modelo) next.modelo = previous.modelo

  const mentioned = listPartFamilies(lookup)
  if (mentioned.length > 1) {
    const conflict = { field: 'producto', previous: mentioned[0].label, next: mentioned[1].label }
    next.conflict = conflict
    return { next, conflict }
  }

  delete next.conflict
  return { next, conflict: undefined }
}

export function preferredTerms(entities: EntityMap) {
  return [entities.pieza, entities.namedPart, entities.accesorio, entities.producto]
    .filter((item): item is string => Boolean(item))
    .map((item) => item.toLowerCase().split(/[^a-z0-9]+/)[0] || item)
}
