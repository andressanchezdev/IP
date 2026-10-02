import test from 'node:test'
import assert from 'node:assert/strict'

import { collectCartPages } from '../src/features/cart/api/cartPagination.js'

test('collectCartPages loads all pages up to 600 rows', async () => {
  let calls = 0
  const result = await collectCartPages(async ({ lastId, limit }) => {
    calls += 1
    const pageNumber = lastId == null ? 0 : Number(lastId)
    const start = pageNumber * 50
    const rows = Array.from({ length: limit }, (_, index) => ({
      id_carrito: start + index + 1,
      id_producto: start + index + 1,
    }))
    return {
      carritos: rows,
      hasMore: start + rows.length < 600,
      nextCursor: pageNumber + 1,
    }
  }, { pageSize: 50, maxItems: 600 })

  assert.equal(result.carritos.length, 600)
  assert.equal(result.pages, 12)
  assert.equal(result.complete, true)
  assert.equal(calls, 12)
})

test('collectCartPages infers the final page when pagination metadata is absent', async () => {
  const result = await collectCartPages(async ({ lastId, limit }) => {
    const rows = lastId == null
      ? Array.from({ length: limit }, (_, index) => ({ id_carrito: index + 1 }))
      : [{ id_carrito: 51 }]
    return { carritos: rows }
  }, { pageSize: 50, maxItems: 600 })

  assert.equal(result.carritos.length, 51)
  assert.equal(result.complete, true)
  assert.equal(result.pages, 2)
})

test('collectCartPages stops safely when the endpoint repeats a cursor', async () => {
  const result = await collectCartPages(async () => ({
    carritos: [{ id_carrito: 1 }],
    hasMore: true,
    nextCursor: 1,
  }), { pageSize: 1, maxItems: 10 })

  assert.equal(result.pages, 2)
  assert.equal(result.complete, false)
})