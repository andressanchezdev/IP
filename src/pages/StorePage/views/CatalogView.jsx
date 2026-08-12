import { useEffect, useRef } from 'react'
import { useCatalog } from '@/app/providers'
import { ProductCard } from '@/features/catalog/components/ProductCard/ProductCard'
import './CatalogView.css'

function getLandingScrollRoot(node) {
  if (!node || typeof node.closest !== 'function') {
    return null
  }
  return node.closest('.landing__content')
}

export function CatalogView({ products, cartProductIds, onOrder }) {
  const {
    hasMoreProducts,
    isLoadingProducts,
    loadMoreProducts,
    isCatalogSearchActive,
    isCatalogFilterActive,
  } = useCatalog()
  const sentinelRef = useRef(null)
  const requestLockRef = useRef(false)

  // Search or applied filters: no scroll pagination (avoids request storms on short lists).
  const canPaginateOnScroll =
    hasMoreProducts && !isCatalogSearchActive && !isCatalogFilterActive

  useEffect(() => {
    if (!canPaginateOnScroll) {
      return undefined
    }

    const sentinel = sentinelRef.current
    if (!sentinel) {
      return undefined
    }

    const scrollRoot = getLandingScrollRoot(sentinel)

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (!isVisible || requestLockRef.current || isLoadingProducts) {
          return
        }

        requestLockRef.current = true
        Promise.resolve(loadMoreProducts()).finally(() => {
          requestLockRef.current = false
        })
      },
      {
        root: scrollRoot,
        rootMargin: '160px 0px',
        threshold: 0,
      },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [canPaginateOnScroll, isLoadingProducts, loadMoreProducts, products.length])

  if (products.length === 0 && isLoadingProducts && !isCatalogSearchActive) {
    return (
      <section className="landing__panel">
        <div className="landing__empty-state">Cargando productos…</div>
      </section>
    )
  }

  if (products.length === 0) {
    return (
      <section className="landing__panel">
        <div className="landing__empty-state">No se encontraron productos con esos filtros.</div>
      </section>
    )
  }

  return (
    <section className="landing__panel">
      <div className="landing__grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            isInCart={cartProductIds.has(product.id)}
            onOrder={onOrder}
          />
        ))}
      </div>

      {isCatalogSearchActive ? (
        <p className="catalog-scroll-sentinel__done">
          {products.length} resultado{products.length === 1 ? '' : 's'} de búsqueda
        </p>
      ) : isCatalogFilterActive ? (
        <p className="catalog-scroll-sentinel__done">
          Mostrando {products.length} producto{products.length === 1 ? '' : 's'} filtrado
          {products.length === 1 ? '' : 's'}
        </p>
      ) : canPaginateOnScroll ? (
        <div className="catalog-scroll-sentinel" ref={sentinelRef} aria-hidden="true">
          {isLoadingProducts ? (
            <span className="catalog-scroll-sentinel__label">Cargando más productos…</span>
          ) : (
            <span className="catalog-scroll-sentinel__label">Desplázate para cargar más</span>
          )}
        </div>
      ) : (
        <p className="catalog-scroll-sentinel__done">
          Mostrando {products.length} producto{products.length === 1 ? '' : 's'}
        </p>
      )}
    </section>
  )
}
