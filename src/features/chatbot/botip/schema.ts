import { sha1 } from '../sha1'
import type { PipelineConfig } from '../pipelineConfig'
import type { BotReplyConfig, BotSettings } from '../botSettings'
import { clampPipelineConfig } from '../pipelineConfig'
import { SLIDER_SPECS, defaultSliderValues, slidersToLimits, slidersToPipeline, type SliderValues } from './sliders'

export const BOTIP_SCHEMA = 'botip-md/1'
export const ACTIVE_MD_KEY = 'botip-md-active'
export const SLOT_KEY = 'botip-md-slot'
export const UPLOADED_MD_KEY = 'botip-md-uploaded'
export const FACTORY_LOCAL_KEY = 'botip-md-factory-local'

export type BotipSlot = 'original' | 'uploaded'

export const REQUIRED_SECTIONS = [
  'Identidad',
  'Reglas de decisión',
  'Pipeline / fases',
  'Intents',
  'Reglas de scoring',
  'Templates de respuesta',
  'Anti-repetición',
  'Streaks',
  'Errores',
  'Entidades',
  'Listas léxicas',
  'Catálogo de datos',
  'Confirmaciones',
  'Sugerencias',
  'Mensajes de sistema',
  'Configuración de sliders',
] as const

export type BotipOrigin = 'original' | 'modificado' | 'subido'

export type BotDocument = {
  schema: string
  exportedAt: string
  hash: string
  origin: BotipOrigin
  identity: {
    name: string
    role: string
    language: string
    tone: string
    formality: number
    naturalness: number
  }
  sliders: SliderValues
  settings: BotSettings
  decisionRules: string[]
  pipelinePhases: string[]
  scoringRules: string[]
  antiRepeat: string[]
  streaks: string[]
  errors: string[]
  entities: string[]
  lexicon: Record<string, unknown>
  catalog: Record<string, unknown>
  confirmations: string[]
  suggestions: string[]
  systemNotes: string[]
}

export type ParseResult =
  | { ok: true; doc: BotDocument }
  | { ok: false; errors: string[] }

function fenceJson(title: string, value: unknown) {
  return `## ${title}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`
}

function frontMatter(meta: { schema: string; exportedAt: string; hash: string; origin: BotipOrigin }) {
  return `---\nschema: ${meta.schema}\nexportedAt: ${meta.exportedAt}\nhash: ${meta.hash}\norigin: ${meta.origin}\n---\n`
}

export function bodyWithoutHash(source: string) {
  return source.replace(/^hash:.*$/m, 'hash:')
}

export function serializeBotDocument(doc: Omit<BotDocument, 'hash'> & { hash?: string }): string {
  const exportedAt = doc.exportedAt || new Date().toISOString()
  const origin = doc.origin || 'modificado'
  const payload = {
    identity: doc.identity,
    sliders: doc.sliders,
    settings: doc.settings,
    decisionRules: doc.decisionRules,
    pipelinePhases: doc.pipelinePhases,
    scoringRules: doc.scoringRules,
    antiRepeat: doc.antiRepeat,
    streaks: doc.streaks,
    errors: doc.errors,
    entities: doc.entities,
    lexicon: doc.lexicon,
    catalog: doc.catalog,
    confirmations: doc.confirmations,
    suggestions: doc.suggestions,
    systemNotes: doc.systemNotes,
    sliderSpecs: SLIDER_SPECS,
  }
  const draft = `${frontMatter({ schema: BOTIP_SCHEMA, exportedAt, hash: '', origin })}
${fenceJson('Identidad', payload.identity)}
${fenceJson('Reglas de decisión', payload.decisionRules)}
${fenceJson('Pipeline / fases', payload.pipelinePhases)}
${fenceJson('Intents', Object.fromEntries(Object.entries(payload.settings.replies).map(([id, reply]) => [id, { keywords: reply.keywords, paused: reply.paused ?? '' }])))}
${fenceJson('Reglas de scoring', payload.scoringRules)}
${fenceJson('Templates de respuesta', payload.settings.replies)}
${fenceJson('Anti-repetición', payload.antiRepeat)}
${fenceJson('Streaks', payload.streaks)}
${fenceJson('Errores', payload.errors)}
${fenceJson('Entidades', payload.entities)}
${fenceJson('Listas léxicas', payload.lexicon)}
${fenceJson('Catálogo de datos', payload.catalog)}
${fenceJson('Confirmaciones', payload.confirmations)}
${fenceJson('Sugerencias', payload.suggestions)}
${fenceJson('Mensajes de sistema', { welcome: payload.settings.welcome, notes: payload.systemNotes })}
${fenceJson('Configuración de sliders', { specs: payload.sliderSpecs, values: payload.sliders, limits: { minChars: payload.settings.minChars, maxChars: payload.settings.maxChars, blockMinutes: payload.settings.blockMinutes, burstLimit: payload.settings.burstLimit }, pipeline: payload.settings.pipeline })}
`
  const hash = sha1(bodyWithoutHash(draft))
  return draft.replace(/^hash:\s*$/m, `hash: ${hash}`)
}

function sectionJson(source: string, title: string): { value: unknown; error?: string } {
  const marker = `## ${title}`
  const start = source.indexOf(marker)
  if (start < 0) return { value: null, error: `Falta la sección ## ${title}` }
  const rest = source.slice(start)
  const fence = rest.match(/```json\s*([\s\S]*?)```/)
  if (!fence) return { value: null, error: `Formato inválido en ## ${title}: se esperaba un bloque json` }
  try {
    return { value: JSON.parse(fence[1]) }
  } catch {
    return { value: null, error: `JSON inválido en ## ${title}` }
  }
}

function metaLine(source: string, key: string) {
  const match = source.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  return match?.[1]?.trim() ?? ''
}

export function validateBotMarkdown(source: string): string[] {
  const errors: string[] = []
  if (!source.includes(`schema: ${BOTIP_SCHEMA}`) && !source.includes(`schema:${BOTIP_SCHEMA}`)) {
    if (!/^schema:/m.test(source)) errors.push('Falta el metadato schema')
  }
  for (const title of REQUIRED_SECTIONS) {
    const parsed = sectionJson(source, title)
    if (parsed.error) errors.push(parsed.error)
  }
  return errors
}

export function parseBotMarkdown(source: string): ParseResult {
  const errors = validateBotMarkdown(source)
  if (errors.length) return { ok: false, errors }

  const identity = sectionJson(source, 'Identidad').value as BotDocument['identity']
  const slidersRaw = (sectionJson(source, 'Configuración de sliders').value ?? {}) as {
    values?: SliderValues
    limits?: Partial<BotSettings>
    pipeline?: Partial<PipelineConfig>
  }
  const replies = sectionJson(source, 'Templates de respuesta').value as Record<string, BotReplyConfig>
  const intents = sectionJson(source, 'Intents').value as Record<string, { keywords?: string; paused?: string }>
  const system = sectionJson(source, 'Mensajes de sistema').value as { welcome?: string; notes?: string[] }
  const sliders = { ...defaultSliderValues(), ...(slidersRaw.values ?? {}) }
  const mergedReplies: Record<string, BotReplyConfig> = { ...replies }
  for (const [id, intent] of Object.entries(intents ?? {})) {
    mergedReplies[id] = {
      ...mergedReplies[id],
      keywords: intent.keywords ?? mergedReplies[id]?.keywords ?? '',
      paused: intent.paused ?? mergedReplies[id]?.paused,
      text: mergedReplies[id]?.text ?? '',
    }
  }

  const pipeline = clampPipelineConfig({
    ...slidersToPipeline(sliders),
    ...(slidersRaw.pipeline ?? {}),
  })
  const limits = slidersToLimits(sliders)
  const settings: BotSettings = {
    minChars: sliders.minChars ?? slidersRaw.limits?.minChars ?? 3,
    maxChars: sliders.maxChars ?? slidersRaw.limits?.maxChars ?? 1000,
    blockMinutes: sliders.blockMinutes ?? slidersRaw.limits?.blockMinutes ?? 1,
    burstLimit: sliders.burstLimit ?? slidersRaw.limits?.burstLimit ?? limits.burstLimit,
    replyDelayMs: limits.replyDelayMs,
    welcome:
      system.welcome ??
      'Hola, soy BotIP, tu asistente Premium. Puedes indicarme cuál es tu duda en un solo mensaje. Puedo ayudarte a encontrar piezas o productos por marca o modelo, o si necesitas consultar el precio de un repuesto o accesorio, información sobre nosotros o hablar con un asesor.',
    replies: mergedReplies,
    pipeline,
  }

  const originRaw = metaLine(source, 'origin')
  const origin: BotipOrigin = originRaw === 'subido' || originRaw === 'modificado' || originRaw === 'original' ? originRaw : 'modificado'

  return {
    ok: true,
    doc: {
      schema: metaLine(source, 'schema') || BOTIP_SCHEMA,
      exportedAt: metaLine(source, 'exportedAt') || new Date().toISOString(),
      hash: metaLine(source, 'hash'),
      origin,
      identity: {
        name: identity?.name || 'botIP',
        role: identity?.role || 'Asistente de Importadora Premium',
        language: identity?.language || 'es',
        tone: identity?.tone || 'claro y cercano',
        formality: Number(identity?.formality ?? sliders.formality),
        naturalness: Number(identity?.naturalness ?? sliders.naturalness),
      },
      sliders,
      settings,
      decisionRules: (sectionJson(source, 'Reglas de decisión').value as string[]) ?? [],
      pipelinePhases: (sectionJson(source, 'Pipeline / fases').value as string[]) ?? [],
      scoringRules: (sectionJson(source, 'Reglas de scoring').value as string[]) ?? [],
      antiRepeat: (sectionJson(source, 'Anti-repetición').value as string[]) ?? [],
      streaks: (sectionJson(source, 'Streaks').value as string[]) ?? [],
      errors: (sectionJson(source, 'Errores').value as string[]) ?? [],
      entities: (sectionJson(source, 'Entidades').value as string[]) ?? [],
      lexicon: (sectionJson(source, 'Listas léxicas').value as Record<string, unknown>) ?? {},
      catalog: (sectionJson(source, 'Catálogo de datos').value as Record<string, unknown>) ?? {},
      confirmations: (sectionJson(source, 'Confirmaciones').value as string[]) ?? [],
      suggestions: (sectionJson(source, 'Sugerencias').value as string[]) ?? [],
      systemNotes: system.notes ?? [],
    },
  }
}

export function documentFromSettings(
  settings: BotSettings,
  extras: Omit<BotDocument, 'schema' | 'exportedAt' | 'hash' | 'origin' | 'settings' | 'sliders' | 'identity'> & {
    sliders?: SliderValues
    identity?: Partial<BotDocument['identity']>
    origin?: BotipOrigin
  },
): BotDocument {
  const sliders = extras.sliders ?? defaultSliderValues()
  const origin = extras.origin ?? 'modificado'
  const base = {
    schema: BOTIP_SCHEMA,
    exportedAt: new Date().toISOString(),
    origin,
    identity: {
      name: extras.identity?.name ?? 'botIP',
      role: extras.identity?.role ?? 'Asistente de Importadora Premium',
      language: extras.identity?.language ?? 'es',
      tone: extras.identity?.tone ?? 'claro y cercano',
      formality: extras.identity?.formality ?? sliders.formality,
      naturalness: extras.identity?.naturalness ?? sliders.naturalness,
    },
    sliders,
    settings: {
      ...settings,
      pipeline: clampPipelineConfig({ ...slidersToPipeline(sliders), ...settings.pipeline }),
    },
    decisionRules: extras.decisionRules,
    pipelinePhases: extras.pipelinePhases,
    scoringRules: extras.scoringRules,
    antiRepeat: extras.antiRepeat,
    streaks: extras.streaks,
    errors: extras.errors,
    entities: extras.entities,
    lexicon: extras.lexicon,
    catalog: extras.catalog,
    confirmations: extras.confirmations,
    suggestions: extras.suggestions,
    systemNotes: extras.systemNotes,
  }
  const markdown = serializeBotDocument(base)
  const parsed = parseBotMarkdown(markdown)
  if (!parsed.ok) {
    return { ...base, hash: sha1(markdown) }
  }
  return parsed.doc
}
