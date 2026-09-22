import { getActiveDocument } from './store'
import { getCachedChatProducts } from '../productSource'
import { readGeneralFilterMemory } from '@/features/catalog/api/generalApi'
import type { LandingTeamGroup, LandingTeamMember, ProductRecord } from '../types'

export type LiveCatalogItem = {
  id: string
  label: string
  description: string
}

export function liveStringList(value: unknown, fallback: readonly string[], lowercase = true): readonly string[] {
  if (!Array.isArray(value) || !value.length) return fallback
  const next = value
    .map((item) => {
      const text = String(item).trim()
      return lowercase ? text.toLowerCase() : text
    })
    .filter(Boolean)
  return next.length ? next : fallback
}

export function liveLowerList(value: unknown, fallback: readonly string[]): readonly string[] {
  return liveStringList(value, fallback, true)
}

export function liveLexiconList(key: string, fallback: readonly string[], lowercase = true): readonly string[] {
  try {
    return liveStringList(getActiveDocument().lexicon?.[key], fallback, lowercase)
  } catch {
    return fallback
  }
}

export function liveLexiconMap(key: string, fallback: Record<string, string>): Record<string, string> {
  try {
    const raw = getActiveDocument().lexicon?.[key]
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
    const next = Object.entries(raw as Record<string, unknown>)
      .map(([from, to]) => [from.trim().toLowerCase(), String(to).trim().toLowerCase()] as const)
      .filter(([from, to]) => from && to)
    return next.length ? Object.fromEntries(next) : fallback
  } catch {
    return fallback
  }
}

const DEFAULT_NEVER_BRAND_TOKENS = [
  'llanta',
  'llantas',
  'llantica',
  'llanticas',
  'yanta',
  'yantas',
  'neumatico',
  'neumaticos',
  'caucho',
  'aceite',
  'amortiguador',
  'pastilla',
  'pastillas',
  'disco',
  'discos',
  'banda',
  'bandas',
  'correa',
  'carburador',
  'carburadores',
  'chiclero',
  'freno',
  'rin',
  'rines',
  'filtro',
  'filtros',
  'cadena',
  'bateria',
  'bujia',
  'casco',
] as const

const DEFAULT_MODEL_TO_BRAND: Record<string, string> = {
  boxer: 'bajaj',
  pulsar: 'bajaj',
  platina: 'bajaj',
  discover: 'bajaj',
  avenger: 'bajaj',
  ybr: 'yamaha',
  fz: 'yamaha',
  nmax: 'yamaha',
  crypton: 'yamaha',
  xtz: 'yamaha',
  cg125: 'honda',
  cb190r: 'honda',
  xr150: 'honda',
  xre300: 'honda',
  invicta: 'honda',
  ak125: 'akt',
  nkd: 'akt',
  dynamic: 'akt',
  crux: 'akt',
  gn125: 'suzuki',
  gixxer: 'suzuki',
  ax4: 'suzuki',
}

/** Tokens that name a part/category and must not be treated as vehicle brand. */
export function liveNeverBrandTokens(): ReadonlySet<string> {
  return liveLexiconSet('neverBrandTokens', new Set(DEFAULT_NEVER_BRAND_TOKENS))
}

/** Known model stem → brand (additive to inventory inference). */
export function liveModelToBrandMap(): Record<string, string> {
  return liveLexiconMap('modelToBrand', DEFAULT_MODEL_TO_BRAND)
}

export function liveLexiconSet(key: string, fallback: ReadonlySet<string>, lowercase = true): ReadonlySet<string> {
  return new Set(liveLexiconList(key, [...fallback], lowercase))
}

export function liveLexiconRecord(key: string, fallback: Record<string, readonly string[]>): Record<string, readonly string[]> {
  try {
    const raw = getActiveDocument().lexicon?.[key]
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
    const next: Record<string, string[]> = {}
    for (const [group, list] of Object.entries(raw as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue
      const values = list.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
      if (values.length) next[group] = values
    }
    return Object.keys(next).length ? next : fallback
  } catch {
    return fallback
  }
}

function catalog() {
  try {
    return getActiveDocument().catalog ?? {}
  } catch {
    return {}
  }
}

export function liveInventory(): ProductRecord[] {
  return getCachedChatProducts()
}

export function liveInventoryFromMarkdown(): boolean {
  return false
}

export function liveInventoryIsDemoFallback(): boolean {
  return getCachedChatProducts().length === 0
}

function uniqueLabels(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const label = String(value || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(label)
  }
  return out
}

function filterOptionLabels(list: Array<{ id?: string, label?: string }> | undefined) {
  if (!Array.isArray(list) || !list.length) return []
  return uniqueLabels(list.map((item) => String(item?.label || '')))
}

export function liveCatalogProducts(): LiveCatalogItem[] {
  return getCachedChatProducts().map((item) => ({
    id: item.id,
    label: item.nombre,
    description: item.descripcion,
  })).filter((item) => item.id && item.label)
}

export function liveCatalogLines(): LiveCatalogItem[] {
  const memory = readGeneralFilterMemory()
  const fromFilter = filterOptionLabels(memory?.categorias)
  if (fromFilter.length) {
    return fromFilter.map((label) => ({ id: label, label, description: '' }))
  }
  const fromProducts = uniqueLabels(
    getCachedChatProducts().map((item) => String(item.category || '').trim()),
  )
  return fromProducts.map((label) => ({ id: label, label, description: '' }))
}

export function liveCatalogLabels() {
  return liveCatalogLines().map((item) => item.label).filter(Boolean).join(', ')
}

export function liveBrandNames(): string[] {
  const memory = readGeneralFilterMemory()
  const fromFilter = filterOptionLabels(memory?.marcas)
  if (fromFilter.length) return fromFilter
  return uniqueLabels(getCachedChatProducts().map((item) => String(item.marca || '').trim()))
}

export function liveModelNames(): string[] {
  const memory = readGeneralFilterMemory()
  const fromFilter = filterOptionLabels(memory?.modelos)
  if (fromFilter.length) return fromFilter
  return uniqueLabels(getCachedChatProducts().map((item) => String(item.modelo || '').trim()))
}

function toMember(row: Record<string, unknown>): LandingTeamMember {
  const group = row.group === 'administrativo' ? 'administrativo' : 'asesor'
  const status = row.status === 'borrador' || row.status === 'archivado' ? row.status : 'publicado'
  return {
    id: String(row.id ?? ''),
    fullName: String(row.fullName ?? row.name ?? ''),
    role: String(row.role ?? ''),
    phoneDisplay: String(row.phoneDisplay ?? ''),
    whatsappDigits: String(row.whatsappDigits ?? ''),
    imageUrl: '',
    group,
    status,
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: '',
    updatedAt: '',
  }
}

export function liveTeam(): LandingTeamMember[] {
  const raw = catalog().team
  if (!Array.isArray(raw) || !raw.length) return []
  const rows = raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(toMember)
    .filter((item) => item.fullName)
  return rows
}

export function livePublishedTeam(group: LandingTeamGroup) {
  return liveTeam().filter((item) => item.group === group && item.status === 'publicado')
}

export type LiveShipping = {
  nationwide: boolean
  freeMetroFrom: string
  sameDay: boolean
  doorSafe: boolean
  cityScope: string
}

export const DEFAULT_SHIPPING: LiveShipping = {
  nationwide: true,
  freeMetroFrom: '700.000',
  sameDay: true,
  doorSafe: true,
  cityScope: 'área metropolitana',
}

export function resolveShipping(raw: unknown): LiveShipping {
  const base = { ...DEFAULT_SHIPPING }
  if (!raw || typeof raw !== 'object') return base
  const src = raw as Partial<LiveShipping>
  return {
    nationwide: typeof src.nationwide === 'boolean' ? src.nationwide : base.nationwide,
    freeMetroFrom: String(src.freeMetroFrom ?? base.freeMetroFrom).trim() || base.freeMetroFrom,
    sameDay: typeof src.sameDay === 'boolean' ? src.sameDay : base.sameDay,
    doorSafe: typeof src.doorSafe === 'boolean' ? src.doorSafe : base.doorSafe,
    cityScope: String(src.cityScope ?? base.cityScope).trim() || base.cityScope,
  }
}

export function liveShipping(): LiveShipping {
  try {
    return { ...resolveShipping(catalog().shipping), freeMetroFrom: DEFAULT_SHIPPING.freeMetroFrom }
  } catch {
    return { ...DEFAULT_SHIPPING }
  }
}
