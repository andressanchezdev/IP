import factoryMarkdown from '../botIP.md?raw'
import {
  parseBotMarkdown,
  serializeBotDocument,
  ACTIVE_MD_KEY,
  SLOT_KEY,
  UPLOADED_MD_KEY,
  FACTORY_LOCAL_KEY,
  type BotDocument,
  type BotipOrigin,
  type BotipSlot,
} from './schema'
import { defaultSliderValues, slidersToLimits, slidersToPipeline, type SliderValues } from './sliders'
import { readStore, writeStore, removeStore } from '../storage'
import type { BotSettings } from '../botSettings'
import { clampPipelineConfig } from '../pipelineConfig'

const LEGACY_JSON_KEY = 'botip-settings'

function parsedOk(source: string | null) {
  if (!source) return false
  return parseBotMarkdown(source).ok
}

function migrateLegacyActive() {
  const slot = readStore('local', SLOT_KEY)
  if (slot === 'original' || slot === 'uploaded') return

  const legacy = readStore('local', ACTIVE_MD_KEY)
  if (!legacy) {
    writeStore('local', SLOT_KEY, 'original')
    return
  }

  const parsed = parseBotMarkdown(legacy)
  if (parsed.ok && parsed.doc.origin === 'subido') {
    writeStore('local', UPLOADED_MD_KEY, legacy)
    writeStore('local', SLOT_KEY, 'uploaded')
  } else if (parsed.ok) {
    writeStore('local', FACTORY_LOCAL_KEY, legacy)
    writeStore('local', SLOT_KEY, 'original')
  } else {
    writeStore('local', SLOT_KEY, 'original')
  }
  removeStore('local', ACTIVE_MD_KEY)
}

export function getActiveSlot(): BotipSlot {
  migrateLegacyActive()
  return readStore('local', SLOT_KEY) === 'uploaded' ? 'uploaded' : 'original'
}

export function factoryMarkdownSource() {
  return factoryMarkdown
}

export function uploadedMarkdownSource() {
  migrateLegacyActive()
  return readStore('local', UPLOADED_MD_KEY)
}

export function hasUploadedMarkdown() {
  return parsedOk(uploadedMarkdownSource())
}

let factoryDocCache: BotDocument | null = null
let activeSourceCache = ''
let activeDocCache: BotDocument | null = null

export function invalidateDocumentCache() {
  activeSourceCache = ''
  activeDocCache = null
}

export function factoryDocument(): BotDocument {
  if (factoryDocCache) return factoryDocCache
  const parsed = parseBotMarkdown(factoryMarkdown)
  if (!parsed.ok) {
    throw new Error(parsed.errors.join('; '))
  }
  factoryDocCache = parsed.doc
  return factoryDocCache
}

export function settingsFromDocument(doc: BotDocument): BotSettings {
  const pipeline = clampPipelineConfig({ ...slidersToPipeline(doc.sliders), ...doc.settings.pipeline })
  const limits = slidersToLimits(doc.sliders)
  return {
    ...doc.settings,
    minChars: limits.minChars,
    maxChars: limits.maxChars,
    blockMinutes: limits.blockMinutes,
    burstLimit: limits.burstLimit,
    replyDelayMs: limits.replyDelayMs,
    pipeline,
  }
}

export function applySlidersToDocument(doc: BotDocument, sliders: SliderValues, origin: BotipOrigin = 'modificado'): BotDocument {
  const limits = slidersToLimits(sliders)
  const next: BotDocument = {
    ...doc,
    sliders,
    origin,
    exportedAt: new Date().toISOString(),
    identity: {
      ...doc.identity,
      formality: sliders.formality,
      naturalness: sliders.naturalness,
    },
    settings: {
      ...doc.settings,
      ...limits,
      pipeline: slidersToPipeline(sliders),
    },
  }
  const markdown = serializeBotDocument(next)
  const parsed = parseBotMarkdown(markdown)
  return parsed.ok ? { ...parsed.doc, origin } : { ...next, hash: '' }
}

export function getActiveMarkdown() {
  const slot = getActiveSlot()
  if (slot === 'uploaded') {
    const uploaded = readStore('local', UPLOADED_MD_KEY)
    if (uploaded) return uploaded
  }
  const overlay = readStore('local', FACTORY_LOCAL_KEY)
  if (overlay) return overlay
  return factoryMarkdown
}

export function getActiveDocument(): BotDocument {
  const source = getActiveMarkdown()
  if (activeDocCache && activeSourceCache === source) return activeDocCache
  const parsed = parseBotMarkdown(source)
  activeDocCache = parsed.ok ? parsed.doc : factoryDocument()
  activeSourceCache = source
  return activeDocCache
}

export function saveActiveDocument(doc: BotDocument) {
  const slot = getActiveSlot()
  const origin: BotipOrigin = slot === 'uploaded' ? 'subido' : doc.origin === 'original' ? 'modificado' : doc.origin
  const markdown = serializeBotDocument({ ...doc, origin, exportedAt: new Date().toISOString() })
  if (slot === 'uploaded') {
    writeStore('local', UPLOADED_MD_KEY, markdown)
  } else {
    writeStore('local', FACTORY_LOCAL_KEY, markdown)
  }
  invalidateDocumentCache()
}

export function saveActiveMarkdown(source: string, _origin: BotipOrigin) {
  const parsed = parseBotMarkdown(source)
  if (!parsed.ok) return parsed
  const withOrigin = serializeBotDocument({ ...parsed.doc, origin: 'subido', exportedAt: new Date().toISOString() })
  const stored = parseBotMarkdown(withOrigin)
  if (!stored.ok) return stored
  writeStore('local', UPLOADED_MD_KEY, withOrigin)
  writeStore('local', SLOT_KEY, 'uploaded')
  removeStore('local', LEGACY_JSON_KEY)
  invalidateDocumentCache()
  return stored
}

export function resetActiveMarkdown() {
  writeStore('local', SLOT_KEY, 'original')
  removeStore('local', FACTORY_LOCAL_KEY)
  removeStore('local', LEGACY_JSON_KEY)
  removeStore('local', ACTIVE_MD_KEY)
  invalidateDocumentCache()
}

export function clearUploadedMarkdown() {
  removeStore('local', UPLOADED_MD_KEY)
  invalidateDocumentCache()
}

export function downloadFactoryFileName() {
  return 'botIP.md'
}

/** Bytes and name of “Original de fábrica”: siempre el `botIP.md` empaquetado, no el overlay de sliders. */
export function factoryDownload() {
  return { filename: downloadFactoryFileName(), source: factoryMarkdownSource() }
}

export function downloadUploadedFileName() {
  return 'botIP2.md'
}

export function downloadFileName() {
  return getActiveSlot() === 'uploaded' ? downloadUploadedFileName() : downloadFactoryFileName()
}

export { defaultSliderValues }
export type { BotipSlot }
