export function toMoneyNumber(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0
  }
  return numeric
}

export function wait(ms) {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function runWithConcurrency(items, concurrency, worker) {
  const list = Array.isArray(items) ? items : []
  const limit = Math.max(1, Number(concurrency) || 1)
  const results = new Array(list.length)
  let nextIndex = 0

  async function runWorker() {
    while (nextIndex < list.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await worker(list[current], current)
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, list.length || 1) },
    () => runWorker(),
  )
  await Promise.all(workers)
  return results
}
