/**
 * Extrae el PNG embebido más grande de un .ico (formato moderno).
 * @param {Uint8Array|ArrayBuffer} input
 * @returns {Uint8Array|null}
 */
export function extractPngFromIco(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  let best = null

  for (let i = 0; i < bytes.length - 8; i += 1) {
    let match = true
    for (let s = 0; s < sig.length; s += 1) {
      if (bytes[i + s] !== sig[s]) {
        match = false
        break
      }
    }
    if (!match) {
      continue
    }

    let end = -1
    for (let j = i + 8; j < bytes.length - 7; j += 1) {
      if (
        bytes[j] === 0x49
        && bytes[j + 1] === 0x45
        && bytes[j + 2] === 0x4e
        && bytes[j + 3] === 0x44
      ) {
        end = j + 8
        break
      }
    }
    if (end < 0) {
      continue
    }

    const chunk = bytes.subarray(i, end)
    if (!best || chunk.length > best.length) {
      best = chunk
    }
  }

  return best
}

async function bitmapToPdfImage(bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return null
  }

  ctx.drawImage(bitmap, 0, 0)
  const width = bitmap.width
  const height = bitmap.height
  bitmap.close()

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  }
}

/**
 * GCS no envía CORS al canvas; en el navegador pasamos por proxy Vite `/gcs-assets/...`.
 */
export function toPdfFetchableUrl(src) {
  if (!src || typeof src !== 'string') {
    return ''
  }

  const trimmed = src.trim()
  if (!trimmed) {
    return ''
  }

  if (typeof window === 'undefined') {
    return trimmed
  }

  const gcsPrefix = 'https://storage.googleapis.com/'
  if (trimmed.startsWith(gcsPrefix)) {
    return `/gcs-assets/${trimmed.slice(gcsPrefix.length)}`
  }

  return trimmed
}

/**
 * Carga una imagen (URL remota, proxy o asset Vite) como PNG data-URL para jsPDF.
 * @param {string} src
 * @returns {Promise<{ dataUrl: string, width: number, height: number } | null>}
 */
export async function loadPdfImageFromSrc(src) {
  const fetchUrl = toPdfFetchableUrl(src)
  if (!fetchUrl) {
    return null
  }

  try {
    const response = await fetch(fetchUrl)
    if (!response.ok) {
      return null
    }

    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    try {
      const bitmap = await createImageBitmap(new Blob([buffer]))
      return await bitmapToPdfImage(bitmap)
    } catch {
      const pngBytes = extractPngFromIco(bytes)
      if (!pngBytes) {
        return null
      }
      const bitmap = await createImageBitmap(new Blob([pngBytes], { type: 'image/png' }))
      return await bitmapToPdfImage(bitmap)
    }
  } catch {
    return null
  }
}

/**
 * @param {string[]} urls
 * @returns {Promise<Array<{ dataUrl: string, width: number, height: number }>>}
 */
export async function loadPdfImagesFromUrls(urls = []) {
  const results = []
  for (const url of urls) {
    // Secuencial: conserva el orden de marcas del filtro.
    // eslint-disable-next-line no-await-in-loop
    const image = await loadPdfImageFromSrc(url)
    if (image) {
      results.push(image)
    }
  }
  return results
}
