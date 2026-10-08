/** El catálogo scrollea en `.landing__content`, no en window ni en la grilla. */
export function getLandingScrollRoot(node) {
  if (node && typeof node.closest === 'function') {
    const fromNode = node.closest('.landing__content')
    if (fromNode) return fromNode
  }
  if (typeof document === 'undefined') {
    return null
  }
  return document.querySelector('.landing__content')
}

export function scrollLandingToTop() {
  const root = getLandingScrollRoot()
  if (!root) {
    return
  }
  root.scrollTop = 0
}
