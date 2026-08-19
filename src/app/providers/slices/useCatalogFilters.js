import { useCallback, useMemo, useRef, useState } from 'react'

const EMPTY_FILTERS = { brands: [], categories: [], models: [] }
const DEFAULT_FILTER_MODES = { brands: 'all', categories: 'all', models: 'all' }

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
  const [filterModes, setFilterModes] = useState(DEFAULT_FILTER_MODES)
  const [draftFilterModes, setDraftFilterModes] = useState(DEFAULT_FILTER_MODES)
  const [draftFilterNuevos, setDraftFilterNuevos] = useState(false)
  const [draftFilterPromociones, setDraftFilterPromociones] = useState(false)
  const [draftWithStock, setDraftWithStock] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchProducts, setSearchProducts] = useState(null)
  const [latestProducts, setLatestProducts] = useState(null)

  const filtersRef = useRef(filters)
  const filterNuevosRef = useRef(filterNuevos)
  const filterPromocionesRef = useRef(filterPromociones)
  const withStockRef = useRef(withStock)
  const draftFiltersRef = useRef(draftFilters)
  const filterModesRef = useRef(filterModes)
  const draftFilterModesRef = useRef(draftFilterModes)
  const draftFilterNuevosRef = useRef(draftFilterNuevos)
  const draftFilterPromocionesRef = useRef(draftFilterPromociones)
  const draftWithStockRef = useRef(draftWithStock)

  filtersRef.current = filters
  filterNuevosRef.current = filterNuevos
  filterPromocionesRef.current = filterPromociones
  withStockRef.current = withStock
  draftFiltersRef.current = draftFilters
  filterModesRef.current = filterModes
  draftFilterModesRef.current = draftFilterModes
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
    setDraftFilterModes({ ...filterModesRef.current })
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
    setFilterModes({ ...draftFilterModesRef.current })
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
    setFilterModes(DEFAULT_FILTER_MODES)
    setDraftFilterModes(DEFAULT_FILTER_MODES)
    setDraftFilterNuevos(false)
    setDraftFilterPromociones(false)
    setDraftWithStock(false)
    setLatestProducts(null)
  }, [])

  const resetFiltersAndSearch = useCallback(() => {
    setFilters(EMPTY_FILTERS)
    setFilterModes(DEFAULT_FILTER_MODES)
    setDraftFilterModes(DEFAULT_FILTER_MODES)
    setFilterNuevos(false)
    setFilterPromociones(false)
    setWithStock(false)
    setSearchValue('')
    setSearchProducts(null)
    setLatestProducts(null)
  }, [])

  const hasAppliedFilters = useCallback(() => (
    (filterModesRef.current.brands === 'custom' && (filtersRef.current.brands?.length || 0) > 0)
    || (filterModesRef.current.categories === 'custom' && (filtersRef.current.categories?.length || 0) > 0)
    || (filterModesRef.current.models === 'custom' && (filtersRef.current.models?.length || 0) > 0)
    || filterModesRef.current.brands === 'none'
    || filterModesRef.current.categories === 'none'
    || filterModesRef.current.models === 'none'
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
    filterModes,
    setFilterModes,
    draftFilterModes,
    setDraftFilterModes,
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
    latestProducts,
    setLatestProducts,
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
    filterModes,
    draftFilterModes,
    draftFilterNuevos,
    draftFilterPromociones,
    draftWithStock,
    searchValue,
    searchProducts,
    latestProducts,
    syncFilterDraftFromApplied,
    commitFilterDraft,
    clearFilters,
    resetFiltersAndSearch,
    hasAppliedFilters,
  ])
}
