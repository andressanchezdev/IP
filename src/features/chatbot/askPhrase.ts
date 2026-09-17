const ASK_GENERIC = [
  'Si me pasas el nombre del producto y el vehículo (marca y modelo), te oriento mejor.',
  '¿Qué producto buscas y para qué moto es?',
  'Con el nombre del producto y la marca de la moto te afino la respuesta.',
  'Cuéntame qué producto necesitas y de qué marca es la moto.',
  'Para seguir, ¿me dejas el producto y el vehículo?',
] as const

const ASK_NAMED = [
  'Para {term} me falta la marca y el modelo del vehículo.',
  'Si me dices para qué moto es {term}, afino la búsqueda.',
  '¿De qué marca y modelo necesitas {term}?',
  'Con la marca y el modelo de la moto ubico mejor {term}.',
] as const

const ASK_SUBJECT = [
  '¿De qué marca y modelo es {term}?',
  'Para {term} me sirve la marca y el modelo del vehículo.',
  '¿En qué moto va {term}?',
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
