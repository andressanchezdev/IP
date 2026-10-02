export async function collectCartPages(
  fetchPage,
  { pageSize = 50, maxItems = 600 } = {},
) {
  const safePageSize = Math.max(1, Math.floor(Number(pageSize) || 50))
  const safeMaxItems = Math.max(1, Math.floor(Number(maxItems) || 600))
  const maxPages = Math.ceil(safeMaxItems / safePageSize) + 1
  const carritos = []
  const seenRows = new Set()
  const seenCursors = new Set()
  let lastId = null
  let hasMore = false
  let complete = true
  let pages = 0

  while (carritos.length < safeMaxItems && pages < maxPages) {
    const requestLimit = Math.min(safePageSize, safeMaxItems - carritos.length)
    const page = await fetchPage({ lastId, limit: requestLimit })
    const rows = Array.isArray(page?.carritos) ? page.carritos : []
    pages += 1

    if (rows.length === 0) {
      hasMore = false
      break
    }

    rows.forEach((row) => {
      const rowId = row?.id_carrito != null
        ? `cart:${String(row.id_carrito)}`
        : row?.id_producto != null
          ? `product:${String(row.id_producto)}`
          : null
      if (rowId && seenRows.has(rowId)) return
      if (rowId) seenRows.add(rowId)
      if (carritos.length < safeMaxItems) carritos.push(row)
    })

    hasMore = typeof page.hasMore === 'boolean'
      ? page.hasMore
      : rows.length >= requestLimit

    if (!hasMore) break

    const cursor = page.nextCursor ?? rows.at(-1)?.id_carrito
    if (cursor == null || seenCursors.has(String(cursor))) {
      complete = false
      break
    }

    seenCursors.add(String(cursor))
    lastId = cursor
  }

  if (hasMore && carritos.length >= safeMaxItems) {
    complete = false
  }
  if (hasMore && pages >= maxPages) {
    complete = false
  }

  return {
    carritos,
    pages,
    hasMore,
    complete,
  }
}