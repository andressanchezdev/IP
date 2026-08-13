/** Lee un File como data URL para persistir comprobantes en el pedido local. */
export function readFileAsDataUrl(file) {
  if (!file) {
    return Promise.resolve(null)
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}
