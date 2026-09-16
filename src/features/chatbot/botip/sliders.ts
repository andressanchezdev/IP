import { clampPipelineConfig, DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from '../pipelineConfig'

export type SliderId =
  | 'naturalness'
  | 'formality'
  | 'understanding'
  | 'contextMemory'
  | 'brevity'
  | 'humanHelp'
  | 'repeatSensitivity'
  | 'minChars'
  | 'maxChars'
  | 'blockMinutes'
  | 'burstLimit'
  | 'replyDelay'

export type SliderSpec = {
  id: SliderId
  label: string
  help: string
  min: number
  max: number
  step: number
  factory: number
  format?: (value: number) => string
}

export type SliderValues = Record<SliderId, number>

export const SLIDER_GROUPS: Array<{ title: string; ids: SliderId[] }> = [
  {
    title: 'Cómo responde',
    ids: ['naturalness', 'formality', 'understanding', 'contextMemory', 'brevity', 'humanHelp', 'repeatSensitivity'],
  },
  {
    title: 'Límites del chat',
    ids: ['minChars', 'maxChars', 'blockMinutes', 'burstLimit', 'replyDelay'],
  },
]

export const SLIDER_SPECS: SliderSpec[] = [
  {
    id: 'naturalness',
    label: 'Naturalidad',
    help: 'Varía más las frases para que no suene siempre igual.',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'formality',
    label: 'Formalidad',
    help: 'Tono más cercano (1) o más corporativo (5).',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'understanding',
    label: 'Entendimiento',
    help: 'Más flexible con typos (1) o más estricto para no adivinar (5).',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'contextMemory',
    label: 'Memoria de contexto',
    help: 'Qué tanto se queda en la pieza de la que estaban hablando.',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'brevity',
    label: 'Respuestas cortas',
    help: 'Más cortas y al grano (5) o más completas (1).',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'humanHelp',
    label: 'Ayuda de un asesor',
    help: 'Qué tan pronto ofrece pasar con una persona si no entiende.',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'repeatSensitivity',
    label: 'Mensajes repetidos',
    help: 'Cuándo corta si el visitante insiste con lo mismo.',
    min: 1,
    max: 5,
    step: 1,
    factory: 3,
  },
  {
    id: 'minChars',
    label: 'Mínimo de caracteres',
    help: 'Cuántas letras debe tener el mensaje para enviarlo.',
    min: 1,
    max: 10,
    step: 1,
    factory: 3,
    format: (value) => `${value} caracteres`,
  },
  {
    id: 'maxChars',
    label: 'Tope de caracteres',
    help: 'Largo máximo que acepta el chat en un mensaje.',
    min: 200,
    max: 2000,
    step: 100,
    factory: 1000,
    format: (value) => `${value} caracteres`,
  },
  {
    id: 'blockMinutes',
    label: 'Tiempo de bloqueo',
    help: 'Minutos que espera el chat si hay abuso o ráfaga.',
    min: 1,
    max: 15,
    step: 1,
    factory: 1,
    format: (value) => `${value} min`,
  },
  {
    id: 'burstLimit',
    label: 'Límite de mensajes seguidos',
    help: 'Cuántos mensajes puede enviar el visitante en poco tiempo.',
    min: 3,
    max: 20,
    step: 1,
    factory: 8,
    format: (value) => `${value} mensajes`,
  },
  {
    id: 'replyDelay',
    label: 'Tiempo de respuesta',
    help: 'Pausa antes de mostrar la respuesta del bot.',
    min: 0,
    max: 6,
    step: 1,
    factory: 3,
    format: (value) => (value === 0 ? 'inmediato' : `${value} s`),
  },
]

export function defaultSliderValues(): SliderValues {
  return {
    naturalness: 3,
    formality: 3,
    understanding: 3,
    contextMemory: 3,
    brevity: 3,
    humanHelp: 3,
    repeatSensitivity: 3,
    minChars: 3,
    maxChars: 1000,
    blockMinutes: 1,
    burstLimit: 8,
    replyDelay: 3,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function slidersToPipeline(sliders: SliderValues): PipelineConfig {
  const d = (id: SliderId) => sliders[id] - 3
  return clampPipelineConfig({
    ...DEFAULT_PIPELINE_CONFIG,
    UMBRAL_MINIMO: clamp(3 + d('understanding'), 1, 7),
    UMBRAL_SECUNDARIO: clamp(2 + Math.sign(d('understanding')), 1, 7),
    DELTA_EMPATE: clamp(Number((0.5 - d('understanding') * 0.1).toFixed(1)), 0, 1),
    UMBRAL_TOPIC: clamp(4 + d('contextMemory'), 1, 7),
    UMBRAL_RESET: clamp(4 + d('contextMemory'), 1, 7),
    TOPIC_STACK: clamp(5 + d('contextMemory'), 1, 8),
    WINDOW_INTENTS: clamp(8 + d('contextMemory') * 2, 1, 16),
    WINDOW_TOKENS: clamp(8 + d('contextMemory') * 2, 1, 16),
    MAX_SECUNDARIOS: clamp(2 - Math.max(0, d('brevity')), 0, 3),
    MAX_TOKENS: clamp(40 - d('brevity') * 8, 8, 48),
    FALLBACK_MENU_AT: clamp(2 - d('humanHelp'), 1, 5),
    HUMAN_HANDOFF_AT: clamp(5 - d('humanHelp'), 1, 10),
    WINDOW_RESPONSES: clamp(5 + d('naturalness'), 1, 8),
    REPEATED_KEYWORD_K: clamp(3 - d('repeatSensitivity'), 2, 6),
  })
}

export function slidersEqual(left: SliderValues, right: SliderValues) {
  return SLIDER_SPECS.every((spec) => left[spec.id] === right[spec.id])
}

export function slidersToLimits(sliders: SliderValues) {
  return {
    minChars: clamp(sliders.minChars, 1, 10),
    maxChars: clamp(sliders.maxChars, 200, 2000),
    blockMinutes: clamp(sliders.blockMinutes, 1, 15),
    burstLimit: clamp(sliders.burstLimit, 3, 20),
    replyDelayMs: clamp(sliders.replyDelay, 0, 6) * 1000,
  }
}

export function variantBias(sliders: SliderValues) {
  return {
    preferFirst: sliders.formality >= 4,
    rotate: sliders.naturalness >= 3,
  }
}

export function sliderDisplay(spec: SliderSpec, value: number) {
  return spec.format ? spec.format(value) : String(value)
}
