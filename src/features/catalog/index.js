export { ProductCard } from './components/ProductCard/ProductCard'
export { ProductDetailModal } from './components/ProductDetailModal/ProductDetailModal'
export { FilterDrawerContent } from './components/FilterDrawer/FilterDrawerContent'
export {
  getGeneral,
  getGeneralInitial,
  getGeneralFilter,
  searchInventoryProducts,
  getLatestInventoryProducts,
  PRODUCTS_PAGE_SIZE,
  extractProducts,
  extraerProductos,
  invalidateGeneralFilterCache,
} from './api/generalApi'
export { useStockWebSocket } from './ws/useStockWebSocket'
