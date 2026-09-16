export type PipelineConfig = {
  UMBRAL_MINIMO: number
  UMBRAL_SECUNDARIO: number
  UMBRAL_TOPIC: number
  UMBRAL_RESET: number
  DELTA_EMPATE: number
  REPEATED_KEYWORD_K: number
  FALLBACK_MENU_AT: number
  HUMAN_HANDOFF_AT: number
  MAX_SECUNDARIOS: number
  WINDOW_RESPONSES: number
  WINDOW_INTENTS: number
  WINDOW_TOKENS: number
  TOPIC_STACK: number
  MAX_TOKENS: number
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  UMBRAL_MINIMO: 3,
  UMBRAL_SECUNDARIO: 2,
  UMBRAL_TOPIC: 4,
  UMBRAL_RESET: 4,
  DELTA_EMPATE: 0.5,
  REPEATED_KEYWORD_K: 3,
  FALLBACK_MENU_AT: 2,
  HUMAN_HANDOFF_AT: 5,
  MAX_SECUNDARIOS: 2,
  WINDOW_RESPONSES: 5,
  WINDOW_INTENTS: 8,
  WINDOW_TOKENS: 8,
  TOPIC_STACK: 5,
  MAX_TOKENS: 40,
}

export function clampPipelineConfig(raw: Partial<PipelineConfig> | undefined): PipelineConfig {
  const src = { ...DEFAULT_PIPELINE_CONFIG, ...raw }
  const num = (value: number, min: number, fallback: number) => {
    const next = Number(value)
    return Number.isFinite(next) && next >= min ? next : fallback
  }
  return {
    UMBRAL_MINIMO: num(src.UMBRAL_MINIMO, 1, 3),
    UMBRAL_SECUNDARIO: num(src.UMBRAL_SECUNDARIO, 1, 2),
    UMBRAL_TOPIC: num(src.UMBRAL_TOPIC, 1, 4),
    UMBRAL_RESET: num(src.UMBRAL_RESET, 1, 4),
    DELTA_EMPATE: num(src.DELTA_EMPATE, 0, 0.5),
    REPEATED_KEYWORD_K: num(src.REPEATED_KEYWORD_K, 2, 3),
    FALLBACK_MENU_AT: num(src.FALLBACK_MENU_AT, 1, 2),
    HUMAN_HANDOFF_AT: num(src.HUMAN_HANDOFF_AT, 1, 5),
    MAX_SECUNDARIOS: num(src.MAX_SECUNDARIOS, 1, 2),
    WINDOW_RESPONSES: num(src.WINDOW_RESPONSES, 1, 3),
    WINDOW_INTENTS: num(src.WINDOW_INTENTS, 1, 5),
    WINDOW_TOKENS: num(src.WINDOW_TOKENS, 1, 5),
    TOPIC_STACK: num(src.TOPIC_STACK, 1, 3),
    MAX_TOKENS: num(src.MAX_TOKENS, 8, 40),
  }
}
