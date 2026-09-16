const ASK_GENERIC = [
  'Si me pasas la pieza y el vehículo (marca y modelo), te oriento mejor.',
  '¿Qué repuesto buscas y para qué moto o vehículo es?',
  'Con el nombre de la pieza y la referencia del vehículo te afino la respuesta.',
  'Cuéntame qué componente necesitas y de qué marca o modelo.',
  'Para seguir, ¿me dejas la pieza y el vehículo?',
] as const

const ASK_NAMED = [
  'Para {term} me falta la marca y el modelo del vehículo.',
  'Si me dices para qué moto es {term}, afino la ficha.',
  '¿De qué marca o modelo necesitas {term}?',
  'Con la referencia del vehículo ubico mejor {term}.',
] as const

const ASK_SUBJECT = [
  '¿De qué marca o modelo es {term}?',
  'Para {term} me sirve la marca y el modelo del vehículo.',
  '¿En qué moto o vehículo va {term}?',
] as const

let tick = 0

function pick(pool: readonly string[], named = '') {
  tick += 1
  const phrase = pool[tick % pool.length]
  return named ? phrase.replace(/\{term\}/g, named) : phrase
}

export function nextAskPhrase(named = '') {
  return named ? pick(ASK_NAMED, named) : pick(ASK_GENERIC)
}

export function nextAskSubject(subject: string) {
  return pick(ASK_SUBJECT, subject)
}
