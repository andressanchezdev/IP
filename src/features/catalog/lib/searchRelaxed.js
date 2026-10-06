import { getGeneralFilter, searchInventoryProducts } from '@/features/catalog/api/generalApi'
import { buildSearchAttempts } from '@/features/catalog/lib/catalogMatch'

/**
 * GET /api/v1/inventory/products/search con intentos progresivos.
 * Antes de buscar asegura el vocabulario del catálogo (categorías/marcas/modelos) para poder
 * corregir errores de escritura aunque el usuario no haya abierto nunca los filtros.
 * Intentos: texto corregido → texto limpio → términos reconocidos → solo marca/modelo → texto literal.
 * Ej.: "espejos LIBERO 215" → "espejos libero" cuando "215" no existe en el catálogo.
 * Compartido por la barra de búsqueda y el bot.
 */
export async function searchInventoryRelaxed({ token, query, signal } = {}) {
  await getGeneralFilter({ token, signal }).catch(() => null)
  const { cleaned, attempts } = buildSearchAttempts(query)
  const plan = attempts.length ? attempts : ['']
  let last = null

  for (let index = 0; index < plan.length; index += 1) {
    if (signal?.aborted) break
    const result = await searchInventoryProducts({ token, search: plan[index], signal })
    last = { result, index }
    if (result.productos.length) {
      return { ...result, cleaned, attempts: plan, attemptIndex: index, relaxed: index > 0 }
    }
  }

  const fallback = last?.result ?? await searchInventoryProducts({ token, search: '', signal })
  return {
    ...fallback,
    cleaned,
    attempts: plan,
    attemptIndex: last?.index ?? 0,
    relaxed: false,
  }
}
