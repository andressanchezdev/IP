import { useCallback, useMemo, useRef, useState } from 'react'

const EMPTY_FILTERS = { brands: [], categories: [], models: [] }

/**
 * Estado de filtros y búsqueda del catálogo.
 * Draft = edición dentro del drawer Filtrar; se aplica solo con "Aplicar filtro".
 */
export function useCatalogFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterNuevos, setFilterNuevos] = useState(false)
  const [filterPromociones, setFilterPromociones] = useState(false)
  const [withStock, setWithStock] = useState(false)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [draftFilterNuevos, setDraftFilterNuevos] = useState(false)
  const [draftFilterPromociones, setDraftFilterPromociones] = useState(false)
  const [draftWithStock, setDraftWithStock] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchProducts, setSearchProducts] = useState(null)

  const filtersRef = useRef(filters)
  const filterNuevosRef = useRef(filterNuevos)
  const filterPromocionesRef = useRef(filterPromociones)
  const withStockRef = useRef(withStock)
  const draftFiltersRef = useRef(draftFilters)
  const draftFilterNuevosRef = useRef(draftFilterNuevos)
  const draftFilterPromocionesRef = useRef(draftFilterPromociones)
  const draftWithStockRef = useRef(draftWithStock)

  filtersRef.current = filters
  filterNuevosRef.current = filterNuevos
  filterPromocionesRef.current = filterPromociones
  withStockRef.current = withStock
  draftFiltersRef.current = draftFilters
  draftFilterNuevosRef.current = draftFilterNuevos
  draftFilterPromocionesRef.current = draftFilterPromociones
  draftWithStockRef.current = draftWithStock

  const syncFilterDraftFromApplied = useCallback(() => {
    const current = filtersRef.current
    setDraftFilters({
      brands: [...(current.brands || [])],
      categories: [...(current.categories || [])],
      models: [...(current.models || [])],
    })
    setDraftFilterNuevos(filterNuevosRef.current)
    setDraftFilterPromociones(filterPromocionesRef.current)
    setDraftWithStock(withStockRef.current)
  }, [])

  const commitFilterDraft = useCallback(() => {
    const draft = draftFiltersRef.current
    setFilters({
      brands: [...(draft.brands || [])],
      categories: [...(draft.categories || [])],
      models: [...(draft.models || [])],
    })
    setFilterNuevos(draftFilterNuevosRef.current)
    setFilterPromociones(draftFilterPromocionesRef.current)
    setWithStock(draftWithStockRef.current)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setDraftFilters(EMPTY_FILTERS)
    setDraftFilterNuevos(false)
    setDraftFilterPromociones(false)
    setDraftWithStock(false)
  }, [])

  const resetFiltersAndSearch = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setSearchValue('')
    setSearchProducts(null)
  }, [])

  const hasAppliedFilters = useCallback(() => (
    (filtersRef.current.brands?.length || 0) > 0
    || (filtersRef.current.categories?.length || 0) > 0
    || (filtersRef.current.models?.length || 0) > 0
    || filterNuevosRef.current
    || filterPromocionesRef.current
    || withStockRef.current
  ), [])

  return useMemo(() => ({
    filters,
    setFilters,
    filterNuevos,
    setFilterNuevos,
    filterPromociones,
    setFilterPromociones,
    withStock,
    setWithStock,
    draftFilters,
    setDraftFilters,
    draftFilterNuevos,
    setDraftFilterNuevos,
    draftFilterPromociones,
    setDraftFilterPromociones,
    draftWithStock,
    setDraftWithStock,
    searchValue,
    setSearchValue,
    searchProducts,
    setSearchProducts,
    syncFilterDraftFromApplied,
    commitFilterDraft,
    clearFilters,
    resetFiltersAndSearch,
    hasAppliedFilters,
  }), [
    filters,
    filterNuevos,
    filterPromociones,
    withStock,
    draftFilters,
    draftFilterNuevos,
    draftFilterPromociones,
    draftWithStock,
    searchValue,
    searchProducts,
    syncFilterDraftFromApplied,
    commitFilterDraft,
    clearFilters,
    resetFiltersAndSearch,
    hasAppliedFilters,
  ])
}
